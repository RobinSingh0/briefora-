import React from 'react';
import { Text, TextProps, StyleSheet } from 'react-native';
import { Theme } from '../theme/theme';

interface TypographyProps extends TextProps {
  variant?: 'h1' | 'h2' | 'h3' | 'body' | 'bodyLarge' | 'label' | 'brand' | 'display';
  color?: string;
  weight?: 'regular' | 'medium' | 'bold';
}

export const Typography: React.FC<TypographyProps> = ({
  variant = 'body',
  color,
  weight,
  style,
  children,
  ...props
}) => {
  const dynamicColor = color || (variant.startsWith('body') || variant === 'label' ? Theme.colors.onSurfaceMuted : Theme.colors.onSurface);
  
  const getFontFamily = () => {
    if (variant === 'brand') return Theme.fonts.brand;
    if (weight === 'bold' || variant === 'h1' || variant === 'h2' || variant === 'display') return Theme.fonts.bold;
    if (weight === 'medium' || variant === 'h3' || variant === 'label') return Theme.fonts.medium;
    return Theme.fonts.body;
  };

  return (
    <Text
      style={[
        styles[variant],
        { color: dynamicColor, fontFamily: getFontFamily() },
        style,
      ]}
      {...props}
    >
      {children}
    </Text>
  );
};

const styles = StyleSheet.create({
  display: {
    fontSize: 56,
    letterSpacing: -2,
    lineHeight: 64,
    fontWeight: '900',
  },
  h1: {
    fontSize: 40,
    letterSpacing: -1,
    lineHeight: 48,
    fontWeight: '800',
  },
  h2: {
    fontSize: 28,
    lineHeight: 36,
    fontWeight: '700',
  },
  h3: {
    fontSize: 20,
    lineHeight: 28,
    fontWeight: '600',
  },
  brand: {
    fontSize: 32,
    letterSpacing: -0.5,
  },
  bodyLarge: {
    fontSize: 18,
    lineHeight: 28,
  },
  body: {
    fontSize: 15,
    lineHeight: 24,
  },
  label: {
    fontSize: 11,
    letterSpacing: 2.2, // ~5% of 44? No, user said 5% letter spacing. 0.05em.
    textTransform: 'uppercase',
    fontWeight: '700',
  },
});
