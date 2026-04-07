const admin = require("firebase-admin");
const RSSParser = require("rss-parser");
const dotenv = require("dotenv");
const { summarizeArticle } = require("./lib/ai-service");

dotenv.config();

const parser = new RSSParser({
  timeout: 5000,
});

// ─── Firebase Auth Initialization ───────────────────────────────────────────
if (!admin.apps.length) {
  const serviceAccountRaw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!serviceAccountRaw) {
    console.error("❌ [Critical] Missing FIREBASE_SERVICE_ACCOUNT_KEY env variable.");
    process.exit(1);
  }
  
  try {
    const serviceAccount = JSON.parse(serviceAccountRaw);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log("🔐 [Auth] Initialized Firebase Admin via GitHub Secrets");
  } catch (err) {
    console.error("❌ [Critical] Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY JSON.", err.message);
    process.exit(1);
  }
}

const db = admin.firestore();
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// ─── Constants & RSS Map ───────────────────────────────────────────────────
// Optimized subset of standard RSS feeds to keep execution quick
const CATEGORY_FEEDS = {
  'WORLD': [
      {'name': 'Reuters World', 'url': 'https://news.google.com/rss/search?q=when:24h+allinurl:reuters.com&hl=en-US&gl=US&ceid=US:en'},
      {'name': 'BBC News', 'url': 'http://feeds.bbci.co.uk/news/world/rss.xml'},
      {'name': 'Globalnews', 'url': 'https://www.globalnews.ca/world/feed/'}
  ],
  'INDIA': [
      {'name': 'Times of India', 'url': 'https://timesofindia.indiatimes.com/rssfeedstopstories.cms'},
      {'name': 'The Hindu', 'url': 'https://www.thehindu.com/news/national/feeder/default.rss'},
      {'name': 'NDTV', 'url': 'https://feeds.feedburner.com/ndtvnews-top-stories'}
  ],
  'TECH': [
      {'name': 'TechCrunch', 'url': 'https://techcrunch.com/feed/'},
      {'name': 'The Verge', 'url': 'https://www.theverge.com/rss/index.xml'}
  ],
  'BUSINESS': [
      {'name': 'MarketWatch', 'url': 'https://www.marketwatch.com/rss/topstories'},
      {'name': 'CNBC', 'url': 'https://www.cnbc.com/id/10001147/device/rss/rss.html'}
  ]
};

function normalizeUrl(url) {
  try {
    let u = url.toLowerCase().trim();
    u = u.replace(/^(https?:\/\/)?(www\.)?/, "");
    u = u.replace(/\/$/, "");
    u = u.split("?")[0];
    return u;
  } catch (e) {
    return url;
  }
}

function articleToDocId(url) {
  const normalized = normalizeUrl(url);
  return Buffer.from(normalized).toString("base64").replace(/[\/+=]/g, "").slice(0, 50);
}

