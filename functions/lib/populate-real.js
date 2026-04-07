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
const app_1 = require("firebase/app");
const firestore_1 = require("firebase/firestore");
const storage_1 = require("firebase/storage");
const axios_1 = __importDefault(require("axios"));
const dotenv = __importStar(require("dotenv"));
const rss_parser_1 = __importDefault(require("rss-parser"));
dotenv.config();
// Web Config from src/services/firebase.ts
const firebaseConfig = {
    apiKey: "AIzaSyBgx_28o_ZuN773NlYw2IHPo4BmOBhzJHc",
    authDomain: "briefly-32a26.firebaseapp.com",
    projectId: "briefly-32a26",
    storageBucket: "briefly-32a26.firebasestorage.app",
    messagingSenderId: "1078538872618",
    appId: "1:1078538872618:android:4341101b3abfb1e9cae053"
};
const app = (0, app_1.initializeApp)(firebaseConfig);
const db = (0, firestore_1.getFirestore)(app);
const storage = (0, storage_1.getStorage)(app);
const guardianKey = process.env.GUARDIAN_API_KEY || "0a84d37d-fec7-4394-83e1-97c692b87a50";
const ollamaKey = process.env.OLLAMA_API_KEY || "e6182ff5a9274d6f908afe50904fad08.o8sfUqAZS1yN8qaX_CakLs26";
const geminiKey = process.env.GEMINI_API_KEY;
async function generateImageWithImagen(title) {
    var _a, _b, _c;
    if (!geminiKey) {
        console.error("   ❌ GEMINI_API_KEY missing, cannot generate image.");
        return null;
    }
    try {
        const prompt = `Minimalist Vector Illustration related to: ${title}. High quality, clean design, solid background, 1024x1024.`;
        const url = `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict?key=${geminiKey}`;
        const response = await axios_1.default.post(url, {
            instances: [{ prompt }],
            parameters: { sampleCount: 1 }
        });
        const imageBase64 = (_c = (_b = (_a = response.data) === null || _a === void 0 ? void 0 : _a.predictions) === null || _b === void 0 ? void 0 : _b[0]) === null || _c === void 0 ? void 0 : _c.bytesBase64Encoded;
        if (imageBase64) {
            return Buffer.from(imageBase64, "base64");
        }
    }
    catch (err) {
        console.error(`   ⚠️   Imagen generation failed: ${err.message}`);
        if (err.response) {
            console.error(`      Response data: ${JSON.stringify(err.response.data)}`);
        }
    }
    return null;
}
async function uploadToStorage(buffer, docId) {
    try {
        const storageRef = (0, storage_1.ref)(storage, `news_images/${docId}.png`);
        await (0, storage_1.uploadBytes)(storageRef, buffer, { contentType: "image/png" });
        const downloadURL = await (0, storage_1.getDownloadURL)(storageRef);
        return downloadURL;
    }
    catch (err) {
        console.error(`   ⚠️   Storage upload failed: ${err.message}`);
    }
    return null;
}
async function populateReal() {
    console.log("🚀  MANUAL POPULATION - START");
    const normalizedArticles = [];
    // 1. Fetch from Guardian
    try {
        const url = "https://content.guardianapis.com/search";
        const res = await axios_1.default.get(url, {
            params: {
                "api-key": guardianKey,
                "show-fields": "bodyText,thumbnail,trailText",
                "page-size": 5,
                "order-by": "newest",
                "section": "technology|world|business",
            },
        });
        const articles = res.data.response.results;
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
            // Summarization
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
            // Handle Image Generation if missing or generic
            let imageUrl = article.imageUrl;
            const docId = Buffer.from(article.url).toString("base64").replace(/[/+=]/g, "_").slice(0, 128);
            if (!imageUrl || imageUrl.includes("picsum.photos")) {
                console.log(`   🎨 Generating illustration for: "${article.title}"`);
                const imageBuffer = await generateImageWithImagen(article.title);
                if (imageBuffer) {
                    const storedUrl = await uploadToStorage(imageBuffer, docId);
                    if (storedUrl) {
                        imageUrl = storedUrl;
                        console.log(`   ✅ Image generated and stored: ${imageUrl}`);
                    }
                }
            }
            // Final fallback if generation failed
            if (!imageUrl) {
                imageUrl = `https://picsum.photos/seed/${docId}/800/1400`;
            }
            // Write via Client SDK
            await (0, firestore_1.setDoc)((0, firestore_1.doc)(db, "news", docId), {
                title: article.title,
                summary,
                imageUrl,
                category: article.category,
                sourceUrl: article.url,
                source: article.source,
                timestamp: firestore_1.Timestamp.fromDate(new Date(article.date)),
                createdAt: firestore_1.Timestamp.now(),
            });
            console.log(`   ✅ Saved to Firestore: ${docId}`);
        }
        catch (err) {
            console.error(`   ❌ Failed to process article: ${err.message}`);
        }
    }
    console.log("\n🏁  Population complete. Check the web app!");
}
populateReal().catch(err => console.error("FATAL:", err));
//# sourceMappingURL=populate-real.js.map