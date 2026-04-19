const { GoogleGenerativeAI } = require('@google/generative-ai');
const he = require('he');

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
function cleanInputText(text) {
  if (!text) return "";
  return text
    .replace(/\[\.\.\.\]/g, "") 
    .replace(/\(read more\)/gi, "")
    .replace(/Read more\.\.\./gi, "")
    .replace(/Continue reading\.\.\./gi, "")
    .replace(/\ssource\s.*$/i, "")
    // Strip site navigation boilerplate
    .replace(/The homepage|Navigation Button|Hamburger Menu|Logo|Main Menu|Sign In|Subscribe|Navigation Drawer/gi, "")
    .replace(/The Verge\s+The Verge/g, "The Verge")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Summarize a news article using Gemini.
 */
async function summarizeArticle(title, body) {
  const truncatedBody = body.slice(0, 4500);

  try {
    const result = await summarizeWithGemini(title, truncatedBody);
    console.log(`[Drip] Summary generated via Gemini`);
    return result;
  } catch (err) {
    console.error(`💥 [AI-Service] AI call failed: ${err.message}`);
    // Use first 280 chars of body as a fallback excerpt instead of a generic error
    const cleanFallback = cleanInputText(body.replace(/<[^>]*>/g, '')).slice(0, 280).trim();
    const fallbackSummary = cleanFallback.length > 40
      ? cleanFallback + (cleanFallback.length === 280 ? '…' : '')
      : title;
    return {
      summary: fallbackSummary,
      image_keyword: title.split(" ").slice(0, 2).join(",")
    };
  }
}

function stripHTML(text) {
  if (!text) return "";
  const decoded = decodeHTMLEntities(text);
  return decoded.replace(/<[^>]*>?/gm, "").trim();
}

function decodeHTMLEntities(text) {
  if (!text) return "";
  try {
    // Robust decoding using the 'he' library
    return he.decode(text);
  } catch (err) {
    console.warn("Decoding failed, falling back to original text", err);
    return text;
  }
}

async function summarizeWithGemini(title, body) {
  if (!genAI) throw new Error('GEMINI_API_KEY missing.');

  const modelOptions = [
    "gemini-1.5-flash",
    "gemini-2.0-flash-lite",
    "gemini-2.0-flash",
    "gemini-1.5-pro"
  ];
  let lastError;

  for (const modelId of modelOptions) {
    try {
      console.log(`🤖 [AI] Attempting with model: ${modelId}`);
      const model = genAI.getGenerativeModel({ 
        model: modelId,
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 150,
          responseMimeType: "application/json"
        }
      });

      
      const cleanTitle = stripHTML(title);
      const cleanBody = cleanInputText(stripHTML(body));

      const prompt = `You are an expert, engaging news editor. Your job is to read the provided article and write a beautiful, captivating summary.

STRICT RULES:
1. Length: You MUST write EXACTLY three (3) sentences. No more, no less.
2. Tone & Style: Write beautiful, flowing prose that is incredibly easy to understand (8th-grade reading level). Make it engaging, factual, and punchy.
3. Format: Write one single paragraph. Do NOT use bullet points, lists, or introductory/closing filler phrases.
4. Clean Content: Ignore any site logos, navigation menus, or social media buttons that might appear in the provided text.
5. RULE: Never output HTML entities, unicode codes, or web tags (like &rsquo; or &mdash;). Convert everything to standard text punctuation.
6. JSON Output: Return a JSON object with two fields: "summary" (the 3-sentence prose) and "image_keyword" (1-2 words for illustration).

<article_text>
Title: ${cleanTitle}
Content: ${cleanBody}
</article_text>`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text().trim();
      
      // Basic extraction if SDK returns markdown-wrapped JSON
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : text);

      return {
          summary: decodeHTMLEntities(parsed.summary || "").trim(),
          image_keyword: parsed.image_keyword || "news"
      };
    } catch (err) {
      if (err.message.includes("429") || err.message.includes("Quota")) {
        console.warn(`⏳ [AI] Rate limited (15 RPM). Pausing for 5 seconds...`);
        await new Promise(r => setTimeout(r, 5000));
        // We'll retry the same model once if it's a 429, otherwise move to next model
        continue; 
      }
      console.warn(`⚠️ [AI] Model ${modelId} failed: ${err.message}`);
      lastError = err;
      continue;
    }
  }


  throw lastError || new Error('All models failed');
}


module.exports = { summarizeArticle };
