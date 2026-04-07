const { GoogleGenerativeAI } = require("@google/generative-ai");
const dotenv = require("dotenv");
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function listModels() {
  try {
    const modelList = await genAI.listModels(); // This might not be available in all SDK versions
    console.log("Models:", JSON.stringify(modelList, null, 2));
  } catch (e) {
    // If listModels is not supported, try common names
    console.error("Error listing models:", e.message);
  }
}

listModels();
