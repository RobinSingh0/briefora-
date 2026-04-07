import axios from "axios";
import * as dotenv from "dotenv";

dotenv.config();

const guardianKey = process.env.GUARDIAN_API_KEY || "0a84d37d-fec7-4394-83e1-97c692b87a50";
const ollamaKey = process.env.OLLAMA_API_KEY || "e6182ff5a9274d6f908afe50904fad08.o8sfUqAZS1yN8qaX_CakLs26";

async function runTest() {
  console.log("🔍  Starting Diagnostics for The Guardian + Gemini...");

  // 1. Test Guardian API
  console.log("\n📡  Testing The Guardian API...");
  try {
    const url = "https://content.guardianapis.com/search";
    const response = await axios.get(url, {
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
      const ollamaResponse = await axios.post(endpoint, {
        model: "ministral-3:14b",
        prompt: `Summarize this into 3 punchy sentences: "${article.webTitle} - ${article.fields?.trailText || ""}"`,
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
    } catch (err: any) {
      console.error("❌  Ollama API FAILED:", err.response?.data || err.message);
    }
  } catch (err: any) {
    console.error("❌  Guardian API FAILED:", err.response?.data || err.message);
  }

  console.log("🏁  Diagnostics complete.");
}

runTest();
