const admin = require("firebase-admin");
const RSSParser = require("rss-parser");
const dotenv = require("dotenv");
const path = require("path");
const { summarizeArticle } = require("./lib/ai-service");

dotenv.config();
const parser = new RSSParser({
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
    'Accept': 'application/rss+xml, application/xml;q=0.9, */*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
  },
});

// ─── Firebase Auth Initialization ───────────────────────────────────────────
const db = (function() {
  const serviceAccountPath = path.join(__dirname, "..", "service-account.json");
  const fs = require("fs");
  
  if (process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
    console.log("🔐 [Auth] Initializing Firebase Admin via Environment Variables...");
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID || "briefly-32a26",
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      }),
      projectId: process.env.FIREBASE_PROJECT_ID
    });
  } else if (fs.existsSync(serviceAccountPath)) {
    console.log("🔐 [Auth] Initializing Firebase Admin with service-account.json...");
    const serviceAccount = require(serviceAccountPath);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: serviceAccount.project_id || "briefly-32a26"
    });
  } else {
    throw new Error("❌ [Critical] No Firebase credentials found.");
  }
  return admin.firestore();
})();

// ─── Constants & RSS Map ───────────────────────────────────────────────────
const categories = [
  { id: "world", rss: "http://feeds.bbci.co.uk/news/world/rss.xml", appCategory: "WORLD" },
  { id: "business", rss: "http://feeds.bbci.co.uk/news/business/rss.xml", appCategory: "BUSINESS" },
  { id: "technology", rss: "http://feeds.bbci.co.uk/news/technology/rss.xml", appCategory: "TECH" },
  { id: "science", rss: "http://feeds.bbci.co.uk/news/science_and_environment/rss.xml", appCategory: "SCIENCE" },
  { id: "health", rss: "http://feeds.bbci.co.uk/news/health/rss.xml", appCategory: "LIFESTYLE" },
  { id: "politics", rss: "http://feeds.bbci.co.uk/news/politics/rss.xml", appCategory: "WORLD" },
  { id: "entertainment", rss: "http://feeds.bbci.co.uk/news/entertainment_and_arts/rss.xml", appCategory: "CULTURE" }
];

function normalizeUrl(url) {
  try {
    let u = url.toLowerCase().trim();
    // Remove protocol and www.
    u = u.replace(/^(https?:\/\/)?(www\.)?/, "");
    // Remove trailing slash
    u = u.replace(/\/$/, "");
    // Remove common feed parameters (e.g., ?utm_source)
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

// ─── Main Execution ──────────────────────────────────────────────────────────
async function rotateNews() {
  // Calculate rotation modulo (one category per 5-minute chunk)
  const currentEpoch5Min = Math.floor(Date.now() / (5 * 60 * 1000));
  const cat = categories[currentEpoch5Min % categories.length];

  console.log(`🔄 [Rotation] Target: ${cat.appCategory} (Source: BBC ${cat.id})`);

  try {
    console.log(`📡 [Rotation] Fetching RSS: ${cat.rss}`);
    const feed = await parser.parseURL(cat.rss);
    
    if (!feed.items || feed.items.length === 0) {
      console.log(`⚠️  [Rotation] No items found in feed. Skipping.`);
      return;
    }

    // Get the latest item
    const item = feed.items[0];
    const docId = articleToDocId(item.link);

    // Check if exists
    const docRef = db.collection("news").doc(docId);
    const existing = await docRef.get();
    if (existing.exists) {
      console.log(`⏭️  [Rotation] Story already exists: ${item.title}`);
      return;
    }

    console.log(`📝 [Rotation] New Story Found: ${item.title}`);

    // Summarize
    const summary = await summarizeArticle(item.title, item.contentSnippet || item.content || "");

    const now = admin.firestore.Timestamp.now();
    await docRef.set({
      title: item.title,
      summary,
      imageUrl: `https://picsum.photos/seed/${docId}/800/1400`, // RSS usually lacks images, using placeholder
      category: cat.appCategory,
      sourceUrl: item.link,
      source: { name: "BBC News", url: "https://www.bbc.com/news" },
      timestamp: admin.firestore.Timestamp.fromDate(new Date(item.pubDate || new Date())),
      createdAt: now,
      publishedAt: now,
    });

    console.log(`✅ [Rotation] Added to Firestore.`);

    // Index-safe Cleanup
    try {
      const snapshot = await db.collection("news")
        .where("category", "==", cat.appCategory)
        .orderBy("createdAt", "asc")
        .limit(1)
        .get();

      if (snapshot.size > 10) { // Only delete if we have more than 10 to keep it healthy
        await snapshot.docs[0].ref.delete();
        console.log(`🧹 [Rotation] Cleaned up old story.`);
      }
    } catch (indexErr) {
      if (indexErr.message.includes("FAILED_PRECONDITION")) {
        console.warn("\n⚠️  [Index Missing] To enable auto-cleanup, please create the index using this link:");
        console.warn(indexErr.message.split("here: ")[1] + "\n");
      }
    }

  } catch (err) {
    console.error(`💥 [Rotation] Error: ${err.message}`);
    process.exit(1);
  }
}

rotateNews().then(() => {
  console.log("🏁 [Rotation] Cycle Complete.");
  process.exit(0);
});
