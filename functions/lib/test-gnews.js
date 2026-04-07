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
const axios_1 = __importDefault(require("axios"));
const dotenv = __importStar(require("dotenv"));
const path_1 = __importDefault(require("path"));
// Load .env from the current directory (functions)
dotenv.config({ path: path_1.default.resolve(__dirname, "../.env") });
const gnewsKey = process.env.GNEWS_API_KEY;
async function testGNews() {
    console.log("🔍 Testing GNews API Integration...");
    if (!gnewsKey) {
        console.error("❌ GNEWS_API_KEY is missing in .env file!");
        return;
    }
    const url = "https://gnews.io/api/v4/top-headlines";
    try {
        const response = await axios_1.default.get(url, {
            params: {
                apikey: gnewsKey,
                lang: "en",
                max: 5,
            },
            timeout: 15000,
        });
        if (response.data && response.data.articles) {
            console.log(`✅ Success! Fetched ${response.data.articles.length} articles.`);
            response.data.articles.forEach((article, index) => {
                console.log(`\n[${index + 1}] ${article.title}`);
                console.log(`   Source: ${article.source.name}`);
                console.log(`   URL: ${article.url}`);
                console.log(`   Published: ${article.publishedAt}`);
            });
        }
        else {
            console.error("❌ Unexpected response structure:", response.data);
        }
    }
    catch (error) {
        console.error("❌ GNews API request failed:");
        if (error.response) {
            console.error(`   Status: ${error.response.status}`);
            console.error(`   Data:`, error.response.data);
        }
        else {
            console.error(`   Message: ${error.message}`);
        }
    }
}
testGNews();
//# sourceMappingURL=test-gnews.js.map