import React, { useState } from 'react';
import { 
  View, 
  StyleSheet, 
  TextInput, 
  Pressable, 
  Platform, 
  KeyboardAvoidingView, 
  ScrollView, 
  ImageBackground,
  StatusBar,
  TouchableOpacity,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  OAuthProvider,
  signInWithCredential
} from 'firebase/auth';
import * as Linking from 'expo-linking';
import * as Google from 'expo-auth-session/providers/google';
import * as AppleAuthentication from 'expo-apple-authentication';
import { auth } from '../services/firebase';
import { Typography } from '../components/Typography';
import { Theme } from '../theme/theme';

export const LoginScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isSocialLoading, setIsSocialLoading] = useState(false);

  // Google Auth Request
  const [request, response, promptAsync] = Google.useAuthRequest({
    androidClientId: 'YOUR_ANDROID_CLIENT_ID',
    iosClientId: 'YOUR_IOS_CLIENT_ID',
    webClientId: 'YOUR_WEB_CLIENT_ID',
  });

  React.useEffect(() => {
    if (response?.type === 'success') {
      const { id_token } = response.params;
      const credential = GoogleAuthProvider.credential(id_token);
      handleSocialSignIn(credential);
    }
  }, [response]);

  const handleAuth = async () => {
    setIsLoading(true);
    setError('');
    try {
      if (isLoginMode) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
      navigation.replace('Feed');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialSignIn = async (credential: any) => {
    setIsSocialLoading(true);
    try {
      await signInWithCredential(auth, credential);
      navigation.replace('Feed');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSocialLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    promptAsync();
  };

  const handleAppleLogin = async () => {
    if (Platform.OS !== 'ios') {
      setError('Apple Sign-In is only available on iOS devices.');
      return;
    }
    try {
      const appleCredential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      const { identityToken } = appleCredential;
      if (identityToken) {
        const provider = new OAuthProvider('apple.com');
        const credential = provider.credential({
          idToken: identityToken,
        });
        handleSocialSignIn(credential);
      }
    } catch (e: any) {
      if (e.code !== 'ERR_CANCELED') {
        setError(e.message);
      }
    }
  };

  const openLegal = (url: string) => {
    Linking.openURL(url);
  };

  return (
    <ImageBackground 
      source={{ uri: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1400&auto=format&fit=crop' }} 
      style={styles.backgroundImage}
      resizeMode="cover"
    >
      <View style={styles.overlay}>
        <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
          <KeyboardAvoidingView 
            style={styles.container} 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <View style={styles.glassWrapper}>
              <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
              <View style={styles.card}>
                <View style={styles.header}>
                  <Typography variant="brand" color={Theme.colors.onSurface} style={styles.logo}>Briefora</Typography>
                  <View style={styles.logoDot} />
                </View>
                
                <Typography variant="h3" color={Theme.colors.onSurface} style={styles.welcomeText}>
                  {isLoginMode ? 'Welcome back' : 'Create an account'}
                </Typography>
                <Typography variant="body" color={Theme.colors.onSurfaceMuted} style={styles.subtitleText}>
                  {isLoginMode ? 'Enter your credentials to continue' : 'Join our premium news community'}
                </Typography>

                <View style={styles.formContainer}>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="mail-outline" size={20} color={Theme.colors.onSurfaceVariant} style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Email address"
                      placeholderTextColor={Theme.colors.onSurfaceVariant}
                      value={email}
                      onChangeText={setEmail}
                      autoCapitalize="none"
                      keyboardType="email-address"
                    />
                  </View>

                  <View style={styles.inputWrapper}>
                    <Ionicons name="lock-closed-outline" size={20} color={Theme.colors.onSurfaceVariant} style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Password"
                      placeholderTextColor={Theme.colors.onSurfaceVariant}
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry
                    />
                  </View>
                  
                  {error ? (
                    <View style={styles.errorContainer}>
                      <Ionicons name="alert-circle-outline" size={16} color="#FF6B6B" />
                      <Typography variant="label" color="#FF6B6B" style={styles.errorText}>{error}</Typography>
                    </View>
                  ) : null}

                  <TouchableOpacity 
                    style={styles.loginButton} 
                    onPress={handleAuth}
                    activeOpacity={0.7}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <ActivityIndicator color={Theme.colors.onPrimary} />
                    ) : (
                      <Typography variant="bodyLarge" weight="bold" color={Theme.colors.onPrimary}>
                        {isLoginMode ? 'Sign In' : 'Create Account'}
                      </Typography>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity 
                    onPress={() => setIsLoginMode(!isLoginMode)} 
                    style={styles.signupButton}
                    activeOpacity={0.7}
                  >
                    <Typography variant="body" color={Theme.colors.onSurfaceMuted}>
                      {isLoginMode ? "New to Briefora? " : "Already have an account? "}
                      <Typography variant="body" weight="bold" color={Theme.colors.primary}>
                        {isLoginMode ? "Register" : "Log in"}
                      </Typography>
                    </Typography>
                  </TouchableOpacity>

                  <View style={styles.dividerContainer}>
                    <View style={styles.dividerLine} />
                    <Typography variant="label" color={Theme.colors.onSurfaceVariant} style={styles.dividerText}>OR CONTINUE WITH</Typography>
                    <View style={styles.dividerLine} />
                  </View>

                  <View style={styles.socialRow}>
                    <TouchableOpacity 
                      style={styles.socialButton} 
                      activeOpacity={0.7}
                      onPress={handleGoogleLogin}
                      disabled={!request || isSocialLoading}
                    >
                      <Ionicons name="logo-google" size={24} color="#FFFFFF" />
                    </TouchableOpacity>
                    {Platform.OS === 'ios' && (
                      <TouchableOpacity 
                        style={styles.socialButton} 
                        activeOpacity={0.7}
                        onPress={handleAppleLogin}
                        disabled={isSocialLoading}
                      >
                        <Ionicons name="logo-apple" size={24} color="#FFFFFF" />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </View>
            </View>

            <View style={styles.footer}>
              <View style={styles.legalLinksContainer}>
                <TouchableOpacity onPress={() => openLegal('https://your-website.com/privacy')} activeOpacity={0.7} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Typography variant="label" color={Theme.colors.onSurfaceVariant} style={styles.legalLinks}>
                    PRIVACY POLICY
                  </Typography>
                </TouchableOpacity>
                <Typography variant="label" color={Theme.colors.onSurfaceVariant} style={styles.legalSeparator}>  •  </Typography>
                <TouchableOpacity onPress={() => openLegal('https://your-website.com/terms')} activeOpacity={0.7} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Typography variant="label" color={Theme.colors.onSurfaceVariant} style={styles.legalLinks}>
                    TERMS OF SERVICE
                  </Typography>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>

        {isSocialLoading && (
          <View style={styles.socialOverlay}>
            <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />
            <ActivityIndicator size="large" color={Theme.colors.primary} />
            <Typography variant="bodyLarge" color={Theme.colors.onSurface} style={{ marginTop: 20 }}>
              Signing in...
            </Typography>
          </View>
        )}
      </View>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
    width: '100%',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  glassWrapper: {
    borderRadius: Theme.radii.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Theme.colors.glassBorder,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  card: {
    padding: 32,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
    paddingTop: 20, // Reduced to allow SafeAreaView to handle the top inset
  },
  logo: {
    fontSize: 42,
  },
  logoDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Theme.colors.primary,
    marginLeft: 4,
    marginTop: 14,
  },
  welcomeText: {
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitleText: {
    textAlign: 'center',
    marginBottom: 32,
  },
  formContainer: {
    gap: 16,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: Theme.radii.md,
    borderWidth: 1,
    borderColor: Theme.colors.glassBorder,
    paddingHorizontal: 16,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    color: Theme.colors.onSurface,
    paddingVertical: 16,
    fontSize: 16,
  },
  loginButton: {
    backgroundColor: Theme.colors.primary,
    padding: 18,
    borderRadius: Theme.radii.md,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: Theme.colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Theme.colors.glassBorder,
  },
  dividerText: {
    fontSize: 10,
    opacity: 0.6,
  },
  socialRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
  },
  socialButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Theme.colors.glassBorder,
  },
  footer: {
    alignItems: 'center',
    marginTop: 40,
    gap: 24,
  },
  signupButton: {
    padding: 0,
    marginTop: 4, // 16px gap in parent + 4px margin = 20px
    alignItems: 'center',
  },
  legalLinksContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  legalLinks: {
    fontSize: 10,
    letterSpacing: 1,
  },
  legalSeparator: {
    fontSize: 10,
    opacity: 0.5,
  },
  socialOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    padding: 12,
    borderRadius: Theme.radii.sm,
  },
  errorText: {
    fontSize: 12,
  },
});
