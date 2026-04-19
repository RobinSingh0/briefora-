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
    'Accept': 'application/rss+xml, application/xml;q=0.9, image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
    'Accept-Language': 'en-US,en;q=0.9',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Sec-Fetch-User': '?1',
    'Upgrade-Insecure-Requests': '1'
  },
  // Extract media fields so we can get real article images
  customFields: {
    item: [
      ['media:content', 'media:content'],
      ['media:thumbnail', 'media:thumbnail'],
      ['media:group', 'media:group'],
    ]
  }
});


// ─── Firebase Auth Initialization ───────────────────────────────────────────
if (!admin.apps.length) {
  let serviceAccountRaw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!serviceAccountRaw) {
    console.warn("⚠️ [Warning] FIREBASE_SERVICE_ACCOUNT_KEY is missing. Attempting to use default credentials...");
    // If we have a project ID, maybe we can use ADC
    if (!process.env.FIREBASE_PROJECT_ID) {
        console.error("❌ [Critical] Both FIREBASE_SERVICE_ACCOUNT_KEY and FIREBASE_PROJECT_ID are missing. Cannot continue.");
        process.exit(1);
    }
  }
  
  try {
    // ─── Resilient Parsing ───
    serviceAccountRaw = serviceAccountRaw.trim();
    let serviceAccount;
    
    // Helper to parse JSON that might have unescaped control characters (common mangling)
    const superParse = (str, label) => {
      try { return JSON.parse(str); }
      catch (e) {
        // Extract position from error message "at position 1850"
        const posMatch = e.message.match(/position (\d+)/);
        if (posMatch) {
          const pos = parseInt(posMatch[1], 10);
          console.error(`📍 [${label}] Error at position ${pos}. Context:`);
          console.error(`"..." ${JSON.stringify(str.substring(Math.max(0, pos - 20), pos + 20))} "..."`);
          // Specifically check for control chars at that position
          const code = str.charCodeAt(pos);
          console.error(`Character code at ${pos}: ${code} (0x${code.toString(16)})`);
        }
        
        // Final attempt: aggressive escaping of all control codes except space/tabs/newlines between tokens
        // But for private keys, it's usually just literal newlines that break it.
        try {
          const fixed = str.replace(/[^\x20-\x7E]/g, (c) => {
            if (c === '\n') return '\\n';
            if (c === '\r') return '\\r';
            if (c === '\t') return '\\t';
            return c;
          });
          return JSON.parse(fixed);
        } catch (eFinal) {
          throw e; // Throw original error to avoid confusing 'fixed' errors
        }
      }
    };

    try {
      // 1. Try direct parse
      serviceAccount = superParse(serviceAccountRaw, "Raw");
    } catch (e) {
      const originalError = e;
      // 2. If it fails, maybe it's base64 encoded?
      try {
        // Critical: Strip any hidden terminal garbage / non-base64 characters
        const cleaned = serviceAccountRaw.replace(/[^A-Za-z0-9+/=]/g, '');
        const decoded = Buffer.from(cleaned, 'base64').toString('utf8').trim();
        serviceAccount = superParse(decoded, "Decoded");
        console.log("🔓 [Auth] Successfully decoded and parsed Base64 service account");
      } catch (e2) {
        // Detailed failure logging
        console.error("❌ [Auth] Parsing failed for both Raw and Base64 paths.");
        console.error("Original Error:", originalError.message);
        console.error("Decode/Second Parse Error:", e2.message);
        
        // Debugging info
        console.error("Raw Length:", serviceAccountRaw.length);
        if (serviceAccountRaw.length > 0) {
           console.error("Raw Start:", serviceAccountRaw.substring(0, 30) + "...");
        }
        process.exit(1);
      }
    }

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log("🔐 [Auth] Initialized Firebase Admin successfully");
  } catch (err) {
    console.error("❌ [Critical] Unexpected error during Firebase initialization:", err.message);
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
  ],
  'LIFESTYLE': [
    { name: 'Fit Foodie Finds', url: 'https://fitfoodiefinds.com/feed/' },
    { name: 'MyFitnessPal', url: 'https://blog.myfitnesspal.com/feed/' },
    { name: 'Tiny Buddha', url: 'https://tinybuddha.com/feed/' },
    { name: 'Eat This, Not That', url: 'https://www.eatthis.com/feed/' },
    { name: 'Patient.info', url: 'https://patient.info/rss' }
  ],
  'ENVIRONMENT': [
    { name: 'Guardian Environment', url: 'https://www.theguardian.com/uk/environment/rss' },
    { name: 'Inside Climate News', url: 'https://insideclimatenews.org/feed/' },
    { name: 'Carbon Brief', url: 'https://www.carbonbrief.org/feed/' },
    { name: 'Mongabay', url: 'https://news.mongabay.com/feed/' }
  ]
};

