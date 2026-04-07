import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_700Bold } from '@expo-google-fonts/inter';
import { PlayfairDisplay_700Bold } from '@expo-google-fonts/playfair-display';
import { View, ActivityIndicator, Platform } from 'react-native';
import { onAuthStateChanged } from 'firebase/auth';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { auth } from './src/services/firebase';
import { LoginScreen } from './src/screens/LoginScreen';
import { FeedScreen } from './src/screens/FeedScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { DetailsScreen } from './src/screens/DetailsScreen';
import { Theme } from './src/theme/theme';

// Only use native splash screen API on native platforms, not web
let ExpoSplashScreen: any = null;
if (Platform.OS !== 'web') {
  ExpoSplashScreen = require('expo-splash-screen');
  ExpoSplashScreen.preventAutoHideAsync();
}

const Stack = createNativeStackNavigator();

export default function App() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_700Bold,
    PlayfairDisplay_700Bold,
  });

  // null = still checking, false = not logged in, true = logged in
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsAuthenticated(!!user);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    // Hide native splash only when both fonts and auth state are ready
    if (fontsLoaded && isAuthenticated !== null) {
      if (ExpoSplashScreen) {
        ExpoSplashScreen.hideAsync();
      }
    }
  }, [fontsLoaded, isAuthenticated]);

  // Show a spinner on web while we wait; return null on native (native splash covers it)
  if (!fontsLoaded || isAuthenticated === null) {
    if (Platform.OS === 'web') {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Theme.colors.surface }}>
          <ActivityIndicator size="large" color={Theme.colors.primary} />
        </View>
      );
    }
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <NavigationContainer>
          <Stack.Navigator
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: Theme.colors.surface },
              animation: 'fade',
            }}
            initialRouteName={isAuthenticated ? 'Feed' : 'Login'}
          >
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Feed" component={FeedScreen} options={{ gestureEnabled: false }} />
            <Stack.Screen name="Settings" component={SettingsScreen} options={{ animation: 'slide_from_right' }} />
            <Stack.Screen 
              name="Details" 
              component={DetailsScreen} 
              options={{ 
                animation: 'slide_from_bottom',
              }} 
            />
          </Stack.Navigator>
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
