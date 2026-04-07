import React from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Dimensions,
  TouchableOpacity,
  Platform,
  Linking,
  StatusBar,
  Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Typography } from '../components/Typography';
import { Theme } from '../theme/theme';
import { FadeInImage } from '../components/FadeInImage';

const { width, height } = Dimensions.get('window');

export const DetailsScreen: React.FC<{ route: any; navigation: any }> = ({
  route,
  navigation,
}) => {
  const { item } = route.params;

  const handleOpenSource = () => {
    if (item.sourceUrl) {
      Linking.openURL(item.sourceUrl);
    }
  };

  const formatTimeAgo = (timestamp: any) => {
    if (!timestamp) return 'JUST NOW';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    if (seconds < 3600) return 'RECENTLY';
    if (seconds < 86400) return `${Math.floor(seconds/3600)}H AGO`;
    return `${Math.floor(seconds/86400)}D AGO`;
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Hero Image */}
      <View style={styles.heroContainer}>
        <FadeInImage 
          newsId={item.id}
          uri={item.imageUrl} 
          articleUrl={item.sourceUrl}
          title={item.title}
          category={item.category}
          style={styles.heroImage} 
        />
        <LinearGradient
          colors={['rgba(0,0,0,0.7)', 'transparent', Theme.colors.surface]}
          style={styles.heroGradient}
        />
        
        {/* Top Header Overlay */}
        <SafeAreaHeader navigation={navigation} item={item} />
      </View>

      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.contentCard}>
          <View style={styles.metaRow}>
            <Typography variant="label" color={Theme.colors.primary} style={styles.categoryText}>
              {item.category?.toUpperCase()}
            </Typography>
            <Typography variant="label" color={Theme.colors.onSurfaceVariant} style={styles.dateText}>
              {formatTimeAgo(item.timestamp)}
            </Typography>
          </View>

          <Typography 
            variant="display" 
            color={Theme.colors.onSurface} 
            style={styles.title}
            maxFontSizeMultiplier={1.2}
          >
            {item.title}
          </Typography>

          <View style={styles.sourceTag}>
            <View style={styles.sourceDot} />
            <Typography variant="label" color={Theme.colors.onSurfaceVariant} weight="bold">
              {typeof item.source === 'string' ? item.source : (item.source?.name || 'BRIEFORA EDITORIAL')}
            </Typography>
          </View>

          {/* Detailed Analysis Section (Fix 1: Glass Card) */}
          <View style={styles.analysisContainer}>
            <View style={styles.analysisGlass}>
              <View style={styles.analysisHeader}>
                <Ionicons name="sparkles" size={16} color={Theme.colors.primary} />
                <Typography variant="label" color={Theme.colors.primary} style={{ letterSpacing: 3 }}>
                  DETAILED ANALYSIS
                </Typography>
              </View>
              <Typography variant="body" color={Theme.colors.onSurface} style={styles.summaryText}>
                {item.summary}
              </Typography>
            </View>
          </View>

          {item.sourceUrl && (
            <TouchableOpacity style={styles.ctaButton} onPress={handleOpenSource} activeOpacity={0.8}>
              <LinearGradient
                colors={[Theme.colors.primary, '#4338CA']}
                style={styles.ctaGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Typography variant="bodyLarge" color={Theme.colors.onPrimary} weight="bold">
                  View Full Coverage
                </Typography>
                <Ionicons name="chevron-forward" size={20} color={Theme.colors.onPrimary} style={{ marginLeft: 8 }} />
              </LinearGradient>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const SafeAreaHeader = ({ navigation, item }: { navigation: any; item: any }) => {
  const handleShare = async () => {
    try {
      await Share.share({
        title: item.title,
        message: `${item.title}\n\nRead more at: ${item.sourceUrl}`,
        url: item.sourceUrl, // iOS only
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  return (
    <View style={styles.headerRow}>
      <TouchableOpacity 
        style={styles.backButton} 
        onPress={() => navigation.goBack()}
      >
        <BlurView intensity={25} tint="dark" style={styles.blurBack}>
          <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
        </BlurView>
      </TouchableOpacity>
      
      <View style={styles.headerTitleContainer}>
         <Typography variant="label" color="#FFFFFF" style={styles.headerCategory}>
            {(item.category || 'NEWS').toUpperCase()}
         </Typography>
      </View>

      <TouchableOpacity style={styles.backButton} onPress={handleShare}>
        <BlurView intensity={25} tint="dark" style={styles.blurBack}>
          <Ionicons name="share-outline" size={22} color="#FFFFFF" />
        </BlurView>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.surface,
  },
  heroContainer: {
    height: height * 0.45,
    width: width,
    position: 'absolute',
    top: 0,
  },
  heroImage: {
    ...StyleSheet.absoluteFillObject,
  },
  heroGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 50 : 40,
    paddingHorizontal: 20,
    zIndex: 10,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
  },
  blurBack: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  headerTitleContainer: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  headerCategory: {
    letterSpacing: 2,
    fontSize: 10,
    fontWeight: 'bold',
  },
  scrollView: {
    flex: 1,
    marginTop: height * 0.38,
  },
  scrollContent: {
    paddingBottom: 60,
  },
  contentCard: {
    backgroundColor: Theme.colors.surface,
    paddingHorizontal: 24,
    paddingTop: 32,
    minHeight: height * 0.7,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  dateText: {
    fontSize: 12,
  },
  title: {
    fontSize: 24,
    lineHeight: 31.2,
    marginBottom: 24,
  },
  sourceTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 40,
  },
  sourceDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Theme.colors.primary,
  },
  analysisContainer: {
    marginBottom: 40,
  },
  analysisGlass: {
    backgroundColor: Theme.colors.surface_container_low,
    padding: 28,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: Theme.colors.glassBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  analysisHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  summaryText: {
    lineHeight: 28,
    textAlign: 'left',
    fontSize: 16,
    letterSpacing: 0.3,
  },
  ctaButton: {
    borderRadius: Theme.radii.full,
    overflow: 'hidden',
  },
  ctaGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
  },
});
