// import * as Notifications from 'expo-notifications'; // Moved to lazy require to avoid Expo Go errors
import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

/**
 * Lazy-loaded notifications module to avoid initialization errors in Expo Go
 */
const getNotifications = () => {
  try {
    return require('expo-notifications');
  } catch (e) {
    return null;
  }
};

export class NotificationManager {
  /**
   * Check if the current environment supports push notifications.
   * Expo Go on Android SDK 53+ does not support remote notifications.
   */
  static isSupported(): boolean {
    if (Platform.OS === 'web') return false;
    
    // In Expo Go on Android, native notifications are removed in SDK 53+
    const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
    if (Platform.OS === 'android' && isExpoGo) {
      return false;
    }
    
    return Device.isDevice;
  }

  /**
   * Request push notification permissions safely.
   */
  static async requestPermissions(): Promise<boolean> {
    if (!this.isSupported()) {
      console.log('[NotificationManager] Notifications skipped: Environment not supported (likely Expo Go or Emulator)');
      return false;
    }

    try {
      const Notifications = getNotifications();
      if (!Notifications) return false;

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      return finalStatus === 'granted';
    } catch (error) {
      console.warn('[NotificationManager] Permission request failed:', error);
      return false;
    }
  }

  /**
   * Set up notification categories and handlers.
   * This should be called early in the app lifecycle.
   */
  static async setup(): Promise<void> {
    if (!this.isSupported()) return;

    const Notifications = getNotifications();
    if (!Notifications) return;

    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  }

  /**
   * Returns a helpful message for developer debugging.
   */
  static getEnvStatus(): string {
    const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
    if (Platform.OS === 'android' && isExpoGo) {
      return 'Android Expo Go: Notifications removed in SDK 53+. Use a Development Build.';
    }
    if (!Device.isDevice) {
      return 'Emulators/Simulators do not support remote push notifications.';
    }
    return 'Environment supports notifications.';
  }
}
