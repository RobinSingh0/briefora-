export const Theme = {
  colors: {
    // Ground - The base of our obsidian dark mode
    surface: '#0A0A0A',
    surfaceSubtle: '#121212',
    surface_container_low: '#1C1B1B', // New: Large sections
    surface_container: '#1A1A1A',
    surface_container_high: '#2A2A2A', // New: Cards
    surface_container_highest: '#353534', // New: Active/Hover
    surface_bright: '#393939', // New: Search bars/Popovers
    
    // Primary - Electric Blue
    primary: '#ADC6FF', 
    primaryGlow: 'rgba(173, 198, 255, 0.4)',
    onPrimary: '#002E69',
    
    // Glassmorphism tokens
    glassPrimary: 'rgba(173, 198, 255, 0.1)',
    glassSecondary: 'rgba(255, 255, 255, 0.08)',
    glassBorder: 'rgba(255, 255, 255, 0.1)',
    glassSurface: 'rgba(255, 255, 255, 0.03)',
    
    // Typography
    onSurface: '#F8FAFC',
    onSurfaceMuted: '#94A3B8',
    onSurfaceVariant: '#64748B',
    
    outline: '#334155',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
    huge: 64,
  },
  radii: {
    xs: 4,
    sm: 12,
    md: 20,
    lg: 32,
    xl: 48,
    full: 9999,
  },
  fonts: {
    brand: 'PlayfairDisplay_700Bold',
    body: 'Inter_400Regular',
    medium: 'Inter_500Medium',
    bold: 'Inter_700Bold',
  }
};
