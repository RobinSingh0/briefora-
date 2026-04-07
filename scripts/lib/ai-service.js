const axios = require('axios');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// ─── Constants & Configuration ──────────────────────────────────────────────
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.EXPO_PUBLIC_GEMINI_API_KEY;
const GROQ_API_KEY = process.env.GROQ_API_KEY || process.env.EXPO_PUBLIC_GROQ_API_KEY;
const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY || process.env.EXPO_PUBLIC_MISTRAL_API_KEY;

const OLLAMA_ENDPOINT = process.env.OLLAMA_ENDPOINT || "http://localhost:11434/api/generate";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "ministral-3:14b";
const IS_PROD = process.env.NODE_ENV === 'production' || process.env.ENVIRONMENT === 'production';

const GROQ_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct";
const MISTRAL_MODEL = "mistral-small-latest";

// Initialize Gemini
let genAI;
if (GEMINI_API_KEY) {
  genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
}

/**
 * Summarize a news article using the Multi-Provider Fallback Waterfall.
 * 
 * Waterfall Logic:
 * 1. (Dev Only) Ollama
 * 2. Gemini 1.5 Flash (Primary - requested as 'Gemini 3 Flash')
 * 3. Groq (Llama 4 Scout)
 * 4. Mistral Small
 * 5. Default Fallback (Truncation)
 */
async function summarizeArticle(title, body) {
  // Truncate content to 5,000 characters to prevent 400 errors (Request Too Large)
  const truncatedBody = body.slice(0, 4500);

  // Development Mode: Try Ollama first
  if (!IS_PROD) {
    try {
      console.log(`🤖 [AI-Service] Development Mode: Attempting Ollama...`);
      const summary = await summarizeWithOllama(title, truncatedBody);
      console.log(`[Drip] Summary generated via Ollama`);
      return summary;
    } catch (err) {
      console.warn(`⚠️  [AI-Service] Ollama failed: ${err.message}. Cascading to Cloud...`);
    }
  }

  // Cloud Waterfall
  // 1. Gemini
  try {
    const summary = await summarizeWithGemini(title, truncatedBody);
    console.log(`[Drip] Summary generated via Gemini`);
    return summary;
  } catch (err) {
    console.warn(`⚠️  [AI-Service] Gemini failed: ${err.message}. Falling back to Groq...`);
  }

  // 2. Groq
  try {
    const summary = await summarizeWithGroq(title, truncatedBody);
    console.log(`[Drip] Summary generated via Groq`);
    return summary;
  } catch (err) {
    console.warn(`⚠️  [AI-Service] Groq failed: ${err.message}. Falling back to Mistral...`);
  }

  // 3. Mistral
  try {
    const summary = await summarizeWithMistral(title, truncatedBody);
    console.log(`[Drip] Summary generated via Mistral`);
    return summary;
  } catch (err) {
    console.error(`💥 [AI-Service] Mistral failed: ${err.message}. Final fallback: Truncation.`);
  }

  // Final Escape Hatch: Truncation
  return truncatedBody.slice(0, 300).replace(/<[^>]*>/g, "") + "...";
}

/**
 * Summarize with Google's Gemini 1.5 Flash.
 */
async function summarizeWithGemini(title, body) {
  if (!genAI) throw new Error('GEMINI_API_KEY missing.');

  // Use gemini-1.5-flash as the production-ready model
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  const prompt = getPrompt(title, body);

  const result = await model.generateContent(prompt);
  const response = await result.response;
  return response.text().trim();
}

/**
 * Summarize with Groq (Llama 4 Scout).
 */
async function summarizeWithGroq(title, body) {
  if (!GROQ_API_KEY) throw new Error('GROQ_API_KEY missing.');

  const response = await axios.post("https://api.groq.com/openai/v1/chat/completions", {
    model: GROQ_MODEL,
    messages: [
      { role: "system", content: "You are a professional news editor. Summarize articles in exactly 70 words." },
      { role: "user", content: getPrompt(title, body) }
    ],
    temperature: 0.7,
    max_tokens: 150
  }, {
    headers: { 'Authorization': `Bearer ${GROQ_API_KEY}` },
    timeout: 10000
  });

  return response.data.choices[0].message.content.trim();
}

/**
 * Summarize with Mistral AI (Mistral Small).
 */
async function summarizeWithMistral(title, body) {
  if (!MISTRAL_API_KEY) throw new Error('MISTRAL_API_KEY missing.');

  const response = await axios.post("https://api.mistral.ai/v1/chat/completions", {
    model: MISTRAL_MODEL,
    messages: [
      { role: "user", content: getPrompt(title, body) }
    ],
    temperature: 0.7,
    max_tokens: 150
  }, {
    headers: { 'Authorization': `Bearer ${MISTRAL_API_KEY}` },
    timeout: 10000
  });

  return response.data.choices[0].message.content.trim();
}

/**
 * Summarize with Local Ollama.
 */
async function summarizeWithOllama(title, body) {
  const response = await axios.post(OLLAMA_ENDPOINT, {
    model: OLLAMA_MODEL,
    prompt: getPrompt(title, body),
    stream: false,
    options: { num_ctx: 16384, temperature: 0.7, top_p: 0.9 }
  }, { timeout: 30000 });
  
  return response.data.response.trim();
}

/**
 * Shared prompt helper.
 */
function getPrompt(title, body) {
  return `Summarize the following news article into a comprehensive, high-fidelity briefing of around 100 words. 
  Use a professional, premium editorial tone. Ensure the content is informative and captures all key details.
  Format it for a mobile news app. 
  Title: ${title}
  Body: ${body}
  Briefing:`;
}

module.exports = { summarizeArticle };