// Explicit order for the 12-category rotation
const CATEGORIES = [
  'BREAKING', 'WORLD', 'TECH', 'AI', 'BUSINESS', 
  'SCIENCE', 'SPORTS', 'ENTERTAINMENT', 'GAMING', 'PROGRAMMING', 'EDUCATION',
  'LIFESTYLE', 'ENVIRONMENT'
];

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
const MAX_PER_RUN = 3; // Process up to 3 fresh articles per run

// Extract the best available image URL from an RSS item
function extractImageUrl(item, fallbackSeed) {
  // 1. RSS enclosure (most common for news feeds)
  if (item.enclosure && item.enclosure.url && /\.(jpe?g|png|webp|gif)/i.test(item.enclosure.url)) {
    return item.enclosure.url;
  }
  // 2. media:content
  const mediaContent = item['media:content'];
  if (mediaContent && mediaContent.$ && mediaContent.$.url) return mediaContent.$.url;
  // 3. media:thumbnail
  const mediaThumbnail = item['media:thumbnail'];
  if (mediaThumbnail && mediaThumbnail.$ && mediaThumbnail.$.url) return mediaThumbnail.$.url;
  if (typeof mediaThumbnail === 'string' && mediaThumbnail.startsWith('http')) return mediaThumbnail;
  // 4. Grab first <img> from HTML content
  const htmlContent = item.content || item.summary || item['content:encoded'] || '';
  const imgMatch = htmlContent.match(/<img[^>]+src=["']([^"']+)["']/i);
  if (imgMatch && imgMatch[1] && imgMatch[1].startsWith('http')) return imgMatch[1];
  // 5. Fallback to Picsum placeholder
  return `https://picsum.photos/seed/${fallbackSeed}/800/1400`;
}

// ─── Firestore Category Precision ──────────────────────────────────────────
async function updateCategoryMetadata(catName, articleTitle) {
  const serverTime = admin.firestore.FieldValue.serverTimestamp();
  
  // 1. Update Category-Specific Heartbeat
  await db.collection("_metadata").doc("categories").collection("list").doc(catName.toUpperCase()).set({
    last_freshened: serverTime,
    last_article_title: articleTitle
  }, { merge: true });

  // 2. Update Global sync_status (legacy compatibility for Flutter app)
  await db.collection("_metadata").doc("sync_status").set({
    last_sync: serverTime,
    last_category: catName.toLowerCase(),
    last_title: articleTitle,
    global_force_refresh: Date.now() // Flag for app to refresh Breaking tab
  }, { merge: true });
}

