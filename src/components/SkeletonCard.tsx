import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Theme } from '../theme/theme';

// Remove static dimensions

export const SkeletonCard = () => {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const opacity = useRef(new Animated.Value(0.3)).current;

  const shimmerTranslate = useRef(new Animated.Value(-1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(shimmerTranslate, {
        toValue: 1,
        duration: 1500,
        useNativeDriver: true,
      })
    ).start();
  }, [shimmerTranslate]);

  const translateX = shimmerTranslate.interpolate({
    inputRange: [-1, 1],
    outputRange: [-windowWidth, windowWidth],
  });

  return (
    <View style={[
      styles.skeleton, 
      { height: windowWidth > 1000 ? 380 : windowHeight * 0.65 }
    ]}>
      <Animated.View 
        style={[
          StyleSheet.absoluteFill,
          { transform: [{ translateX }] }
        ]}
      >
        <LinearGradient
          colors={['transparent', 'rgba(255,255,255,0.08)', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
      <View style={styles.content}>
        <View style={styles.tagSkeleton} />
        <View style={styles.titleSkeleton} />
        <View style={styles.titleSkeletonLong} />
        <View style={styles.summarySkeleton} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  skeleton: {
    width: '100%',
    borderRadius: Theme.radii.lg,
    backgroundColor: Theme.colors.surface_container,
    borderWidth: 1,
    borderColor: Theme.colors.glassBorder,
    justifyContent: 'flex-end',
    padding: 24,
  },
  content: {
    gap: 16,
  },
  tagSkeleton: {
    width: 60,
    height: 18,
    borderRadius: 4,
    backgroundColor: Theme.colors.surface_bright,
  },
  titleSkeleton: {
    width: '85%',
    height: 28,
    borderRadius: 4,
    backgroundColor: Theme.colors.surface_bright,
  },
  titleSkeletonLong: {
    width: '60%',
    height: 28,
    borderRadius: 4,
    backgroundColor: Theme.colors.surface_bright,
  },
  summarySkeleton: {
    width: '95%',
    height: 48,
    borderRadius: 4,
    backgroundColor: Theme.colors.surface_bright,
  },
});
