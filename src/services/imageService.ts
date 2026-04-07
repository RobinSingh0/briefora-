import axios from 'axios';
import { XMLParser } from 'fast-xml-parser';

const PEXELS_API_KEY = '8tTUXBaHixqWwDvsZcjxkp6HJMKcLCG0mcsgwkPWS1EBOsBierSqjPXS'; // Fallback if env fails
const GOOGLE_NEWS_RSS = 'https://news.google.com/rss/search?q=';

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '',
});

export const imageService = {
  /**
   * Priority 1: The Scraper (og:image)
   * Fetches the article HTML and extracts the Open Graph image meta tag.
   */
  async getOgImage(url: string): Promise<string | null> {
    try {
      console.log(`[ImageService] Scraping OG image for: ${url}`);
      const response = await axios.get(url, { 
        timeout: 8000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
          'Accept-Language': 'en-US,en',
          'Referer': 'https://www.google.com/',
          'Cache-Control': 'no-cache'
        }
      });
      const html = response.data;

      // Simple regex for og:image
      const ogImageMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ||
                           html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);

      if (ogImageMatch && ogImageMatch[1]) {
        return ogImageMatch[1];
      }
      return null;
    } catch (error) {
      console.warn(`[ImageService] OG Scraping failed:`, error);
      return null;
    }
  },

  /**
   * Priority 2: Google News Search
   * Searches for the title in Google News RSS and extracts the first image candidate.
   */
  async getGoogleNewsImage(title: string): Promise<string | null> {
    try {
      console.log(`[ImageService] Searching Google News for: ${title}`);
      const searchUrl = `${GOOGLE_NEWS_RSS}${encodeURIComponent(title)}&hl=en-US&gl=US&ceid=US:en`;
      const response = await axios.get(searchUrl, { timeout: 5000 });
      const jsonObj = parser.parse(response.data);
      const items = jsonObj.rss?.channel?.item || [];

      if (items.length > 0) {
        // Try to find an image in the first few items
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
      console.warn(`[ImageService] Google News search failed:`, error);
      return null;
    }
  },

  /**
   * Priority 3: Contextual Stock (Pexels)
   * Uses the Pexels API to fetch a high-res stock photo.
   */
  async getPexelsImage(title: string, category: string): Promise<string | null> {
    try {
      console.log(`[ImageService] Fetching Pexels stock for: ${title} (${category})`);
      // Use category and title keywords for better relevance
      const query = `${category} ${title.split(' ').slice(0, 3).join(' ')}`.trim();
      
      const response = await axios.get(`https://api.pexels.com/v1/search`, {
        params: {
          query: query,
          per_page: 1,
          orientation: 'landscape'
        },
        headers: {
          Authorization: PEXELS_API_KEY
        },
        timeout: 5000
      });

      if (response.data.photos && response.data.photos.length > 0) {
        return response.data.photos[0].src.large || response.data.photos[0].src.medium;
      }
      return null;
    } catch (error) {
      console.warn(`[ImageService] Pexels fetch failed:`, error);
      return null;
    }
  }
};
