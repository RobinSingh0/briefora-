const { GoogleGenerativeAI } = require('@google/generative-ai');

// ─── Constants & Configuration ──────────────────────────────────────────────
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.EXPO_PUBLIC_GEMINI_API_KEY;

// Initialize Gemini
let genAI;
if (GEMINI_API_KEY) {
  genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
}

/**
 * Summarize a news article using Gemma 3 27B.
 * 
 * Logic:
 * 1. Attempt summarization with the AI model.
 * 2. If quota (429) or other transient error occurs, fallback to truncated description.
 */
async function summarizeArticle(title, body) {
  // Truncate content to 5,000 characters to prevent 400 errors (Request Too Large)
  const truncatedBody = body.slice(0, 4500);

  try {
    const summary = await summarizeWithGemini(title, truncatedBody);
    console.log(`[Drip] Summary generated via Gemini 3.1 Flash Lite`);
    return summary;
  } catch (err) {
    console.error(`💥 [AI-Service] AI call failed: ${err.message}. Returning fallback dry-text.`);
    // Robust Fallback as requested
    return "Summary currently unavailable. Click to read full story.";
  }
}

async function summarizeWithGemini(title, body) {
  if (!genAI) throw new Error('GEMINI_API_KEY missing.');

  console.log("AI Model Input:", title);

  const model = genAI.getGenerativeModel({ 
    model: "gemma-3-27b-it",
    generationConfig: {
      temperature: 0.1,
      topP: 0.8,
      topK: 40,
    },
    safetySettings: [
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
    ]
  });
  
  const prompt = `You are a news bot. Summarize the following news into exactly 3 concise bullet points. Start each bullet with a '•'. Do not write an intro. Do not write an outro. Just the 3 facts.

Title: ${title}
Body: ${body}`;

  const result = await model.generateContent(prompt);
  const response = await result.response;
  let text = response.text().trim();
  
  console.log("AI Response:", text);

  // ─── Post-Processing: Enforce 3 Clean Bullets ────────────────────────────
  // Split by common bullet markers and filter empty
  let points = text.split(/\n\s*[-*•]\s*/).filter(p => p.trim().length > 5);
  
  // If the first point was missed by split (no leading bullet), handle it
  if (points.length < 3 && !text.startsWith('-') && !text.startsWith('*')) {
     const initialLines = text.split('\n').filter(l => l.trim().length > 5);
     if (initialLines.length >= 3) points = initialLines;
  }

  // Final normalization to exactly 3 points
  points = points.slice(0, 3).map(p => p.replace(/^[-*•]\s*/, '').trim());
  
  if (points.length < 3) {
    console.warn(`⚠️ [AI] Generated only ${points.length} points. Returning concatenated lines.`);
    return points.length > 0 ? points.map(p => `• ${p}`).join('\n') : text.slice(0, 300);
  }

  return points.map(p => `• ${p}`).join('\n');
}

module.exports = { summarizeArticle };
