import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import { Image } from 'expo-image';
import { Theme } from '../theme/theme';
import { Typography } from './Typography';
import { imageService } from '../services/imageService';
import { newsService } from '../services/newsService';
import { Ionicons } from '@expo/vector-icons';

interface FadeInImageProps {
  newsId: string;
  uri?: string;
  articleUrl?: string;
  title: string;
  category?: string;
  style?: any;
}

const WATERFALL_PRIORITIES = [
  'ORIGINAL',
  'SCRAPER',
  'GOOGLE_SEARCH',
  'PEXELS',
  'PLACEHOLDER'
];

export const FadeInImage: React.FC<FadeInImageProps> = ({ 
  newsId,
  uri, 
  articleUrl,
  title,
  category, 
  style 
}) => {
  const [currentUri, setCurrentUri] = useState<string | undefined>(uri);
  const [waterfallIndex, setWaterfallIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const shimmerAnim = useRef(new Animated.Value(0.3)).current;
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isSyncingRef = useRef(false);

  // Animate shimmer loop
  useEffect(() => {
    if (isLoading) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(shimmerAnim, { toValue: 0.7, duration: 800, useNativeDriver: true }),
          Animated.timing(shimmerAnim, { toValue: 0.3, duration: 800, useNativeDriver: true })
        ])
      ).start();
    }
  }, [isLoading, shimmerAnim]);

  // --- URL Validation & Logging (User Request 2) ---
  useEffect(() => {
    if (currentUri) {
      console.log(`[Image] Loading News ID ${newsId}: ${currentUri}`);
    }
  }, [currentUri, newsId]);

  const processUrl = (url: string | undefined): string | undefined => {
    if (!url) return undefined;
    // Enforce HTTPS (User Request 2)
    if (url.startsWith('http://')) {
      return url.replace('http://', 'https://');
    }
    return url;
  };

  // Handle Waterfall Rotation
  const rotateWaterfall = useCallback(async () => {
    const nextIndex = waterfallIndex + 1;
    if (nextIndex >= WATERFALL_PRIORITIES.length) {
      setIsLoading(false);
      return;
    }

    setWaterfallIndex(nextIndex);
    let newUrl: string | null = null;

    try {
      switch (WATERFALL_PRIORITIES[nextIndex]) {
        case 'SCRAPER':
          if (articleUrl) newUrl = await imageService.getOgImage(articleUrl);
          break;
        case 'GOOGLE_SEARCH':
          newUrl = await imageService.getGoogleNewsImage(title);
          break;
        case 'PEXELS':
          newUrl = await imageService.getPexelsImage(title, category || 'news');
          break;
        case 'PLACEHOLDER':
          setIsLoading(false);
          return;
      }

      if (newUrl) {
        const safeUrl = processUrl(newUrl);
        console.log(`[Waterfall] Priority ${WATERFALL_PRIORITIES[nextIndex]} succeeded: ${safeUrl}`);
        setCurrentUri(safeUrl);
        // Persist the finding if it's not the original and we haven't synced it yet
        if (!isSyncingRef.current) {
          isSyncingRef.current = true;
          newsService.updateImageUrl(newsId, newUrl, category || 'WORLD');
        }
      } else {
        // Continue to next priority immediately if this one failed
        rotateWaterfall();
      }
    } catch (err) {
      console.warn(`[Waterfall] Error in priority ${WATERFALL_PRIORITIES[nextIndex]}:`, err);
      rotateWaterfall();
    }
  }, [waterfallIndex, articleUrl, title, category, newsId]);

  // Timeout logic (User Request: Faster Waterfall 2.5s)
  useEffect(() => {
    // 🛡️ [Instant Fallback] If no URI provided, skip the ORIGINAL step immediately
    if (isLoading && !currentUri && waterfallIndex === 0) {
      console.log(`[Waterfall] No original image for ${newsId}. Skipping to next priority...`);
      rotateWaterfall();
      return;
    }

    if (isLoading && WATERFALL_PRIORITIES[waterfallIndex] !== 'PLACEHOLDER') {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        console.log(`[Waterfall] Timeout (2.5s) reached for priority: ${WATERFALL_PRIORITIES[waterfallIndex]}`);
        rotateWaterfall();
      }, 2500);
    }
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [waterfallIndex, isLoading, rotateWaterfall, currentUri, newsId]);

  const handleLoad = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsLoading(false);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  };

  const handleError = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    console.log(`[Image Error] Failed to load URL: ${currentUri}. Rotating waterfall...`);
    rotateWaterfall();
  };

  const getCategoryIcon = (cat?: string): any => {
    switch (cat?.toUpperCase()) {
      case 'PROGRAMMING': return 'code-slash';
      case 'TECH': return 'hardware-chip';
      case 'AI': return 'bulb';
      case 'SCIENCE': return 'flask';
      case 'BUSINESS': return 'stats-chart';
      case 'SPORTS': return 'basketball';
      case 'GAMING': return 'game-controller';
      case 'ENTERTAINMENT': return 'film';
      case 'EDUCATION': return 'school';
      case 'WORLD': return 'globe';
      case 'INDIA': return 'map';
      default: return 'newspaper';
    }
  };

  const renderPlaceholder = () => (
    <View style={styles.placeholderContainer}>
      <View style={styles.placeholderGlass}>
        <Ionicons 
          name={getCategoryIcon(category)} 
          size={32} 
          color="rgba(255,255,255,0.6)" 
        />
        <Typography variant="label" color="#FFFFFF" style={styles.placeholderText}>
          {category?.toUpperCase() || 'NEWS'}
        </Typography>
        <Typography variant="brand" color="rgba(255,255,255,0.4)" style={styles.placeholderLogo}>
          Briefora
        </Typography>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, style]}>
      {isLoading && (
        <Animated.View 
          style={[
            StyleSheet.absoluteFill, 
            styles.shimmer, 
            { opacity: shimmerAnim }
          ]} 
        />
      )}
      
      {(!currentUri || WATERFALL_PRIORITIES[waterfallIndex] === 'PLACEHOLDER') ? (
        renderPlaceholder()
      ) : (
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: fadeAnim }]}>
          <Image
            source={{ uri: processUrl(currentUri) }}
            style={StyleSheet.absoluteFill}
            contentFit="cover" // User Request 4: resizeMode 'cover'
            onLoad={handleLoad}
            onError={handleError}
            cachePolicy="memory-disk"
          />
        </Animated.View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#333', // User Request 1: Temporary debug background
    overflow: 'hidden',
  },
  shimmer: {
    backgroundColor: Theme.colors.surface_bright,
  },
  placeholderContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Theme.colors.surface_container_low,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderGlass: {
    padding: 24,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    gap: 12,
  },
  placeholderText: {
    fontSize: 14,
    letterSpacing: 4,
    fontWeight: 'bold',
  },
  placeholderLogo: {
    fontSize: 20,
    marginTop: 8,
  }
});