// ─── Core Rotation Logic ─────────────────────────────────────────────────────
async function processCategory(catName, feeds) {
  console.log(`\n⏳ [Process] Fetching category: ${catName}`);
  let candidateItems = [];

  for (const f of feeds) {
    try {
      console.log(`📡 Fetching RSS from: ${f.name} (${f.url})`);
      const feed = await parser.parseURL(f.url);
      console.log(`✅ Received ${feed.items?.length || 0} items from ${f.name}`);
      if (feed.items && feed.items.length > 0) {
        // Increase scan depth to top 10 articles to find unseen ones
        for (let i = 0; i < Math.min(10, feed.items.length); i++) {
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
  console.log(`📋 Total candidates gathered: ${candidateItems.length}`);

  if (candidateItems.length === 0) {
    console.log(`  ⏩ No articles found for category ${catName} in any feed.`);
    return;
  }

  // ─── Find & Process Up To MAX_PER_RUN Unseen Articles ───
  const catLower = catName.toLowerCase();
  let processedCount = 0;

  for (const item of candidateItems) {
    if (processedCount >= MAX_PER_RUN) break;

    const docId = articleToDocId(item.link);
    const existing = await db.collection("news").doc(docId).get();
    if (existing.exists) {
      console.log(`  ⏩ [Skip] Already in database: ${item.title.slice(0, 40)}...`);
      continue;
    }

    console.log(`\n🎯 [${processedCount + 1}/${MAX_PER_RUN}] Fresh article: "${item.title.slice(0, 50)}..."`);
    console.log(`🔗 Link: ${item.link}`);
    console.log(`🆔 DocId: ${docId}`);

    try {
      // Safety delay before AI call
      await sleep(2000);

      console.log(`  🤖 [AI] Summarizing (Gemini): ${item.title.slice(0, 50)}...`);
      const aiResult = await summarizeArticle(
        item.title,
        item.contentSnippet || item.content || ""
      );
      console.log(`✨ [AI] Summary generated (${aiResult.summary.length} chars).`);

      const serverTime = admin.firestore.FieldValue.serverTimestamp();
      const batch = db.batch();
      const newDocRef = db.collection("news").doc(docId);

      // Extract the best image URL available from the RSS item
      const imageUrl = extractImageUrl(item, docId);
      console.log(`🖼️  [Image] ${imageUrl.slice(0, 80)}`);

      console.log(`💾 [Firestore] Writing article to database...`);
      batch.set(newDocRef, {
        title: item.title,
        summary: aiResult.summary,
        imageUrl: imageUrl,
        category: catLower,
        sourceUrl: item.link,
        source: { name: item.sourceName, url: item.sourceUrl },
        // Use server timestamp as 'timestamp' so new articles always sort to the top
        timestamp: serverTime,
        originalPubDate: admin.firestore.Timestamp.fromDate(new Date(item.pubTime)),
        createdAt: serverTime,
        publishedAt: serverTime
      });

      // ─── FIFO Pruning (maintain max per category) ───
      const categoryDocs = await db.collection("news")
        .where("category", "==", catLower)
        .orderBy("timestamp", "desc")
        .get();

      if (categoryDocs.size + 1 > MAX_HISTORY) {
        const surplus = (categoryDocs.size + 1) - MAX_HISTORY;
        const toDelete = categoryDocs.docs.slice(categoryDocs.docs.length - surplus);
        toDelete.forEach(doc => batch.delete(doc.ref));
        console.log(`  🗑️ [FIFO] Pruning ${toDelete.length} oldest articles for ${catLower}.`);
      }

      await batch.commit();

      // ─── Heartbeat ───
      await updateCategoryMetadata(catLower, item.title);
      console.log(`  ✅ [Success] Saved article ${processedCount + 1} for ${catLower}.`);
      processedCount++;

    } catch (err) {
      console.error(`  ⚠️ [Error] Failed to process "${item.title.slice(0, 40)}": ${err.message}`);
      // Continue to next article rather than aborting the whole category
    }
  }

  if (processedCount === 0) {
    console.log(`  😴 No new articles saved for ${catName} (all ${candidateItems.length} candidates were already in DB).`);
  } else {
    console.log(`  🏆 [Done] Saved ${processedCount} new article(s) for ${catName}.`);
  }
}

// ─── Execution ───────────────────────────────────────────────────────────────
async function run() {
  const t0 = Date.now();
  console.log("🚀 [Briefora] Heartbeat Pulse Started...");

  let selectedCategory = null;

  try {
    // 1. Try to find the "Stale" Category (Oldest last_freshened)
    console.log("🔍 [Smart-Discovery] Scanning category metadata for stale content...");
    const metaSnap = await db.collection("_metadata").doc("categories").collection("list").get();
    
    if (!metaSnap.empty) {
      const categoryUsage = metaSnap.docs.map(doc => ({
        id: doc.id,
        lastFreshened: doc.data().last_freshened?.toMillis() || 0
      }));

      // Find the one with the smallest timestamp
      categoryUsage.sort((a, b) => a.lastFreshened - b.lastFreshened);
      
      // We look at the first few candidates to ensure we don't always pick the same failing one
      // but prioritize the absolute oldest.
      const oldest = categoryUsage[0];
      if (oldest && (Date.now() - oldest.lastFreshened > 1000 * 60 * 5)) {
         selectedCategory = oldest.id.toUpperCase();
         console.log(`💡 [Smart-Discovery] Neglected category found: ${selectedCategory} (Last updated ${Math.floor((Date.now() - oldest.lastFreshened)/1000/60)}m ago)`);
      }
    }
  } catch (e) {
    console.warn("⚠️ [Smart-Discovery] Metadata check failed, falling back to time-rotation.", e.message);
  }

  // 2. Fallback: Rotating Heartbeat Logic (Time-based slot)
  if (!selectedCategory || !CATEGORIES.includes(selectedCategory)) {
    const totalMinutes = Math.floor(Date.now() / (1000 * 60));
    const categoryIndex = Math.floor(totalMinutes / 3) % CATEGORIES.length;
    selectedCategory = CATEGORIES[categoryIndex];
    console.log(`🕒 [Rotation] Time-slot selection: ${selectedCategory} (Index ${categoryIndex})`);
  }

  try {
    await processCategory(selectedCategory, CATEGORY_FEEDS[selectedCategory]);
  } catch (err) {
    console.error(`❌ [Fatal] Run failed:`, err.message);
    process.exit(1);
  }

  const duration = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`🏁 [Briefora] Pulse Complete. Duration: ${duration}s`);
  process.exit(0);
}

run();
