import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { Platform } from 'react-native';

// Populated from google-services.json (Android App config)
const firebaseConfig = {
  apiKey: "AIzaSyBgx_28o_ZuN773NlYw2IHPo4BmOBhzJHc",
  authDomain: "briefly-32a26.firebaseapp.com",
  projectId: "briefly-32a26",
  storageBucket: "briefly-32a26.firebasestorage.app",
  messagingSenderId: "1078538872618",
  appId: "1:1078538872618:android:4341101b3abfb1e9cae053"
};

const app = initializeApp(firebaseConfig);

// Initialize Auth based on platform
let auth: any;

if (Platform.OS === 'web') {
  // Web: uses default browser persistence (indexedDB/localStorage)
  auth = getAuth(app);
} else {
  // Native: uses AsyncStorage persistence
  const { initializeAuth, getReactNativePersistence } = require('firebase/auth');
  const AsyncStorage = require('@react-native-async-storage/async-storage').default;
  
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
}

export { auth };
export const db = getFirestore(app);
export const storage = getStorage(app);
