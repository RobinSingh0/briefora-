import axios from 'axios';
import { XMLParser } from 'fast-xml-parser';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RSS_SOURCES, getFeedsForCategory } from '../data/sources';
import { decodeHtml } from '../utils/decode';
import he from 'he';
import { db } from './firebase';
import { doc, updateDoc, collection, query, where, orderBy, limit, startAfter, getDocs } from 'firebase/firestore';

const CACHE_EXPIRY = 30 * 60 * 1000; // 30 minutes

export interface NewsItem {
  id: string;
  title: string;
  summary: string;
  content: string;
  category: string;
  timestamp: string;
  pubDate: string;
  imageUrl?: string;
  sourceUrl: string;
  source: string;
  keywords?: string[];
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '',
  parseAttributeValue: true,
});

/**
 * Normalize the URL for consistent ID generation.
 * Strips 'www.', trailing slashes, and common query params.
 */
const normalizeUrl = (url: string): string => {
  try {
    let u = url.toLowerCase().trim();
    // Remove protocol and www.
    u = u.replace(/^(https?:\/\/)?(www\.)?/, '');
    // Remove trailing slash
    u = u.replace(/\/$/, '');
    // Remove common feed parameters (e.g., ?utm_source)
    u = u.split('?')[0];
    return u;
  } catch (e) {
    return url;
  }
};

/**
 * Generate a consistent document ID based on the URL.
 * Matches the logic in scripts/sync-news.js.
 */
const generateDocId = (url: string): string => {
  try {
    const normalized = normalizeUrl(url);
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
    let str = normalized;
    let output = '';
    for (let block = 0, charCode, i = 0, map = chars;
         str.charAt(i | 0) || (map = '=', i % 1);
         output += map.charAt(63 & block >> 8 - i % 1 * 8)) {
      charCode = str.charCodeAt(i += 3/4);
      if (charCode > 0xFF) {
        throw new Error("'btoa' failed: The string to be encoded contains characters outside of the Latin1 range.");
      }
      block = block << 8 | charCode;
    }
    return output.replace(/[/+=]/g, "").slice(0, 50);
  } catch (e) {
    return url.substring(0, 30).replace(/[^a-zA-Z0-9]/g, '');
  }
};

export const newsService = {
  async fetchNewsFromCache(category: string): Promise<NewsItem[] | null> {
    try {
      const cacheKey = `briefora_v2_${category.toLowerCase()}`;
      const cached = await AsyncStorage.getItem(cacheKey);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        // Only return if cache is not expired (using CACHE_EXPIRY from current file)
        if (Date.now() - timestamp < CACHE_EXPIRY) {
          return data;
        }
      }
      return null;
    } catch (error) {
      console.warn('Failed to load cache:', error);
      return null;
    }
  },

  async fetchNews(category: string, lastDoc: any = null, forceUpdate = false): Promise<{ articles: NewsItem[], lastVisible: any }> {
    try {
      const activeCategory = (category || '').toUpperCase();
      let q;

      const newsRef = collection(db, 'news');
      
      const isTrending = category === 'Trending' || category === 'Breaking';
      
      if (isTrending) {
          if (lastDoc) {
             q = query(newsRef, orderBy('timestamp', 'desc'), startAfter(lastDoc), limit(20));
          } else {
             q = query(newsRef, orderBy('timestamp', 'desc'), limit(20));
          }
      } else {
          if (lastDoc) {
             q = query(newsRef, where('category', '==', activeCategory), orderBy('timestamp', 'desc'), startAfter(lastDoc), limit(20));
          } else {
             q = query(newsRef, where('category', '==', activeCategory), orderBy('timestamp', 'desc'), limit(20));
          }
      }

      const snapshot = await getDocs(q);
      console.log(`Documents found for ${category}: ${snapshot.docs.length}`);
      const newLastVisible = snapshot.docs[snapshot.docs.length - 1] || null;

      const articles: NewsItem[] = snapshot.docs.map(docSnap => {
        const data = docSnap.data();
        
        // Selective Data Fetching: We exclude contentBody/fullText here for efficiency.
        // (Note: To truly reduce network size by 90% at the protocol level, 
        // the client would need to query via REST API or GraphQL since Firebase JS SDK 
        // doesn't natively support field exclusion/projection).
        return {
          id: docSnap.id,
          title: data.title,
          summary: data.summary,
          content: '', // Excluded contentBody
          category: data.category,
          timestamp: data.timestamp?.toDate ? data.timestamp.toDate().toISOString() : new Date().toISOString(),
          pubDate: data.publishDate || '',
          imageUrl: data.imageUrl,
          sourceUrl: data.sourceUrl,
          source: data.source,
          keywords: data.keywords || []
        };
      });

      // Update cache ONLY on initial fetch, not pagination
      if (!lastDoc) {
        const cacheKey = `briefora_v2_${category.toLowerCase()}`;
        await AsyncStorage.setItem(cacheKey, JSON.stringify({
          data: articles,
          timestamp: Date.now()
        })).catch(e => console.warn('Cache save error:', e));
      }

      return { articles, lastVisible: newLastVisible };
    } catch (error) {
      console.error(`Error in fetchNews for ${category}:`, error);
      throw error;
    }
  },

  async updateImageUrl(id: string, url: string, category: string): Promise<void> {
    try {
      await updateDoc(doc(db, 'news', id), { imageUrl: url });
      const cacheKey = `briefora_v2_${category.toLowerCase()}`;
      const cached = await AsyncStorage.getItem(cacheKey);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        const updated = data.map((item: any) => item.id === id ? { ...item, imageUrl: url } : item);
        await AsyncStorage.setItem(cacheKey, JSON.stringify({ data: updated, timestamp }));
      }
    } catch (e) {}
  }
};
