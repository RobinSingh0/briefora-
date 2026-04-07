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
const admin = __importStar(require("firebase-admin"));
const axios_1 = __importDefault(require("axios"));
const dotenv = __importStar(require("dotenv"));
const rss_parser_1 = __importDefault(require("rss-parser"));
dotenv.config();
// Use the local project ID
if (!admin.apps.length) {
    admin.initializeApp({
        projectId: "briefly-32a26"
    });
}
const db = admin.firestore();
const guardianKey = process.env.GUARDIAN_API_KEY || "0a84d37d-fec7-4394-83e1-97c692b87a50";
const ollamaKey = process.env.OLLAMA_API_KEY || "e6182ff5a9274d6f908afe50904fad08.o8sfUqAZS1yN8qaX_CakLs26";
async function runSyncOnce() {
    console.log("🚀  MANUAL BACKEND TEST - START");
    const normalizedArticles = [];
    // 1. Fetch from Guardian
    try {
        const url = "https://content.guardianapis.com/search";
        const gResponse = await axios_1.default.get(url, {
            params: {
                "api-key": guardianKey,
                "show-fields": "bodyText,thumbnail,trailText",
                "page-size": 5,
                "order-by": "newest",
                "section": "technology|business|science|world",
            },
        });
        const articles = gResponse.data.response.results;
        console.log(`✅  Guardian OK - Got ${articles.length} articles.`);
        articles.forEach((a) => {
            var _a, _b, _c;
            return normalizedArticles.push({
                title: a.webTitle,
                url: a.webUrl,
                body: ((_a = a.fields) === null || _a === void 0 ? void 0 : _a.bodyText) || ((_b = a.fields) === null || _b === void 0 ? void 0 : _b.trailText) || "",
                imageUrl: (_c = a.fields) === null || _c === void 0 ? void 0 : _c.thumbnail,
                category: (a.sectionId || "WORLD").toUpperCase(),
                source: "The Guardian",
                date: a.webPublicationDate
            });
        });
    }
    catch (err) {
        console.error("⚠️   Guardian failed:", err.message);
    }
    // 1.1 Fetch from BBC RSS
    try {
        const parser = new rss_parser_1.default();
        const feed = await parser.parseURL("https://feeds.bbci.co.uk/news/technology/rss.xml");
        console.log(`✅  BBC RSS OK - Got ${feed.items.length} articles.`);
        feed.items.forEach((a) => normalizedArticles.push({
            title: a.title,
            url: a.link,
            body: a.contentSnippet || a.content || "",
            imageUrl: `https://picsum.photos/seed/${Buffer.from(a.link).toString("base64").slice(0, 10)}/800/1400`,
            category: "TECH",
            source: "BBC News",
            date: a.isoDate || a.pubDate
        }));
    }
    catch (err) {
        console.error("⚠️   BBC failed:", err.message);
    }
    console.log(`📊  Total articles to process: ${normalizedArticles.length}`);
    for (const article of normalizedArticles) {
        try {
            console.log(`\n📄  Processing: "${article.title}"`);
            // 2. Summarize
            let summary = article.body.slice(0, 300).replace(/<[^>]*>/g, "") + "...";
            if (article.body.length < 50) {
                console.log("   ⏭️   Body too short for AI, using snippet...");
            }
            else {
                try {
                    const endpoint = "https://ollama.com/api/generate";
                    const response = await axios_1.default.post(endpoint, {
                        model: "ministral-3:14b",
                        prompt: `Summarize in exactly 3 sentences: ${article.body.slice(0, 3000)}`,
                        stream: false
                    }, {
                        headers: {
                            "Authorization": `Bearer ${ollamaKey}`,
                            "Content-Type": "application/json"
                        }
                    });
                    const aiSummary = response.data.response.trim();
                    if (aiSummary) {
                        summary = aiSummary;
                        console.log(`   ✅  Ollama OK (ministral-3:14b)`);
                    }
                }
                catch (err) {
                    console.log(`   ⚠️   Ollama failed: ${err.message}, using snippet.`);
                }
            }
            // 3. Write to Firestore
            const docId = Buffer.from(article.url).toString("base64").replace(/[/+=]/g, "_").slice(0, 128);
            await db.collection("news").doc(docId).set({
                title: article.title,
                summary,
                imageUrl: article.imageUrl || `https://picsum.photos/seed/${docId}/800/1400`,
                category: article.category,
                sourceUrl: article.url,
                source: article.source,
                timestamp: admin.firestore.Timestamp.fromDate(new Date(article.date)),
                createdAt: admin.firestore.Timestamp.now(),
            });
            console.log(`   ✅  Saved to Firestore: ${docId}`);
        }
        catch (err) {
            console.error(`   ❌  Failed to process article: ${err.message}`);
        }
    }
    console.log("\n🏁  MANUAL SYNC COMPLETE.");
}
runSyncOnce().catch(err => console.error("FATAL:", err));
//# sourceMappingURL=sync-once.js.map