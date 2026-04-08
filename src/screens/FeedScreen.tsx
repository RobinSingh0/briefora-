import React, { useEffect, useState, useMemo, useRef } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  Platform,
  TouchableOpacity,
  StatusBar,
  RefreshControl,
  useWindowDimensions,
  FlatList,
  ScrollView,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { VirtuosoGrid } from 'react-virtuoso';

import { Typography } from '../components/Typography';
import { Theme } from '../theme/theme';
import { newsService, NewsItem } from '../services/newsService';
import { SkeletonCard } from '../components/SkeletonCard';
import { FadeInImage } from '../components/FadeInImage';
import { db } from '../services/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import PagerView from 'react-native-pager-view';

// Remove static dimensions as they are not reactive
// const { height: windowHeight, width: windowWidth } = Dimensions.get('window');

const CATEGORIES = ['Breaking', 'World', 'India', 'Tech', 'AI', 'Business', 'Science', 'Sports', 'Entertainment', 'Gaming', 'Programming', 'Education'];

const formatTimeAgo = (timestamp: any) => {
  if (!timestamp) return 'JUST NOW';
  const date = new Date(timestamp);
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  
  if (seconds < 60) return 'JUST NOW';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} MINUTES AGO`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} HOURS AGO`;
  const days = Math.floor(hours / 24);
  return `${days} DAYS AGO`;
};

const getSourceText = (source: any): string => {
  if (!source) return 'UNKNOWN SOURCE';
  if (typeof source === 'string') return source;
  if (typeof source === 'object') {
    if (source.name) return String(source.name);
    if (source.title) return String(source.title);
  }
  return String(source);
};

