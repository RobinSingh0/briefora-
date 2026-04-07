import * as admin from "firebase-admin";
import axios from "axios";
import * as dotenv from "dotenv";
import Parser from "rss-parser";

dotenv.config();

// Use the local project ID
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: "briefly-32a26"
  });
}
const db = admin.firestore();

const guardianKey = process.env.GUARDIAN_API_KEY || "0a84d37d-fec7-4394-83e1-97c692b87a50";
const ollamaKey = process.env.OLLAMA_API_KEY || "e6182ff5a9274d6f908afe50904fad08.o8sfUqAZS1yN8qaX_CakLs26";

interface BBCArticle {
  title: string;
  link: string;
  pubDate: string;
  contentSnippet: string;
  content?: string;
  isoDate: string;
}

async function runSyncOnce() {
  console.log("🚀  MANUAL BACKEND TEST - START");

  const normalizedArticles: any[] = [];

  // 1. Fetch from Guardian
  try {
    const url = "https://content.guardianapis.com/search";
    const gResponse = await axios.get(url, {
      params: {
        "api-key": guardianKey,
        "show-fields": "bodyText,thumbnail,trailText",
        "page-size": 5,
        "order-by": "newest",
        "section": "technology|business|science|world",
      },
    });

    const articles = gResponse.data.response.results;
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

      // 2. Summarize
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

      // 3. Write to Firestore
      const docId = Buffer.from(article.url).toString("base64").replace(/[/+=]/g, "_").slice(0, 128);
      await db.collection("news").doc(docId).set({
        title: article.title,
        summary,
        imageUrl: article.imageUrl || `https://picsum.photos/seed/${docId}/800/1400`,
        category: article.category,
        sourceUrl: article.url,
        source: article.source,
        timestamp: admin.firestore.Timestamp.fromDate(new Date(article.date)),
        createdAt: admin.firestore.Timestamp.now(),
      });
      console.log(`   ✅  Saved to Firestore: ${docId}`);
    } catch (err: any) {
      console.error(`   ❌  Failed to process article: ${err.message}`);
    }
  }

  console.log("\n🏁  MANUAL SYNC COMPLETE.");
}

runSyncOnce().catch(err => console.error("FATAL:", err));
