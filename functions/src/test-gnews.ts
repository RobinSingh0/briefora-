import axios from "axios";
import * as dotenv from "dotenv";
import path from "path";

// Load .env from the current directory (functions)
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const gnewsKey = process.env.GNEWS_API_KEY;

interface GNewsArticle {
  title: string;
  description: string;
  content: string;
  url: string;
  image: string;
  publishedAt: string;
  source: {
    name: string;
    url: string;
  };
}

interface GNewsResponse {
  totalArticles: number;
  articles: GNewsArticle[];
}

async function testGNews() {
  console.log("🔍 Testing GNews API Integration...");
  
  if (!gnewsKey) {
    console.error("❌ GNEWS_API_KEY is missing in .env file!");
    return;
  }

  const url = "https://gnews.io/api/v4/top-headlines";
  
  try {
    const response = await axios.get<GNewsResponse>(url, {
      params: {
        apikey: gnewsKey,
        lang: "en",
        max: 5,
      },
      timeout: 15000,
    });

    if (response.data && response.data.articles) {
      console.log(`✅ Success! Fetched ${response.data.articles.length} articles.`);
      response.data.articles.forEach((article, index) => {
        console.log(`\n[${index + 1}] ${article.title}`);
        console.log(`   Source: ${article.source.name}`);
        console.log(`   URL: ${article.url}`);
        console.log(`   Published: ${article.publishedAt}`);
      });
    } else {
      console.error("❌ Unexpected response structure:", response.data);
    }
  } catch (error: any) {
    console.error("❌ GNews API request failed:");
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Data:`, error.response.data);
    } else {
      console.error(`   Message: ${error.message}`);
    }
  }
}

testGNews();
