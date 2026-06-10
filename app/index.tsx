import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { supabase } from '@/lib/supabase';

export default function Index() {
  const [session, setSession] = useState<any>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => setChecked(true), 3000);

    supabase.auth.getSession().then(({ data: { session } }) => {
      clearTimeout(timeout);
      setSession(session);
      setChecked(true);
    }).catch(() => {
      clearTimeout(timeout);
      setChecked(true);
    });

    return () => clearTimeout(timeout);
  }, []);

  if (!checked) {
    return (
      <View style={styles.container}>
        <View style={styles.logoContainer}>
          <Text style={styles.logoText}>NEXUM</Text>
          <View style={styles.divider} />
          <Text style={styles.tagline}>広告なしで広がる友達。広がる世界</Text>
        </View>
        <View style={styles.footer}>
          <ActivityIndicator size="small" color="rgba(255,255,255,0.7)" />
        </View>
      </View>
    );
  }

  if (session) {
    return <Redirect href="/(tabs)/friends" />;
  }

  return <Redirect href="/(auth)/welcome" />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D47A1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  logoText: {
    fontSize: 52,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 8,
  },
  divider: {
    width: 40,
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.4)',
    borderRadius: 1,
  },
  tagline: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    letterSpacing: 1,
    fontWeight: '400',
  },
  footer: {
    paddingBottom: 60,
  },
});
