"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.rotateNewsArticles = exports.triggerNewsUpdate = exports.fetchAndSummarizeNews = void 0;
const functions = __importStar(require("firebase-functions/v2"));
const admin = __importStar(require("firebase-admin"));
const axios_1 = __importDefault(require("axios"));
const dotenv = __importStar(require("dotenv"));
const rss_parser_1 = __importDefault(require("rss-parser"));
dotenv.config();
admin.initializeApp();
const db = admin.firestore();
// ─── Caching Constants ────────────────────────────────────────────────────────
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour revalidation
async function isCacheValid() {
    var _a, _b;
    const meta = await db.collection("system").doc("sync_meta").get();
    if (!meta.exists)
        return false;
    const lastSync = (_b = (_a = meta.data()) === null || _a === void 0 ? void 0 : _a.lastSuccessfulSync) === null || _b === void 0 ? void 0 : _b.toDate();
    if (!lastSync)
        return false;
    return Date.now() - lastSync.getTime() < CACHE_TTL_MS;
}
async function updateSyncMetadata(status) {
    await db.collection("system").doc("sync_meta").set({
        lastSuccessfulSync: admin.firestore.FieldValue.serverTimestamp(),
        status,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
}
// ─── Category Mapping ─────────────────────────────────────────────────────────
const SECTION_MAP = {
    technology: "TECH",
    science: "SCIENCE",
    business: "BUSINESS",
    sport: "SPORTS",
    "us-news": "WORLD",
    world: "WORLD",
    politics: "WORLD",
    environment: "SCIENCE",
    culture: "CULTURE",
    lifestyle: "LIFESTYLE",
    // NewsAPI categories
    general: "WORLD",
    entertainment: "CULTURE",
    health: "LIFESTYLE",
};
function mapCategory(sectionId) {
    var _a;
    return (_a = SECTION_MAP[sectionId.toLowerCase()]) !== null && _a !== void 0 ? _a : "WORLD";
}
// ─── Fetch from The Guardian ──────────────────────────────────────────────────
async function fetchGuardianArticles(apiKey) {
    const sections = ["technology", "business", "science", "world", "sport"];
    const url = "https://content.guardianapis.com/search";
    const response = await axios_1.default.get(url, {
        params: {
            "api-key": apiKey,
            "show-fields": "bodyText,thumbnail,trailText",
            "page-size": 15,
            "order-by": "newest",
            section: sections.join("|"),
        },
        timeout: 15000,
    });
    if (response.data.response.status !== "ok") {
        throw new Error("Guardian API returned non-ok status");
    }
    return response.data.response.results;
}
async function fetchNewsAPIArticles(apiKey) {
    const url = "https://newsapi.org/v2/top-headlines";
    const response = await axios_1.default.get(url, {
        params: {
            apiKey: apiKey,
            language: "en",
            pageSize: 15,
            category: "technology",
        },
        timeout: 15000,
    });
    if (response.data.status !== "ok") {
        throw new Error("NewsAPI returned non-ok status");
    }
    return response.data.articles;
}
async function fetchNYTArticles(apiKey) {
    const url = "https://api.nytimes.com/svc/topstories/v2/home.json";
    const response = await axios_1.default.get(url, {
        params: { "api-key": apiKey },
        timeout: 15000,
    });
    if (response.data.status !== "OK") {
        throw new Error("NYT API returned non-OK status");
    }
    return response.data.results;
}
async function fetchWorldNewsArticles(apiKey) {
    const url = "https://api.worldnewsapi.com/search-news";
    const response = await axios_1.default.get(url, {
        params: {
            "api-key": apiKey,
            "language": "en",
            "number": 15,
        },
        timeout: 15000,
    });
    return response.data.news || [];
}
async function fetchGNewsArticles(apiKey) {
    const url = "https://gnews.io/api/v4/top-headlines";
    const response = await axios_1.default.get(url, {
        params: {
            apikey: apiKey,
            lang: "en",
            max: 10,
        },
        timeout: 15000,
    });
    return response.data.articles || [];
}
async function fetchBBCArticles() {
    const parser = new rss_parser_1.default();
    const feed = await parser.parseURL("https://feeds.bbci.co.uk/news/technology/rss.xml");
    return feed.items;
}
// ─── Gemini Summarization (with Fallback) ──────────────────────────────────────
async function summarizeWithOllama(ollamaKey, title, bodyText) {
    const modelName = "ministral-3:14b";
    const endpoint = "https://ollama.com/api/generate";
    try {
        const response = await axios_1.default.post(endpoint, {
            model: modelName,
            prompt: `Summarize in exactly 3 crisp, active sentences for a mobile app: "${title}. ${bodyText.slice(0, 3000)}"`,
            stream: false
        }, {
            headers: {
                "Authorization": `Bearer ${ollamaKey}`,
                "Content-Type": "application/json"
            }
        });
        const text = response.data.response.trim();
        if (text)
            return text;
    }
    catch (err) {
        functions.logger.warn(`Ollama API failed: ${err.message}`);
    }
    throw new Error("Ollama model failed — falling back to metadata.");
}
// ─── Deduplication Check ──────────────────────────────────────────────────────
function articleToDocId(url) {
    return Buffer.from(url).toString("base64").replace(/[/+=]/g, "_").slice(0, 128);
}
async function articleExists(docId) {
    const doc = await db.collection("news").doc(docId).get();
    return doc.exists;
}
// ─── Main Scheduled Function ──────────────────────────────────────────────────
exports.fetchAndSummarizeNews = functions.scheduler.onSchedule({
    schedule: "every 30 minutes",
    timeZone: "UTC",
    memory: "512MiB",
    timeoutSeconds: 300,
}, async (_event) => {
    var _a;
    const guardianKey = process.env.GUARDIAN_API_KEY;
    const ollamaKey = process.env.OLLAMA_API_KEY;
    const newsKey = process.env.NEWS_API_KEY;
    const nytKey = process.env.NYT_API_KEY;
    const worldNewsKey = process.env.WORLD_NEWS_API_KEY;
    const gnewsKey = process.env.GNEWS_API_KEY;
    if (!guardianKey || !ollamaKey) {
        functions.logger.error("Missing critical API keys.");
        return;
    }
    functions.logger.info("🗞️  Checking news cache status...");
    if (await isCacheValid()) {
        functions.logger.info("⏭️  Cache is still valid (< 1hr). Skipping fetch cycle.");
        return;
    }
    functions.logger.info("🗞️  Starting multi-source fetch cycle...");
    const normalizedArticles = [];
    // Source 1: The Guardian
    try {
        const gArticles = await fetchGuardianArticles(guardianKey);
        gArticles.forEach(a => {
            var _a, _b, _c, _d, _e;
            return normalizedArticles.push({
                title: a.webTitle,
                url: a.webUrl,
                body: (_d = (_b = (_a = a.fields) === null || _a === void 0 ? void 0 : _a.bodyText) !== null && _b !== void 0 ? _b : (_c = a.fields) === null || _c === void 0 ? void 0 : _c.trailText) !== null && _d !== void 0 ? _d : "",
                imageUrl: (_e = a.fields) === null || _e === void 0 ? void 0 : _e.thumbnail,
                category: mapCategory(a.sectionId),
                source: "The Guardian",
                date: a.webPublicationDate
            });
        });
    }
    catch (err) {
        functions.logger.error("Guardian fetch failed:", err);
    }
    // Source 2: NewsAPI
    if (newsKey) {
        try {
            const nArticles = await fetchNewsAPIArticles(newsKey);
            nArticles.forEach(a => normalizedArticles.push({
                title: a.title,
                url: a.url,
                body: a.content || a.description || "",
                imageUrl: a.urlToImage,
                category: "TECH",
                source: a.source.name || "NewsAPI",
                date: a.publishedAt
            }));
        }
        catch (err) {
            functions.logger.error("NewsAPI fetch failed:", err);
        }
    }
    // Source 3: NYTimes
    if (nytKey) {
        try {
            const nytArticles = await fetchNYTArticles(nytKey);
            nytArticles.forEach(a => {
                var _a, _b;
                return normalizedArticles.push({
                    title: a.title,
                    url: a.url,
                    body: a.abstract || "",
                    imageUrl: (_b = (_a = a.multimedia) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.url,
                    category: mapCategory(a.section),
                    source: "The New York Times",
                    date: a.published_date
                });
            });
        }
        catch (err) {
            functions.logger.error("NYT fetch failed:", err);
        }
    }
    // Source 4: WorldNews API
    if (worldNewsKey) {
        try {
            const wnArticles = await fetchWorldNewsArticles(worldNewsKey);
            wnArticles.forEach(a => normalizedArticles.push({
                title: a.title,
                url: a.url,
                body: a.text || "",
                imageUrl: a.image,
                category: "WORLD",
                source: "World News API",
                date: a.publish_date
            }));
        }
        catch (err) {
            functions.logger.error("WorldNews fetch failed:", err);
        }
    }
    // Source 5: GNews API
    if (gnewsKey) {
        try {
            const gnArticles = await fetchGNewsArticles(gnewsKey);
            gnArticles.forEach(a => normalizedArticles.push({
                title: a.title,
                url: a.url,
                body: a.content || a.description || "",
                imageUrl: a.image,
                category: "WORLD",
                source: a.source.name || "GNews",
                date: a.publishedAt
            }));
        }
        catch (err) {
            functions.logger.error("GNews fetch failed:", err);
        }
    }
    // Source 6: BBC RSS (Free)
    try {
        const bbcArticles = await fetchBBCArticles();
        bbcArticles.forEach(a => normalizedArticles.push({
            title: a.title,
            url: a.link,
            body: a.contentSnippet || a.content || "",
            imageUrl: `https://loremflickr.com/800/1400/tech,news/all`, // RSS doesn't always have images
            category: "TECH",
            source: "BBC News",
            date: a.isoDate || a.pubDate
        }));
    }
    catch (err) {
        functions.logger.error("BBC RSS fetch failed:", err);
    }
    let newCount = 0;
    for (const article of normalizedArticles) {
        const docId = articleToDocId(article.url);
        if (await articleExists(docId))
            continue;
        if (article.body.length < 50)
            continue; // Lowered for RSS snippets
        let summary;
        try {
            summary = await summarizeWithOllama(ollamaKey, article.title, article.body);
        }
        catch (err) {
            summary = article.body.slice(0, 300).replace(/<[^>]*>/g, "") + "...";
        }
        await db.collection("news").doc(docId).set({
            title: article.title,
            summary,
            imageUrl: (_a = article.imageUrl) !== null && _a !== void 0 ? _a : `https://picsum.photos/seed/${docId}/800/1400`,
            category: article.category,
            sourceUrl: article.url,
            source: article.source,
            timestamp: admin.firestore.Timestamp.fromDate(new Date(article.date)),
            createdAt: admin.firestore.Timestamp.now(),
        });
        newCount++;
        if (newCount >= 50)
            break; // Increased capacity to 50
        await new Promise((r) => setTimeout(r, 800));
    }
    await updateSyncMetadata("success");
    functions.logger.info(`✅ Cycle complete. Added ${newCount} stories.`);
});
// ─── HTTP Trigger (Manual) ───────────────────────────────────────────────────
exports.triggerNewsUpdate = functions.https.onRequest({
    memory: "512MiB",
    timeoutSeconds: 300,
    cors: ["https://briefora.vercel.app", "http://localhost:3000", "http://localhost:8081"], // Allow production and common local dev ports
}, async (req, res) => {
    var _a;
    const ollamaKey = process.env.OLLAMA_API_KEY;
    const guardianKey = process.env.GUARDIAN_API_KEY;
    const newsKey = process.env.NEWS_API_KEY;
    const nytKey = process.env.NYT_API_KEY;
    const worldNewsKey = process.env.WORLD_NEWS_API_KEY;
    const gnewsKey = process.env.GNEWS_API_KEY;
    if (!ollamaKey) {
        res.status(500).json({ error: "Missing Ollama API key." });
        return;
    }
    // Cache check for manual trigger
    if (await isCacheValid()) {
        functions.logger.info("⏭️  Manual trigger: Using cached data.");
        res.json({ success: true, added: 0, cached: true, message: "News is already up to date (1hr cache)." });
        return;
    }
    try {
        const normalizedArticles = [];
        // Fetch from all available sources
        if (guardianKey) {
            try {
                const gArticles = await fetchGuardianArticles(guardianKey);
                gArticles.forEach(a => {
                    var _a, _b, _c;
                    return normalizedArticles.push({
                        title: a.webTitle, url: a.webUrl, body: ((_a = a.fields) === null || _a === void 0 ? void 0 : _a.bodyText) || ((_b = a.fields) === null || _b === void 0 ? void 0 : _b.trailText) || "",
                        imageUrl: (_c = a.fields) === null || _c === void 0 ? void 0 : _c.thumbnail, category: mapCategory(a.sectionId), source: "The Guardian", date: a.webPublicationDate
                    });
                });
            }
            catch (e) {
                functions.logger.error("Guardian trigger failed", e);
            }
        }
        if (newsKey) {
            try {
                const nArticles = await fetchNewsAPIArticles(newsKey);
                nArticles.forEach(a => normalizedArticles.push({
                    title: a.title, url: a.url, body: a.content || a.description || "",
                    imageUrl: a.urlToImage, category: "TECH", source: a.source.name, date: a.publishedAt
                }));
            }
            catch (e) {
                functions.logger.error("NewsAPI trigger failed", e);
            }
        }
        if (nytKey) {
            try {
                const nyt = await fetchNYTArticles(nytKey);
                nyt.forEach(a => {
                    var _a, _b;
                    return normalizedArticles.push({
                        title: a.title, url: a.url, body: a.abstract || "",
                        imageUrl: (_b = (_a = a.multimedia) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.url, category: mapCategory(a.section), source: "The New York Times", date: a.published_date
                    });
                });
            }
            catch (e) {
                functions.logger.error("NYT trigger failed", e);
            }
        }
        if (worldNewsKey) {
            try {
                const wn = await fetchWorldNewsArticles(worldNewsKey);
                wn.forEach(a => normalizedArticles.push({
                    title: a.title, url: a.url, body: a.text || "",
                    imageUrl: a.image, category: "WORLD", source: "World News API", date: a.publish_date
                }));
            }
            catch (e) {
                functions.logger.error("WorldNews trigger failed", e);
            }
        }
        if (gnewsKey) {
            try {
                const gn = await fetchGNewsArticles(gnewsKey);
                gn.forEach(a => normalizedArticles.push({
                    title: a.title, url: a.url, body: a.content || a.description || "",
                    imageUrl: a.image, category: "WORLD", source: a.source.name, date: a.publishedAt
                }));
            }
            catch (e) {
                functions.logger.error("GNews trigger failed", e);
            }
        }
        // Source 6: BBC RSS (Free)
        try {
            const bbc = await fetchBBCArticles();
            bbc.forEach(a => normalizedArticles.push({
                title: a.title,
                url: a.link,
                body: a.contentSnippet || a.content || "",
                imageUrl: `https://picsum.photos/seed/${Buffer.from(a.link).toString("base64").slice(0, 10)}/800/1400`,
                category: "TECH",
                source: "BBC News",
                date: a.isoDate || a.pubDate
            }));
        }
        catch (e) {
            functions.logger.error("BBC trigger failed", e);
        }
        let added = 0;
        // Process more for trigger too
        const toProcess = normalizedArticles.slice(0, 50);
        for (const article of toProcess) {
            const docId = articleToDocId(article.url);
            if (await articleExists(docId))
                continue;
            let summary;
            try {
                summary = await summarizeWithOllama(ollamaKey, article.title, article.body);
            }
            catch (_b) {
                summary = article.body.slice(0, 200) + "...";
            }
            await db.collection("news").doc(docId).set({
                title: article.title,
                summary,
                imageUrl: (_a = article.imageUrl) !== null && _a !== void 0 ? _a : `https://picsum.photos/seed/${docId}/800/1400`,
                category: article.category,
                sourceUrl: article.url,
                source: article.source,
                timestamp: admin.firestore.Timestamp.fromDate(new Date(article.date)),
                createdAt: admin.firestore.Timestamp.now(),
            });
            added++;
            await new Promise(r => setTimeout(r, 600));
        }
        await updateSyncMetadata("success_manual");
        res.json({ success: true, added, cached: false });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// ─── News Rotation Scheduler ──────────────────────────────────────────────────
exports.rotateNewsArticles = functions.scheduler.onSchedule({
    schedule: "*/5 * * * *",
    timeZone: "UTC",
    memory: "512MiB",
    timeoutSeconds: 300,
}, async (_event) => {
    var _a;
    const newsKey = process.env.NEWS_API_KEY;
    const ollamaKey = process.env.OLLAMA_API_KEY;
    if (!newsKey || !ollamaKey) {
        functions.logger.error("Missing NEWS_API_KEY or OLLAMA_API_KEY for rotation.");
        return;
    }
    functions.logger.info("🔄 Starting 5-minute news rotation...");
    const categories = [
        { id: "business", appCategory: "BUSINESS" },
        { id: "entertainment", appCategory: "CULTURE" },
        { id: "general", appCategory: "WORLD" },
        { id: "health", appCategory: "LIFESTYLE" },
        { id: "science", appCategory: "SCIENCE" },
        { id: "sports", appCategory: "SPORTS" },
        { id: "technology", appCategory: "TECH" }
    ];
    // Pick 1 category to update per run based on the current 5-minute epoch chunk
    const currentEpoch5Min = Math.floor(Date.now() / (5 * 60 * 1000));
    const cat = categories[currentEpoch5Min % categories.length];
    functions.logger.info(`🔄 Running 5-minute rotation for category: ${cat.appCategory}`);
    try {
        const url = "https://newsapi.org/v2/top-headlines";
        const response = await axios_1.default.get(url, {
            params: {
                apiKey: newsKey,
                language: "en",
                pageSize: 1, // Only grab 1 article
                category: cat.id,
            },
            timeout: 15000,
        });
        if (response.data.status !== "ok" || !response.data.articles)
            return;
        let addedCount = 0;
        for (const article of response.data.articles) {
            const docId = articleToDocId(article.url);
            if (await articleExists(docId))
                continue;
            let summary;
            try {
                summary = await summarizeWithOllama(ollamaKey, article.title, article.content || article.description || "");
            }
            catch (_b) {
                summary = (article.content || article.description || "").slice(0, 200).replace(/<[^>]*>/g, "") + "...";
            }
            const now = admin.firestore.Timestamp.now();
            await db.collection("news").doc(docId).set({
                title: article.title,
                summary,
                imageUrl: (_a = article.urlToImage) !== null && _a !== void 0 ? _a : `https://picsum.photos/seed/${docId}/800/1400`,
                category: cat.appCategory,
                sourceUrl: article.url,
                source: { id: docId, name: article.source.name || "NewsAPI", url: article.url },
                timestamp: admin.firestore.Timestamp.fromDate(new Date(article.publishedAt)),
                createdAt: now,
                publishedAt: now, // Explicitly tracked for rotation tracking
            });
            addedCount++;
            await new Promise(r => setTimeout(r, 600)); // Respect rate limits
        }
        // Cleanup: delete oldest articles if new ones were added
        if (addedCount > 0) {
            // Utilizing createdAt since older documents lack publishedAt
            const oldestSnapshot = await db.collection("news")
                .where("category", "==", cat.appCategory)
                .orderBy("createdAt", "asc")
                .limit(addedCount)
                .get();
            if (!oldestSnapshot.empty) {
                const batch = db.batch();
                oldestSnapshot.docs.forEach(doc => batch.delete(doc.ref));
                await batch.commit();
                functions.logger.info(`🧹 Cleaned up ${oldestSnapshot.size} old articles in ${cat.appCategory}`);
            }
        }
    }
    catch (err) {
        functions.logger.error(`Rotation failed for category ${cat.appCategory}:`, err);
    }
});
//# sourceMappingURL=index.js.map