// ─── Core Rotation Logic ─────────────────────────────────────────────────────
async function processCategory(catName, feeds) {
  console.log(`\n⏳ [Process] Fetching category: ${catName}`);
  let candidateItems = [];

  // Parallel fetch 
  const fetchPromises = feeds.map(async (f) => {
    try {
      const feed = await parser.parseURL(f.url);
      if (feed.items && feed.items.length > 0) {
        // Collect up to top 3 from each
        for (let i = 0; i < Math.min(3, feed.items.length); i++) {
          const item = feed.items[i];
          candidateItems.push({
            ...item,
            sourceName: f.name,
            sourceUrl: f.url,
            // Ensure pubTime is numeric
            pubTime: item.pubDate ? new Date(item.pubDate).getTime() : Date.now()
          });
        }
      }
    } catch (err) {
      console.warn(`  ⚠️ Failed to fetch ${f.name} => ${err.message}`);
    }
  });

  await Promise.allSettled(fetchPromises);
  
  // Sort by newest first
  candidateItems.sort((a, b) => b.pubTime - a.pubTime);

  let selectedItem = null;
  let docId = null;

  // Find the exact 1 newest that we don't already have
  for (const item of candidateItems) {
    const dId = articleToDocId(item.link);
    try {
      const existing = await db.collection("news").doc(dId).get();
      if (!existing.exists) {
        selectedItem = item;
        docId = dId;
        break;
      }
    } catch (err) {
      console.error(`  ❌ [Error] Failed to check existence of doc ${dId}: ${err.message}`);
    }
  }

  if (!selectedItem) {
    console.log(`  ⏩ No new articles found for ${catName}. Skipping.`);
    return;
  }

  try {
    console.log(`  🤖 [AI] Summarizing: ${selectedItem.title.slice(0, 50)}...`);
    const summary = await summarizeArticle(
      selectedItem.title, 
      selectedItem.contentSnippet || selectedItem.content || ""
    ).catch(err => {
      console.error(`  ❌ [AI] Summarization failed: ${err.message}`);
      throw err;
    });
    
    // 1. ADD (1-in)
    const now = admin.firestore.Timestamp.now();
    console.log(`  💾 [Firestore] Writing article to 'news/${docId}'...`);
    await db.collection("news").doc(docId).set({
      title: selectedItem.title,
      summary,
      imageUrl: `https://picsum.photos/seed/${docId}/800/1400`,
      category: catName,
      sourceUrl: selectedItem.link,
      source: { name: selectedItem.sourceName, url: selectedItem.sourceUrl },
      timestamp: admin.firestore.Timestamp.fromDate(new Date(selectedItem.pubTime)),
      createdAt: now,
      publishedAt: now 
    }).catch(err => {
      console.error(`  ❌ [Firestore] Write failed for 'news/${docId}': ${err.message}`);
      if (err.code) console.error(`     Error Code: ${err.code}`);
      throw err;
    });

    console.log(`  ✅ [Success] Inserted ${catName} news.`);

    // 2. DELETE (1-out)
    console.log(`  🧹 [Cleanup] Finding oldest article for ${catName} to maintain rotation...`);
    const snapshot = await db.collection("news")
      .where("category", "==", catName)
      .orderBy("publishedAt", "asc")
      .limit(1)
      .get()
      .catch(err => {
        console.error(`  ❌ [Firestore] Cleanup query failed: ${err.message}`);
        return { empty: true }; // Don't throw just for cleanup
      });
      
    if (!snapshot.empty) {
      const oldDocId = snapshot.docs[0].id;
      await snapshot.docs[0].ref.delete().then(() => {
        console.log(`  🧹 [Success] Deleted oldest article (${oldDocId}) for ${catName}.`);
      }).catch(err => {
        console.error(`  ❌ [Firestore] Deletion failed for ${oldDocId}: ${err.message}`);
      });
    } else {
      console.log(`  ℹ️ No oldest article to delete for ${catName} (collection empty).`);
    }
  } catch (err) {
    console.error(`  💥 [Process Error] Category ${catName} failed: ${err.message}`);
  }
}

// ─── Execution Phases ────────────────────────────────────────────────────────
async function run() {
  const t0 = Date.now();
  console.log(`🚀 Starting Pulse Update...`);

  // Phase 1 (Priority): WORLD
  await processCategory("WORLD", CATEGORY_FEEDS["WORLD"]);

  // Phase 2 (Delay): 40 seconds
  console.log(`\n⏱️ Phase 2: Sleeping for 40 seconds to span Github Action minute layout and pace APIs...`);
  await sleep(40000);

  // Phase 3 (Priority): INDIA
  await processCategory("INDIA", CATEGORY_FEEDS["INDIA"]);

  // Phase 4 (General): Check current minutes logic
  const min = new Date().getMinutes();
  console.log(`\n⏳ Phase 4: Validating generalized cycle. Current Minute: ${min}`);
  
  if (min < 15) { 
    // Triggered around top of the hour
    await processCategory("BUSINESS", CATEGORY_FEEDS["BUSINESS"]);
  } else if (min >= 30 && min < 45) { 
    // Triggered around the half hour
    await processCategory("TECH", CATEGORY_FEEDS["TECH"]);
  }

  const duration = (Date.now() - t0) / 1000;
  console.log(`\n🏁 Pulse update complete in ${duration.toFixed(2)} seconds.`);
  process.exit(0);
}

run();
