import axios from 'axios';
import { XMLParser } from 'fast-xml-parser';

const PEXELS_API_KEY = '8tTUXBaHixqWwDvsZcjxkp6HJMKcLCG0mcsgwkPWS1EBOsBierSqjPXS';
const GOOGLE_NEWS_RSS = 'https://news.google.com/rss/search?q=';

const HUMAN_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Cache-Control': 'no-cache',
  'Pragma': 'no-cache',
};

const COMMON_TIMEOUT = 8000;

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '',
});

let lastGoogleErrorTime = 0;
const GOOGLE_COOLDOWN_MS = 15000; // 15 seconds cooldown on 503/429

export const imageService = {
  /**
   * Priority 1: The Scraper (og:image)
   */
  async getOgImage(url: string): Promise<string | null> {
    try {
      console.log(`[ImageService] Scraping OG image for: ${url}`);
      const response = await axios.get(url, { 
        timeout: COMMON_TIMEOUT,
        headers: {
          ...HUMAN_HEADERS,
          'Referer': 'https://www.google.com/',
        }
      });
      const html = response.data;

      const ogImageMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ||
                           html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);

      if (ogImageMatch && ogImageMatch[1]) {
        return ogImageMatch[1];
      }
      return null;
    } catch (error) {
      console.warn(`[ImageService] OG Scraping failed for ${url}:`, (error as any).message);
      return null;
    }
  },

  /**
   * Priority 2: Google News Search
   */
  async getGoogleNewsImage(title: string): Promise<string | null> {
    try {
      // 🛡️ Circuit Breaker: Check for active cooldown
      const now = Date.now();
      if (now - lastGoogleErrorTime < GOOGLE_COOLDOWN_MS) {
        const remaining = Math.ceil((GOOGLE_COOLDOWN_MS - (now - lastGoogleErrorTime)) / 1000);
        console.log(`[ImageService] Skipping Google News (Cooldown: ${remaining}s)`);
        return null;
      }

      // Increased Jitter (500-2500ms) to spread batch requests across a wider window
      const jitter = Math.floor(Math.random() * 2000) + 500;
      await new Promise(resolve => setTimeout(resolve, jitter));

      console.log(`[ImageService] Searching Google News for: ${title}`);
      const searchUrl = `${GOOGLE_NEWS_RSS}${encodeURIComponent(title)}&hl=en-US&gl=US&ceid=US:en`;
      
      const response = await axios.get(searchUrl, { 
        timeout: COMMON_TIMEOUT,
        headers: HUMAN_HEADERS
      });
      
      const jsonObj = parser.parse(response.data);
      const items = jsonObj.rss?.channel?.item || [];

      if (items.length > 0) {
        for (const item of items.slice(0, 3)) {
          const description = item.description || '';
          const imgMatch = description.match(/<img[^>]+src=["']([^"']+)["']/i);
          if (imgMatch && imgMatch[1]) {
            return imgMatch[1];
          }
        }
      }
      return null;
    } catch (error) {
      const axiosError = error as any;
      const status = axiosError.response?.status;
      
      if (status === 503 || status === 429) {
        console.warn(`[ImageService] Google rate limited (Status ${status}). Entering ${GOOGLE_COOLDOWN_MS / 1000}s cooldown.`);
        lastGoogleErrorTime = Date.now();
      } else {
        console.warn(`[ImageService] Google News search failed:`, axiosError.message);
      }
      return null;
    }
  },

  /**
   * Priority 3: Contextual Stock (Pexels)
   */
  async getPexelsImage(title: string, category: string): Promise<string | null> {
    try {
      console.log(`[ImageService] Fetching Pexels stock for: ${title} (${category})`);
      const query = `${category} ${title.split(' ').slice(0, 3).join(' ')}`.trim();
      
      const response = await axios.get(`https://api.pexels.com/v1/search`, {
        params: {
          query: query,
          per_page: 1,
          orientation: 'landscape'
        },
        headers: {
          ...HUMAN_HEADERS,
          Authorization: PEXELS_API_KEY
        },
        timeout: COMMON_TIMEOUT
      });

      if (response.data.photos && response.data.photos.length > 0) {
        return response.data.photos[0].src.large || response.data.photos[0].src.medium;
      }
      return null;
    } catch (error) {
      console.warn(`[ImageService] Pexels fetch failed:`, (error as any).message);
      return null;
    }
  }
};
