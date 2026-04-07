import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, Timestamp } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import axios from "axios";
import * as dotenv from "dotenv";
import Parser from "rss-parser";

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

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);

const guardianKey = process.env.GUARDIAN_API_KEY || "0a84d37d-fec7-4394-83e1-97c692b87a50";
const ollamaKey = process.env.OLLAMA_API_KEY || "e6182ff5a9274d6f908afe50904fad08.o8sfUqAZS1yN8qaX_CakLs26";
const geminiKey = process.env.GEMINI_API_KEY;

interface BBCArticle {
  title: string;
  link: string;
  pubDate: string;
  contentSnippet: string;
  content?: string;
  isoDate: string;
}

async function generateImageWithImagen(title: string): Promise<Buffer | null> {
  if (!geminiKey) {
    console.error("   ❌ GEMINI_API_KEY missing, cannot generate image.");
    return null;
  }

  try {
    const prompt = `Minimalist Vector Illustration related to: ${title}. High quality, clean design, solid background, 1024x1024.`;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict?key=${geminiKey}`;
    
    const response = await axios.post(url, {
      instances: [{ prompt }],
      parameters: { sampleCount: 1 }
    });

    const imageBase64 = response.data?.predictions?.[0]?.bytesBase64Encoded;
    if (imageBase64) {
      return Buffer.from(imageBase64, "base64");
    }
  } catch (err: any) {
    console.error(`   ⚠️   Imagen generation failed: ${err.message}`);
    if (err.response) {
      console.error(`      Response data: ${JSON.stringify(err.response.data)}`);
    }
  }
  return null;
}

async function uploadToStorage(buffer: Buffer, docId: string): Promise<string | null> {
  try {
    const storageRef = ref(storage, `news_images/${docId}.png`);
    await uploadBytes(storageRef, buffer, { contentType: "image/png" });
    const downloadURL = await getDownloadURL(storageRef);
    return downloadURL;
  } catch (err: any) {
    console.error(`   ⚠️   Storage upload failed: ${err.message}`);
  }
  return null;
}

async function populateReal() {
  console.log("🚀  MANUAL POPULATION - START");

  const normalizedArticles: any[] = [];

  // 1. Fetch from Guardian
  try {
    const url = "https://content.guardianapis.com/search";
    const res = await axios.get(url, {
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

    articles.forEach((a: any) => normalizedArticles.push({
      title: a.webTitle,
      url: a.webUrl,
      body: a.fields?.bodyText || a.fields?.trailText || "",
      imageUrl: a.fields?.thumbnail,
      category: (a.sectionId || "WORLD").toUpperCase(),
      source: "The Guardian",
      date: a.webPublicationDate
    }));
  } catch (err: any) {
    console.error("⚠️   Guardian failed:", err.message);
  }

  // 1.1 Fetch from BBC RSS
  try {
    const parser = new Parser<any, BBCArticle>();
    const feed = await parser.parseURL("https://feeds.bbci.co.uk/news/technology/rss.xml");
    console.log(`✅  BBC RSS OK - Got ${feed.items.length} articles.`);

    feed.items.forEach((a: BBCArticle) => normalizedArticles.push({
      title: a.title,
      url: a.link,
      body: a.contentSnippet || a.content || "",
      imageUrl: `https://picsum.photos/seed/${Buffer.from(a.link).toString("base64").slice(0, 10)}/800/1400`,
      category: "TECH",
      source: "BBC News",
      date: a.isoDate || a.pubDate
    }));
  } catch (err: any) {
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
      } else {
        try {
          const endpoint = "https://ollama.com/api/generate";
          const response = await axios.post(endpoint, {
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
        } catch (err: any) {
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
      await setDoc(doc(db, "news", docId), {
        title: article.title,
        summary,
        imageUrl,
        category: article.category,
        sourceUrl: article.url,
        source: article.source,
        timestamp: Timestamp.fromDate(new Date(article.date)),
        createdAt: Timestamp.now(),
      });
      console.log(`   ✅ Saved to Firestore: ${docId}`);
    } catch (err: any) {
      console.error(`   ❌ Failed to process article: ${err.message}`);
    }
  }
  
  console.log("\n🏁  Population complete. Check the web app!");
}

populateReal().catch(err => console.error("FATAL:", err));
