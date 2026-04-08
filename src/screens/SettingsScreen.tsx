import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Platform,
  Alert,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { NotificationManager } from '../services/notificationManager';
import { auth, db } from '../services/firebase';
import { Typography } from '../components/Typography';
import { Theme } from '../theme/theme';

interface SettingsSection {
  title: string;
  items: SettingsItem[];
}

interface SettingsItem {
  id: string;
  label: string;
  subtitle?: string;
  type: 'toggle' | 'arrow' | 'destructive' | 'info';
  value?: boolean;
  icon: keyof typeof Ionicons.glyphMap;
}

export const SettingsScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const user = auth.currentUser;
  const [notifications, setNotifications] = useState(true);
  const [breakingNews, setBreakingNews] = useState(true);


  const handleSignOut = () => {
    if (Platform.OS === 'web') {
      const confirmed = window.confirm('Are you sure you want to sign out?');
      if (confirmed) doSignOut();
    } else {
      Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: doSignOut },
      ]);
    }
  };

  const doSignOut = async () => {
    try {
      await signOut(auth);
      navigation.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      });
    } catch (error) {
      console.error('Error signing out: ', error);
    }
  };

  const handleToggleUpdate = async (id: string, newValue: boolean) => {
    if (id === 'notif') {
      setNotifications(newValue);
      if (newValue) {
        await NotificationManager.requestPermissions();
      }
    } else if (id === 'breaking') {
      setBreakingNews(newValue);
      if (newValue) {
        await NotificationManager.requestPermissions();
      }
    }

    if (user?.uid) {
      try {
        const userDoc = doc(db, 'users', user.uid);
        await updateDoc(userDoc, {
          [id === 'notif' ? 'pushNotificationsEnabled' : 'breakingNewsEnabled']: newValue,
          updatedAt: new Date(),
        }).catch(async (err) => {
          // If doc doesn't exist, create it
          if (err.code === 'not-found') {
            await setDoc(userDoc, {
              email: user.email,
              pushNotificationsEnabled: id === 'notif' ? newValue : notifications,
              breakingNewsEnabled: id === 'breaking' ? newValue : breakingNews,
              updatedAt: new Date(),
            });
          }
        });
      } catch (err) {
        console.error('Firestore update error:', err);
      }
    }
  };

  const avatarLetter = user?.email?.[0]?.toUpperCase() ?? 'U';
  const memberSince = user?.metadata?.creationTime
    ? new Date(user.metadata.creationTime).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : 'Recently';

  const sections: SettingsSection[] = [
    {
      title: 'Notifications',
      items: [
        { id: 'notif', label: 'Push Notifications', subtitle: 'Get alerts for top stories', type: 'toggle', value: notifications, icon: 'notifications-outline' },
        { id: 'breaking', label: 'Breaking News', subtitle: 'Instant alerts for major events', type: 'toggle', value: breakingNews, icon: 'flash-outline' },
      ],
    },
  ];

  const toggleFor = (id: string) => {
    if (id === 'notif') return [notifications, (v: boolean) => handleToggleUpdate('notif', v)] as const;
    if (id === 'breaking') return [breakingNews, (v: boolean) => handleToggleUpdate('breaking', v)] as const;
    return [false, () => {}] as const;
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7} style={styles.headerIconButton}>
          <Ionicons name="arrow-back" size={24} color={Theme.colors.onSurface} />
        </TouchableOpacity>
        <Typography variant="h2" weight="bold" color={Theme.colors.onSurface} style={styles.headerTitle}>
          Settings
        </Typography>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Card */}
        <View style={styles.profileWrapper}>
          <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
          <View style={styles.profileCard}>
            <LinearGradient
              colors={[Theme.colors.primary, '#818CF8']}
              style={styles.avatar}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Typography variant="h1" color="#FFFFFF" style={styles.avatarText}>
                {avatarLetter}
              </Typography>
            </LinearGradient>
            <View style={styles.profileInfo}>
              <Typography variant="h3" weight="bold" color={Theme.colors.onSurface}>
                {user?.email?.split('@')[0] ?? 'User'}
              </Typography>
              <Typography variant="body" color={Theme.colors.onSurfaceMuted}>
                {user?.email ?? 'user@example.com'}
              </Typography>
              <View style={styles.badgeRow}>
                <View style={styles.planBadge}>
                  <Typography variant="label" color={Theme.colors.primary} style={styles.planText}>
                    FREE MEMBER
                  </Typography>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Upgrade Banner */}
        <TouchableOpacity activeOpacity={0.7}>
          <LinearGradient
            colors={[Theme.colors.primary, '#4338CA']}
            style={styles.upgradeBanner}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0.5 }}
          >
            <View style={styles.upgradeContent}>
              <View style={styles.upgradeTextContainer}>
                <Typography variant="h2" color="#FFFFFF" weight="bold">
                  Go Premium ✦
                </Typography>
                <Typography variant="body" color="rgba(255,255,255,0.8)">
                  Ad-free, offline reading & more
                </Typography>
              </View>
              <Ionicons name="chevron-forward" size={24} color="#FFFFFF" />
            </View>
          </LinearGradient>
        </TouchableOpacity>

        {/* Settings Sections */}
        {sections.map((section) => (
          <View key={section.title} style={styles.section}>
            <Typography variant="label" color={Theme.colors.onSurfaceVariant} style={styles.sectionTitle}>
              {section.title}
            </Typography>
            <View style={styles.sectionCard}>
              {section.items.map((item, idx) => {
                const isLast = idx === section.items.length - 1;
                const [val, setVal] = toggleFor(item.id);
                return (
                  <View key={item.id}>
                    <TouchableOpacity
                      style={styles.settingsRow}
                      activeOpacity={item.type === 'toggle' || item.type === 'info' ? 1 : 0.7}
                      onPress={() => {
                        if (item.type === 'toggle') setVal(!val);
                      }}
                    >
                      <View style={styles.rowLeft}>
                        <View style={styles.iconContainer}>
                          <Ionicons name={item.icon} size={20} color={Theme.colors.onSurfaceMuted} />
                        </View>
                        <View style={styles.rowTexts}>
                          <Typography variant="bodyLarge" color={Theme.colors.onSurface} weight="medium">
                            {item.label}
                          </Typography>
                          {item.subtitle ? (
                            <Typography variant="body" color={Theme.colors.onSurfaceVariant}>
                              {item.subtitle}
                            </Typography>
                          ) : null}
                        </View>
                      </View>
                      {item.type === 'toggle' && (
                        <Switch
                          value={val}
                          onValueChange={(v) => setVal(v)}
                          trackColor={{ false: Theme.colors.surface_bright, true: Theme.colors.primary }}
                          thumbColor="#FFFFFF"
                          ios_backgroundColor={Theme.colors.surface_bright}
                        />
                      )}
                      {item.type === 'arrow' && (
                        <Ionicons name="chevron-forward" size={18} color={Theme.colors.onSurfaceVariant} />
                      )}
                      {item.type === 'info' && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <Typography variant="body" color={Theme.colors.onSurfaceVariant}>
                            {item.subtitle?.split(' ')[0]}
                          </Typography>
                        </View>
                      )}
                    </TouchableOpacity>
                    {!isLast && <View style={styles.separator} />}
                  </View>
                );
              })}
            </View>
          </View>
        ))}

        {/* Version & Sign Out */}
        <View style={styles.footerActions}>
          <Typography variant="label" color={Theme.colors.onSurfaceVariant} style={styles.versionText}>
            Version 1.0.0
          </Typography>

          <Typography variant="label" color={Theme.colors.onSurfaceVariant} style={styles.byRoninText}>
            BY RONIN
          </Typography>
          
          <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut} activeOpacity={0.7}>
            <Ionicons name="log-out-outline" size={20} color="#F87171" />
            <Typography variant="bodyLarge" weight="bold" color="#F87171">
              Sign Out
            </Typography>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.surface,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 60 : 48,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  headerIconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Theme.colors.glassSurface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Theme.colors.glassBorder,
  },
  headerTitle: {
    fontSize: 20,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 60,
    gap: 32,
  },
  profileWrapper: {
    borderRadius: Theme.radii.lg,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: Theme.colors.glassBorder,
  },
  profileCard: {
    padding: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Theme.colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  avatarText: {
    fontSize: 32,
  },
  profileInfo: {
    flex: 1,
    gap: 4,
  },
  badgeRow: {
    flexDirection: 'row',
    marginTop: 8,
  },
  planBadge: {
    backgroundColor: Theme.colors.primaryGlow,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: Theme.radii.full,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.3)',
  },
  planText: {
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  upgradeBanner: {
    padding: 24,
    borderRadius: Theme.radii.lg,
    shadowColor: Theme.colors.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 10,
  },
  upgradeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  upgradeTextContainer: {
    gap: 4,
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    paddingLeft: 4,
    letterSpacing: 2,
    fontSize: 11,
  },
  sectionCard: {
    backgroundColor: Theme.colors.glassSurface,
    borderRadius: Theme.radii.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Theme.colors.glassBorder,
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 18,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Theme.colors.surface_bright,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rowTexts: {
    flex: 1,
    gap: 2,
  },
  separator: {
    height: 1,
    backgroundColor: Theme.colors.glassBorder,
    marginLeft: 76,
  },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: 'rgba(248, 113, 113, 0.1)',
    borderRadius: Theme.radii.lg,
    paddingVertical: 18,
    borderWidth: 1,
    borderColor: 'rgba(248, 113, 113, 0.2)',
  },
  footerActions: {
    gap: 16,
    paddingBottom: 40,
  },
  versionText: {
    textAlign: 'center',
    opacity: 0.5,
    letterSpacing: 1,
  },
  byRoninText: {
    textAlign: 'center',
    opacity: 0.8,
    letterSpacing: 4,
    fontSize: 10,
    marginTop: 8,
    marginBottom: -4,
  },
});
