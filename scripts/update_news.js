const admin = require("firebase-admin");
const RSSParser = require("rss-parser");
const dotenv = require("dotenv");
const { summarizeArticle } = require("./lib/ai-service");

dotenv.config();

// ─── Human-Mimic RSS Configuration ──────────────────────────────────────────
const parser = new RSSParser({
  timeout: 10000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
    'Accept': 'application/rss+xml, application/xml;q=0.9, */*;q=0.8'
  },
});

// ─── Firebase Auth Initialization ───────────────────────────────────────────
if (!admin.apps.length) {
  let serviceAccountRaw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!serviceAccountRaw) {
    console.error("❌ [Critical] Missing FIREBASE_SERVICE_ACCOUNT_KEY env variable.");
    process.exit(1);
  }
  
  try {
    // ─── Resilient Parsing ───
    // 1. Try direct parse
    let serviceAccount;
    try {
      serviceAccount = JSON.parse(serviceAccountRaw);
    } catch (e) {
      // 2. If it fails, maybe it's base64 encoded? (Common for robust secrets)
      try {
        const decoded = Buffer.from(serviceAccountRaw, 'base64').toString('utf8');
        serviceAccount = JSON.parse(decoded);
        console.log("🔓 [Auth] Detected Base64 encoded service account");
      } catch (e2) {
        // 3. Last ditch effort: it might be a multiline string from a shell that accidentally 
        // included literal newlines. Try to replace them, but this is risky.
        // Actually, just throw the original error for debugging.
        throw e;
      }
    }

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log("🔐 [Auth] Initialized Firebase Admin successfully");
  } catch (err) {
    console.error("❌ [Critical] Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY JSON.");
    console.error("Error Message:", err.message);
    console.error("Raw String Prefix:", serviceAccountRaw.substring(0, 50) + "...");
    console.error("Raw String Suffix:", "..." + serviceAccountRaw.substring(serviceAccountRaw.length - 50));
    console.error("Raw String Length:", serviceAccountRaw.length);
    process.exit(1);
  }
}

