import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { FeedScreen } from '../screens/FeedScreen';
import { Theme } from '../theme/theme';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { StyleSheet, View, Platform } from 'react-native';

const Tab = createBottomTabNavigator();

const GlassTabBarBackground = () => (
  <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />
);

export const MainTabs = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          position: 'absolute',
          borderTopWidth: 0,
          elevation: 0,
          height: 85,
          paddingBottom: 25,
          paddingTop: 10,
          backgroundColor: Platform.OS === 'ios' ? 'transparent' : 'rgba(10, 10, 10, 0.8)',
        },
        tabBarBackground: Platform.OS === 'ios' ? GlassTabBarBackground : undefined,
        tabBarActiveTintColor: Theme.colors.primary,
        tabBarInactiveTintColor: Theme.colors.onSurfaceVariant,
        tabBarLabelStyle: {
          fontFamily: Theme.fonts.medium,
          fontSize: 11,
          marginTop: 2,
        },
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: any;

          if (route.name === 'Home') iconName = focused ? 'home' : 'home-outline';
          // else if (route.name === 'Settings') iconName = focused ? 'settings' : 'settings-outline';

          return (
            <View style={focused ? styles.activeIconContainer : null}>
              <Ionicons name={iconName} size={24} color={color} />
              {focused && <View style={styles.iconGlow} />}
            </View>
          );
        },
      })}
    >
      <Tab.Screen 
        name="Home" 
        component={FeedScreen} 
        initialParams={{ category: 'Breaking News' }}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  activeIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconGlow: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Theme.colors.primaryGlow,
    zIndex: -1,
  }
});
