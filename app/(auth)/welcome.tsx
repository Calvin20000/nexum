import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { CheckCircle } from 'lucide-react-native';
import { Colors } from '@/lib/colors';
import { useAuthStore } from '@/stores/authStore';

const GREEN = '#22C55E';

function FeatureRow({ text }: { text: string }) {
  return (
    <View style={styles.featureRow}>
      <CheckCircle size={24} color={GREEN} />
      <Text style={styles.featureText}>{text}</Text>
    </View>
  );
}

export default function WelcomeScreen() {
  const { session, loading } = useAuthStore();

  useEffect(() => {
    if (!loading && session) {
      router.replace('/(tabs)/friends');
    }
  }, [session, loading]);

  return (
    <LinearGradient
      colors={[Colors.primary, Colors.secondary, Colors.accent]}
      style={styles.gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <SafeAreaView style={styles.safe}>
        <View style={styles.container}>
          <View style={styles.logoSection}>
            <Image
              source={require('@/assets/images/nexum_front_ copy.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
            <Text style={styles.appName}>NEXUM</Text>
            <Text style={styles.tagline} numberOfLines={1} adjustsFontSizeToFit>
              広告なしで広がる友達。広がる世界。
            </Text>
          </View>

          <View style={styles.features}>
            <FeatureRow text="リアルタイムチャット" />
            <FeatureRow text="広告なし、プライバシー優先" />
          </View>

          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => router.push('/(auth)/register')}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryBtnText}>はじめる</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={() => router.push('/(auth)/login')}
              activeOpacity={0.85}
            >
              <Text style={styles.secondaryBtnText}>ログイン</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  safe: { flex: 1 },
  container: {
    flex: 1,
    paddingHorizontal: 32,
    justifyContent: 'space-between',
    paddingTop: 48,
    paddingBottom: 48,
  },
  logoSection: {
    alignItems: 'center',
    gap: 14,
  },
  logoImage: {
    width: 160,
    height: 160,
    borderRadius: 32,
  },
  appName: {
    fontSize: 48,
    fontWeight: '800',
    color: Colors.white,
    letterSpacing: 6,
  },
  tagline: {
    fontSize: 18,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
  },
  features: {
    gap: 20,
    paddingHorizontal: 8,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  featureText: {
    fontSize: 16,
    color: Colors.white,
    fontWeight: '500',
  },
  actions: { gap: 12 },
  primaryBtn: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  primaryBtnText: {
    color: Colors.primary,
    fontSize: 17,
    fontWeight: '700',
  },
  secondaryBtn: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.6)',
  },
  secondaryBtnText: {
    color: Colors.white,
    fontSize: 17,
    fontWeight: '600',
  },
});
