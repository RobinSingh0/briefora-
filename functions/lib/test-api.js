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
dotenv.config();
const guardianKey = process.env.GUARDIAN_API_KEY || "0a84d37d-fec7-4394-83e1-97c692b87a50";
const ollamaKey = process.env.OLLAMA_API_KEY || "e6182ff5a9274d6f908afe50904fad08.o8sfUqAZS1yN8qaX_CakLs26";
async function runTest() {
    var _a, _b, _c;
    console.log("🔍  Starting Diagnostics for The Guardian + Gemini...");
    // 1. Test Guardian API
    console.log("\n📡  Testing The Guardian API...");
    try {
        const url = "https://content.guardianapis.com/search";
        const response = await axios_1.default.get(url, {
            params: {
                "api-key": guardianKey,
                "page-size": 1,
                "show-fields": "trailText,thumbnail",
            },
        });
        const article = response.data.response.results[0];
        // 2. Test Ollama API
        console.log("\n🤖  Testing Ollama Hosted API (llama3)...");
        try {
            const endpoint = "https://ollama.com/api/generate";
            const ollamaResponse = await axios_1.default.post(endpoint, {
                model: "ministral-3:14b",
                prompt: `Summarize this into 3 punchy sentences: "${article.webTitle} - ${((_a = article.fields) === null || _a === void 0 ? void 0 : _a.trailText) || ""}"`,
                stream: false
            }, {
                headers: {
                    "Authorization": `Bearer ${ollamaKey}`,
                    "Content-Type": "application/json"
                }
            });
            const text = ollamaResponse.data.response;
            console.log("✅  Ollama API OK! Summary result:");
            console.log(`\n"${text.trim()}"\n`);
        }
        catch (err) {
            console.error("❌  Ollama API FAILED:", ((_b = err.response) === null || _b === void 0 ? void 0 : _b.data) || err.message);
        }
    }
    catch (err) {
        console.error("❌  Guardian API FAILED:", ((_c = err.response) === null || _c === void 0 ? void 0 : _c.data) || err.message);
    }
    console.log("🏁  Diagnostics complete.");
}
runTest();
//# sourceMappingURL=test-api.js.map