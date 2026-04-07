import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Theme } from '../theme/theme';

interface GlassCardProps {
  children?: React.ReactNode;
  style?: ViewStyle;
}

export const GlassCard: React.FC<GlassCardProps> = ({ children, style }) => {
  return (
    <View style={[styles.container, style]}>
      <BlurView style={StyleSheet.absoluteFill} tint="dark" intensity={50} />
      <View style={[StyleSheet.absoluteFill, styles.overlay]} />
      <View style={styles.content}>
        {children}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: Theme.radii.md,
    overflow: 'hidden',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Theme.colors.glassBorder,
  },
  overlay: {
    backgroundColor: Theme.colors.glassSurface,
  },
  content: {
    padding: Theme.spacing.md,
  },
});
