const axios = require("axios");

const OLLAMA_ENDPOINT = "http://localhost:11434/api/generate";
const OLLAMA_MODEL = "ministral-3:14b";

async function testOllama() {
  console.log(`🤖 Testing Ollama with model: ${OLLAMA_MODEL}`);
  console.log(`🔗 Endpoint: ${OLLAMA_ENDPOINT}`);

  try {
    const start = Date.now();
    const response = await axios.post(OLLAMA_ENDPOINT, {
      model: OLLAMA_MODEL,
      prompt: "Briefly explain what a 'News Aggregator' is in 15 words.",
      stream: false
    }, { timeout: 30000 });

    const end = Date.now();
    console.log("\n✅ SUCCESS!");
    console.log(`⏱️  Response time: ${(end - start) / 1000}s`);
    console.log(`📝 Response: ${response.data.response.trim()}`);
    
    console.log("\n--- Testing Categorization ---");
    const catResponse = await axios.post(OLLAMA_ENDPOINT, {
      model: OLLAMA_MODEL,
      prompt: 'Analyze this title: "SpaceX launches new satellite constellation". Categorize it into EXACTLY ONE: [WORLD, TECH, BUSINESS, SPORTS]. Output ONLY the category.',
      stream: false
    });
    console.log(`🏷️  Category: ${catResponse.data.response.trim().toUpperCase()}`);

  } catch (err) {
    console.error("\n❌ FAILED");
    if (err.code === 'ECONNREFUSED') {
      console.error("Is Ollama running? Could not connect to localhost:11434");
    } else {
      console.error(err.message);
    }
    console.log("\n💡 Tip: Run 'ollama serve' and 'ollama pull ministral-3:14b' before testing.");
  }
}

testOllama();