const db = admin.firestore();
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// ─── Constants & RSS Map (10 Categories) ────────────────────────────────────
const CATEGORY_FEEDS = {
  'BREAKING': [
    {'name': 'Google News Top', 'url': 'https://news.google.com/rss?hl=en-US&gl=US&ceid=US:en'}
  ],
  'WORLD': [
    {'name': 'Reuters World', 'url': 'https://news.google.com/rss/search?q=when:24h+allinurl:reuters.com&hl=en-US&gl=US&ceid=US:en'},
    {'name': 'BBC World', 'url': 'http://feeds.bbci.co.uk/news/world/rss.xml'}
  ],
  'INDIA': [
    {'name': 'Times of India', 'url': 'https://timesofindia.indiatimes.com/rssfeedstopstories.cms'},
    {'name': 'The Hindu', 'url': 'https://www.thehindu.com/news/national/feeder/default.rss'}
  ],
  'TECH': [
    {'name': 'TechCrunch', 'url': 'https://techcrunch.com/feed/'},
    {'name': 'The Verge', 'url': 'https://www.theverge.com/rss/index.xml'}
  ],
  'AI': [
    {'name': 'Google AI News', 'url': 'https://news.google.com/rss/search?q=Artificial+Intelligence+when:24h&hl=en-US&gl=US&ceid=US:en'}
  ],
  'BUSINESS': [
    {'name': 'MarketWatch', 'url': 'https://www.marketwatch.com/rss/topstories'},
    {'name': 'CNBC', 'url': 'https://www.cnbc.com/id/10001147/device/rss/rss.html'}
  ],
  'SCIENCE': [
    {'name': 'Phys.org', 'url': 'https://phys.org/rss-feed/'},
    {'name': 'Science Daily', 'url': 'https://www.sciencedaily.com/rss/all.xml'}
  ],
  'SPORTS': [
    {'name': 'ESPN', 'url': 'https://www.espn.com/espn/rss/news'}
  ],
  'ENTERTAINMENT': [
    {'name': 'Variety', 'url': 'https://variety.com/feed/'},
    {'name': 'Hollywood Reporter', 'url': 'https://www.hollywoodreporter.com/feed/'}
  ],
  'GAMING': [
    {'name': 'Kotaku', 'url': 'https://kotaku.com/rss'}
  ],
  'PROGRAMMING': [
    {'name': 'Dev.to', 'url': 'https://dev.to/feed'},
    {'name': 'StackOverflow', 'url': 'https://stackoverflow.blog/feed/'}
  ],
  'EDUCATION': [
    {'name': 'Open Culture', 'url': 'https://www.openculture.com/feed'}
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

const MAX_HISTORY = 20;
const MAX_PER_RUN = 1;

// ─── Firestore Category Precision ──────────────────────────────────────────
async function updateCategoryMetadata(catName, articleTitle) {
  const now = admin.firestore.Timestamp.now();
  
  // 1. Update Category-Specific Heartbeat
  await db.collection("_metadata").doc("categories").collection("list").doc(catName.toUpperCase()).set({
    last_freshened: now,
    last_article_title: articleTitle
  }, { merge: true });

  // 2. Update Global sync_status (legacy compatibility for Flutter app)
  await db.collection("_metadata").doc("sync_status").set({
    last_sync: now,
    last_category: catName,
    last_title: articleTitle
  }, { merge: true });
}

// ─── Core Rotation Logic ─────────────────────────────────────────────────────
async function processCategory(catName, feeds) {
  console.log(`\n⏳ [Process] Fetching category: ${catName}`);
  let candidateItems = [];

  for (const f of feeds) {
    try {
      console.log("Fetching RSS from:", f.url);
      const feed = await parser.parseURL(f.url);
      if (feed.items && feed.items.length > 0) {
        for (let i = 0; i < Math.min(5, feed.items.length); i++) {
          const item = feed.items[i];
          candidateItems.push({
            ...item,
            sourceName: f.name,
            sourceUrl: f.url,
            pubTime: item.pubDate ? new Date(item.pubDate).getTime() : Date.now()
          });
        }
      }
    } catch (err) {
      console.error(`❌ [RSS Error] Failed to fetch ${f.name} from ${f.url} =>`, err);
    }
  }
  
  candidateItems.sort((a, b) => b.pubTime - a.pubTime);

  if (candidateItems.length === 0) {
    console.log(`  ⏩ No articles found for ${catName}.`);
    return;
  }

  const itemsToProcess = candidateItems.slice(0, MAX_PER_RUN);
  console.log(`  🛒 [Selected] Single-article mode: ${itemsToProcess[0].title.slice(0, 50)}...`);

  let addedCount = 0;
  const batch = db.batch();

  for (const item of itemsToProcess) {
    const docId = articleToDocId(item.link);
    
    // Check for duplicates to save AI costs
    const existing = await db.collection("news").doc(docId).get();
    if (existing.exists) {
      console.log(`  ⏩ [Skip] Already in database: ${item.title.slice(0, 30)}...`);
      continue;
    }

    try {
      // Safety Delay before AI call (Rate Limit respect)
      console.log(`  💤 [Safety] Short delay for AI...`);
      await sleep(2000);

      console.log(`  🤖 [AI] Summarizing: ${item.title.slice(0, 50)}...`);
      const summary = await summarizeArticle(
        item.title, 
        item.contentSnippet || item.content || ""
      );
      
      const now = admin.firestore.Timestamp.now();
      const newDocRef = db.collection("news").doc(docId);
      
      batch.set(newDocRef, {
        title: item.title,
        summary,
        imageUrl: `https://picsum.photos/seed/${docId}/800/1400`,
        category: catName,
        sourceUrl: item.link,
        source: { name: item.sourceName, url: item.sourceUrl },
        timestamp: admin.firestore.Timestamp.fromDate(new Date(item.pubTime)),
        createdAt: now,
        publishedAt: now 
      });

      addedCount++;
    } catch (err) {
      console.error(`  ⚠️ [AI Error] Failed for item: ${item.title.slice(0, 30)} => ${err.message}`);
    }
  }

  if (addedCount === 0) {
    console.log(`  😴 No new articles to add for ${catName}.`);
    return;
  }

  try {
    // ─── FIFO Pruning ────────────────────────────────────────────────────────
    const categoryDocs = await db.collection("news")
      .where("category", "==", catName)
      .orderBy("timestamp", "desc")
      .get();
    
    // Total including what's already there (minus what we are about to add/overwrite)
    // Wait, the batch.set might overwrite existing ones if we didn't check existing, 
    // but we did check. So total will be current + addedCount.
    if (categoryDocs.size + addedCount > MAX_HISTORY) {
      const surplus = (categoryDocs.size + addedCount) - MAX_HISTORY;
      const toDelete = categoryDocs.docs.slice(categoryDocs.docs.length - surplus);
      toDelete.forEach(doc => batch.delete(doc.ref));
      console.log(`  🗑️ [FIFO] Pruning ${toDelete.length} oldest articles for ${catName}.`);
    }

    await batch.commit();

    // ─── Firestore Precision Heartbeat ───────────────────────────────────────
    await updateCategoryMetadata(catName, itemsToProcess[0].title);

    console.log(`  ✅ [Success] Updated ${catName} news (+${addedCount}). Metadata triggered.`);

  } catch (err) {
    console.error(`  💥 [Process Error] Category ${catName} failed: ${err.message}`);
  }
}

// ─── Execution ───────────────────────────────────────────────────────────────
async function run() {
  console.log(`💤 [Warm-up] Initiating 2-second anti-bot delay...`);
  await sleep(2000);

  const t0 = Date.now();
  
  // Logic: Robust minute-based rotation (0-59 minutes / 3 = 0-19 buckets)
  const minutes = new Date().getMinutes();
  const allCategoryNames = Object.keys(CATEGORY_FEEDS).sort();
  
  // Calculate index: 0-19 modulo category count (12)
  const targetIndex = Math.floor(minutes / 3) % allCategoryNames.length;
  const targetCategory = allCategoryNames[targetIndex];

  console.log("Selected Category Index:", targetIndex);
  console.log(`🚀 Starting Pulse Update (Minute-Based Rotation)`);
  console.log(`📍 Time: ${new Date().toLocaleTimeString()} | Minute: ${minutes}`);
  console.log(`📍 Target Category: ${targetCategory} (Index: ${targetIndex} of ${allCategoryNames.length})`);

  await processCategory(targetCategory, CATEGORY_FEEDS[targetCategory]);

  const duration = (Date.now() - t0) / 1000;
  console.log(`\n🏁 Pulse update complete in ${duration.toFixed(2)} seconds.`);
  process.exit(0);
}

run();