const CategorySelector = ({ 
  activeCategory, 
  onSelect,
  loading
}: { 
  activeCategory: string; 
  onSelect: (category: string) => void;
  loading: boolean;
}) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.4, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true })
      ])
    ).start();
  }, [pulseAnim]);

  return (
    <View style={styles.categoryContainer}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoryBarContainer}
        keyboardShouldPersistTaps="handled"
      >
        {CATEGORIES.map((category) => (
          <TouchableOpacity
            key={category}
            activeOpacity={0.8}
            onPress={() => onSelect(category)}
            disabled={loading}
            style={[
              styles.categoryPill,
              activeCategory === category && styles.categoryPillActive,
              loading && { opacity: 0.5 }
            ]}
          >
            <Typography
              variant="label"
              color={activeCategory === category ? '#FFFFFF' : Theme.colors.onSurfaceVariant}
              style={[
                styles.categoryText,
                activeCategory === category && { fontWeight: '800' }
              ]}
            >
              {category.toUpperCase()}
            </Typography>
            {category === 'Breaking' && (
              <Animated.View style={[
                styles.pulseDot, 
                { opacity: pulseAnim, transform: [{ scale: pulseAnim }] }
              ]} />
            )}
            {activeCategory === category && loading && (
              <ActivityIndicator size="small" color="#FFFFFF" style={{ marginLeft: 6 }} />
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const FeedHeader = ({ 
  onSettings,
}: { 
  onSettings: () => void; 
}) => {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
      <View style={styles.logoContainer}>
        <Typography variant="brand" color={Theme.colors.onSurface} style={styles.headerLogo}>
          Briefora
        </Typography>
        <View style={styles.logoDot} />
      </View>

      <TouchableOpacity onPress={onSettings} style={styles.headerIconButton}>
        <Ionicons name="settings-outline" size={24} color={Theme.colors.onSurface} />
      </TouchableOpacity>
    </View>
  );
};

const NewsCardBase = ({ item, index, onPress, disabled }: { item: NewsItem; index: number; onPress: () => void; disabled?: boolean }) => {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const imageUrl = useMemo(() => item.imageUrl || '', [item.imageUrl]);

  // User Request 2: URL Validation Logic
  useEffect(() => {
    console.log(`Loading Image for ${item.title.substring(0, 20)}...:`, item.imageUrl);
  }, [item.imageUrl, item.title]);

  // Staggered Height Logic: Alternating between 0.65 and 0.55 of window height
  const cardHeight = windowWidth > 1000 
    ? 420 
    : index % 3 === 0 ? windowHeight * 0.7 : windowHeight * 0.55;

  return (
    <TouchableOpacity activeOpacity={0.9} onPress={onPress} disabled={disabled} style={{ flex: 1 }}>
      <View style={[
        styles.cardContainer,
        { height: cardHeight }
      ]}>
        <FadeInImage
          newsId={item.id}
          uri={imageUrl}
          articleUrl={item.sourceUrl}
          title={item.title}
          style={StyleSheet.absoluteFill}
          category={item.category}
        />
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.2)', 'rgba(0,0,0,0.95)']}
          style={styles.cardGradient}
        >
            <View style={styles.cardContent}>
              <View style={styles.cardTagRow}>
                <View style={[styles.categoryTag, { backgroundColor: Theme.colors.primary }]}>
                  <Typography variant="label" color={Theme.colors.onPrimary}>
                    {(item.category || 'NEWS').toUpperCase()}
                  </Typography>
                </View>
                <View style={styles.sourceTag}>
                  <Typography variant="label" color="#FFFFFF" style={{ fontWeight: 'bold' }}>
                    {getSourceText(item.source).toUpperCase()}
                  </Typography>
                </View>
                <Typography variant="label" color="rgba(255,255,255,0.5)" style={styles.cardMeta}>
                  {formatTimeAgo(item.timestamp)}
                </Typography>
              </View>
              
              <Typography 
                variant="h2" 
                color="#FFFFFF" 
                style={styles.cardTitle} 
                numberOfLines={3}
              >
                {item.title}
              </Typography>
              
              <Typography variant="body" color="rgba(255,255,255,0.7)" style={styles.cardSummary} numberOfLines={2}>
                {item.summary}
              </Typography>

              {item.keywords && item.keywords.length > 0 && (
                <View style={styles.keywordRow}>
                  {item.keywords.slice(0, 3).map((word, idx) => (
                    <View key={idx} style={styles.keywordTag}>
                      <Typography variant="label" color="rgba(255,255,255,0.6)" style={{ fontSize: 9 }}>
                        #{word.toUpperCase()}
                      </Typography>
                    </View>
                  ))}
                </View>
              )}
              
              <View style={styles.readMoreRow}>
                <Typography variant="label" color={Theme.colors.primary} style={{ letterSpacing: 1.5, fontSize: 10 }}>
                  READ MORE
                </Typography>
                <Ionicons name="arrow-forward" size={12} color={Theme.colors.primary} />
              </View>
            </View>
          </LinearGradient>
      </View>
    </TouchableOpacity>
  );
};

const NewsCard = React.memo(NewsCardBase);

export const FeedScreen: React.FC<{ navigation: any; route?: any; initialCategory?: string }> = ({ navigation, route, initialCategory }) => {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  
  const [activeCategory, setActiveCategory] = useState(route?.params?.category || initialCategory || 'Breaking');
  const [data, setData] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);
  const [lastDoc, setLastDoc] = useState<any>(null);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const skeletonFadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (loading) {
      Animated.timing(skeletonFadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
      Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start();
    } else {
      Animated.timing(skeletonFadeAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start();
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
    }
  }, [loading]);
  
  const scrollY = React.useRef(new Animated.Value(0)).current;
  const listRef = React.useRef<FlatList>(null);

  const fetchData = async (force = false) => {
    if (!force && data.length === 0) setLoading(true);
    if (!force && data.length > 0) setIsSwitching(true);
    
    try {
      // 1. Attempt to load from cache first
      if (!force) {
        const cachedArticles = await newsService.fetchNewsFromCache(activeCategory);
        if (cachedArticles && cachedArticles.length > 0) {
          setData(cachedArticles);
          setLoading(false); // Stop loading indicator immediately if caching succeeds
        }
      }

      // 2. Fetch fresh data from Firestore
      const { articles, lastVisible } = await newsService.fetchNews(activeCategory, null, force);
      
      // Prevent UI jump if payload matches perfectly? Just set it. Flatlist memoization works well.
      setData(articles);
      setLastDoc(lastVisible);
    } catch (error) {
      console.error(`Failed to fetch ${activeCategory}:`, error);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setIsSwitching(false);
    }
  };

  const fetchMoreData = async () => {
    if (isFetchingMore || !lastDoc || loading || isSwitching) return;
    setIsFetchingMore(true);
    console.log('[FeedScreen] Triggering onEndReached fetchMoreData...');
    try {
      const { articles, lastVisible } = await newsService.fetchNews(activeCategory, lastDoc, false);
      if (articles.length > 0) {
        setData(prev => {
          // Prevent duplicates
          const newIds = new Set(articles.map(a => a.id));
          const filteredPrev = prev.filter(a => !newIds.has(a.id));
          return [...filteredPrev, ...articles];
        });
        setLastDoc(lastVisible);
      } else {
        setLastDoc(null);
      }
    } catch (error) {
      console.error(`Failed to fetch more ${activeCategory}:`, error);
    } finally {
      setIsFetchingMore(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeCategory]);

  // Real-time metadata listener per category
  const lastSyncRef = useRef<number>(Date.now());
  
  useEffect(() => {
    const unsub = onSnapshot(doc(db, '_metadata', 'sync_status'), (snap) => {
      if (snap.exists()) {
        const metadata = snap.data();
        const syncTime = metadata.last_sync?.toMillis?.() || 0;
        const lastCategory = metadata.last_category || '';
        
        console.log(`[Sync] Metadata change detected. Category: ${lastCategory}, Time: ${new Date(syncTime).toLocaleTimeString()}`);
        
        // 🛡️ [Performance] Only refresh if it's the current category AND the sync is newer than our mount/last fetch
        if (lastCategory.toUpperCase() === activeCategory.toUpperCase() && syncTime > lastSyncRef.current) {
          console.log(`[Sync] 🚀 New data detected for ACTIVE category ${activeCategory}. Flowing in fresh news...`);
          lastSyncRef.current = syncTime;
          fetchData(true);
        }
      }
    });
    return () => unsub();
  }, [activeCategory]);

  // Header Animation Configuration
  const HEADER_HEIGHT = 140; // Reduced from 160 to pull content closer (User Request 1)
  
  const headerTranslate = scrollY.interpolate({
    inputRange: [0, HEADER_HEIGHT],
    outputRange: [0, -HEADER_HEIGHT],
    extrapolate: 'clamp',
  });
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, HEADER_HEIGHT / 2],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  const fabOpacity = scrollY.interpolate({
    inputRange: [150, 200],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const numColumns = useMemo(() => (windowWidth > 1000 ? 3 : 1), [windowWidth]);

  // Combined View with Transition Support
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      
      {/* 🏙️ SKELETON LAYER (Showing during load/switch) */}
      <Animated.ScrollView 
        pointerEvents={loading ? 'auto' : 'none'}
        style={[
          styles.skeletonGrid, 
          { 
            position: 'absolute', 
            top: 0, left: 0, right: 0, bottom: 0, 
            paddingTop: HEADER_HEIGHT + insets.top,
            opacity: skeletonFadeAnim,
            zIndex: loading ? 50 : 0
          }
        ]}
      >
        <View style={styles.gridContainer}>
          {[1, 2, 3, 4, 5].map(i => (
            <View key={i} style={[styles.skeletonWrapper, { width: windowWidth > 1000 ? '31%' : '100%' }]}>
              <SkeletonCard />
            </View>
          ))}
        </View>
      </Animated.ScrollView>

      {/* 📰 CONTENT LAYER */}
      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        <Animated.FlatList
          ref={listRef}
          data={data}
          keyExtractor={(item) => item.id}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: true }
          )}
          scrollEventThrottle={16}
          initialNumToRender={10}
          windowSize={11}
          maxToRenderPerBatch={5}
          updateCellsBatchingPeriod={30}
          removeClippedSubviews={Platform.OS === 'android'}
          onEndReachedThreshold={2}
          getItemLayout={(_, index) => {
            const isTablet = windowWidth > 1000;
            if (isTablet) {
              const rowHeight = 420;
              return {
                length: rowHeight,
                offset: rowHeight * Math.floor(index / 3),
                index,
              };
            }
            
            // Mobile staggered heights: [0.7H, 0.55H, 0.55H]
            const h0 = windowHeight * 0.7 + 20;
            const h1 = windowHeight * 0.55 + 20;
            const cycleSum = h0 + 2 * h1;
            const cycleIndex = Math.floor(index / 3);
            const remainder = index % 3;
            
            let offset = cycleIndex * cycleSum;
            if (remainder === 1) offset += h0;
            if (remainder === 2) offset += h0 + h1;
            
            return {
              length: remainder === 0 ? h0 : h1,
              offset,
              index,
            };
          }}
          contentContainerStyle={{ paddingBottom: 120, paddingTop: HEADER_HEIGHT + insets.top }}
          renderItem={({ item, index }) => (
            <View style={{ padding: 10 }}>
              <NewsCard 
                item={item} 
                index={index}
                disabled={loading || refreshing || isNavigating}
                onPress={() => {
                  if (loading || refreshing || isNavigating) return;
                  setIsNavigating(true);
                  navigation.navigate('Details', { item });
                  setTimeout(() => setIsNavigating(false), 1000);
                }} 
              />
            </View>
          )}
          numColumns={numColumns}
          key={`${numColumns}-${activeCategory}`} 
          onEndReached={fetchMoreData}
          ListFooterComponent={isFetchingMore ? (
            <View style={{ marginVertical: 20, paddingHorizontal: 10 }}>
              <View style={{ height: windowWidth > 1000 ? 420 : windowHeight * 0.55 }}>
                <SkeletonCard />
              </View>
            </View>
          ) : null}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={() => { 
                  setRefreshing(true); 
                  fetchData(true); 
              }} 
              tintColor={Theme.colors.primary} 
              colors={[Theme.colors.primary]}
            />
          }
        />
      </Animated.View>

      <Animated.View style={[
        styles.animatedHeader,
        { transform: [{ translateY: headerTranslate }], opacity: headerOpacity }
      ]}>
        <FeedHeader onSettings={() => navigation.navigate('Settings')} />
        <CategorySelector 
          activeCategory={activeCategory} 
          loading={loading || refreshing || isSwitching}
          onSelect={(cat) => {
            if (loading || refreshing || isSwitching) return;
            setActiveCategory(cat);
            listRef.current?.scrollToOffset({ offset: 0, animated: true });
          }} 
        />
      </Animated.View>

      <Animated.View 
        style={[styles.fab, { opacity: fabOpacity, transform: [{ scale: fabOpacity }] }]}
      >
        <TouchableOpacity 
          onPress={() => listRef.current?.scrollToOffset({ offset: 0, animated: true })} 
          style={styles.fabButton} 
          activeOpacity={0.8}
        >
          <Ionicons name="arrow-up" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.surface,
  },
  animatedHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    backgroundColor: Theme.colors.surface,
    paddingBottom: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerLogo: {
    fontSize: 26,
  },
  logoDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Theme.colors.primary,
    marginLeft: 2,
    marginTop: 8,
  },
  headerIconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Theme.colors.glassSurface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Theme.colors.glassBorder,
  },
  categoryContainer: {
    paddingBottom: 16,
  },
  categoryBarContainer: {
    paddingHorizontal: 20,
    gap: 10,
    alignItems: 'center',
  },
  categoryPill: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: Theme.radii.full,
    backgroundColor: Theme.colors.surface_container_low,
    borderWidth: 1,
    borderColor: Theme.colors.glassBorder,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryPillActive: {
    backgroundColor: Theme.colors.primary,
    borderColor: Theme.colors.primary,
  },
  categoryText: {
    fontSize: 12,
    letterSpacing: 0.5,
    fontFamily: Theme.fonts.medium,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#ff3b30',
    marginLeft: 6,
  },
  gridContainer: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 24,
    justifyContent: 'flex-start',
  },
  gridItem: {
    marginBottom: 24,
  },
  skeletonGrid: {
    paddingHorizontal: 20,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 24,
  },
  skeletonWrapper: {
    marginBottom: 24,
  },
  cardContainer: {
    width: '100%',
    borderRadius: Theme.radii.lg,
    overflow: 'hidden',
    backgroundColor: '#333', // User Request 1: Temporary debug background
    // Borders prohibited by No-Line Rule
  },
  cardGradient: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: 24,
  },
  cardContent: {
    gap: 16,
  },
  cardTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  categoryTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    marginRight: 12,
  },
  cardMeta: {
    fontSize: 10,
    opacity: 0.6,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '800',
    lineHeight: 26,
  },
  cardSummary: {
    fontSize: 15,
    lineHeight: 22,
    opacity: 0.8,
  },
  readMoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  virtuosoList: {
    // Custom class if needed
  },
  virtuosoItem: {
    // Custom class if needed
  },
  keywordRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  keywordTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  sourceTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 30,
    zIndex: 1000,
  },
  fabButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(67, 56, 202, 0.7)', // Indigo-700 with opacity
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});

