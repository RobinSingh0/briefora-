import React, { useEffect } from 'react';
import { View, StyleSheet, StatusBar } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Typography } from '../components/Typography';
import { Theme } from '../theme/theme';

export const SplashScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  useEffect(() => {
    // Simulate loading/checking auth
    const timer = setTimeout(() => {
      navigation.replace('Login');
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.mainContent}>
        <Typography variant="brand" color="#FFFFFF" style={styles.logoText}>
          Briefora
        </Typography>
        <Typography variant="label" color="rgba(255,255,255,0.4)" style={styles.subText}>
          BY RONIN
        </Typography>
      </View>

      <View style={styles.footer}>
        <View style={styles.separator} />
        <Typography variant="label" color="rgba(255,255,255,0.3)" style={styles.version}>
          V1.0.0
        </Typography>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'space-between',
    paddingVertical: 60,
  },
  mainContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: {
    fontSize: 120, // 32 base * 2.5 = 80 * 1.5 = 120
    marginBottom: 8,
  },
  subText: {
    letterSpacing: 4,
    fontSize: 10,
  },
  footer: {
    alignItems: 'center',
    gap: 16,
  },
  separator: {
    height: 1,
    width: 80,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  version: {
    fontSize: 9,
    letterSpacing: 2,
  },
});
