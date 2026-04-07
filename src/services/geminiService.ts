import { GoogleGenerativeAI } from "@google/generative-ai";

// Ensure your .env has EXPO_PUBLIC_GEMINI_API_KEY for Expo/Metro compatibility
const API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || "";

const genAI = new GoogleGenerativeAI(API_KEY);

export const geminiService = {
  /**
   * Generates a minimalist vector illustration for a news article.
   * @param title The title of the news article.
   * @returns Base64 string of the generated image or null if failed.
   */
  async generateNewsIllustration(title: string): Promise<string | null> {
    console.log(`[GeminiService] Attempting to generate illustration for: "${title}"`);
    
    if (!API_KEY) {
      console.warn("[GeminiService] No EXPO_PUBLIC_GEMINI_API_KEY found in process.env. Skipping image generation.");
      return null;
    }

    try {
      // Using Imagen 3 via Gemini SDK (conceptual model name, adjust as needed)
      // Check Google AI Studio for the exact enabled model name for your key
      const model = genAI.getGenerativeModel({ model: "imagen-3.0-generate-001" });

      const prompt = `Minimalist Vector Illustration representing: ${title}. 
      Style: Flat design, clean lines, vibrant modern color palette, premium tech aesthetic, no text.`;

      // The new multimodal generation config
      const result = await (model as any).generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          // This tells the model to output an image instead of text
          responseModalities: ["IMAGE"],
        },
      });

      // Extract the image data
      // Based on the latest API specs, the image will be in the parts as an inlineData or similar
      const parts = result.response.candidates[0].content.parts;
      const imagePart = parts.find((p: any) => p.inlineData && p.inlineData.mimeType.startsWith("image/"));

      if (imagePart) {
        return imagePart.inlineData.data; // This is the base64 string
      }

      console.warn("[GeminiService] No image part found in response.");
      return null;
    } catch (error: any) {
      // If the specific Imagen model isn't available for the key, 
      // we might get a 404 or 403.
      console.error("[GeminiService] Image generation failed with error:", {
        message: error?.message,
        status: error?.status,
        details: error?.response?.data
      });
      return null;
    }
  }
};
