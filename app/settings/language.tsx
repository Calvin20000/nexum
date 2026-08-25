import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ChevronLeft, Check } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setLanguage } from '@/lib/i18n/useTranslation';
import { Colors } from '@/lib/colors';
import { useColors } from '@/lib/theme';

const SELECTED_LANGUAGE_KEY = 'selected_language';
const LANGUAGES = [
  { id: 'ja', label: '日本語', sub: 'Japanese' },
  { id: 'en', label: 'English', sub: '英語' },
  { id: 'zh-Hans', label: '简体中文', sub: '中国語（簡体字）' },
  { id: 'zh-Hant', label: '繁體中文', sub: '中国語（繁体字）' },
];

export default function LanguageScreen() {
  const C = useColors();
  const [selected, setSelected] = useState('ja');

  useEffect(() => {
    AsyncStorage.getItem(SELECTED_LANGUAGE_KEY).then((val) => {
      if (val) setSelected(val);
    });
  }, []);

  const handleSelect = async (id: string) => {
    setSelected(id);
    setLanguage(id as any);
    await AsyncStorage.setItem(SELECTED_LANGUAGE_KEY, id);
    setTimeout(() => router.back(), 300);
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.background }]}>
      <View style={[styles.header, { backgroundColor: C.white }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft size={24} color={C.primary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: C.primary }]}>使用言語</Text>
        <View style={{ width: 40 }} />
      </View>
      <View style={styles.list}>
        {LANGUAGES.map((lang) => (
          <TouchableOpacity
            key={lang.id}
            style={[styles.item, { backgroundColor: C.white }]}
            onPress={() => handleSelect(lang.id)}
            activeOpacity={0.7}
          >
            <View>
              <Text style={[styles.label, { color: C.textPrimary }]}>{lang.label}</Text>
              <Text style={[styles.sub, { color: Colors.textSecondary }]}>{lang.sub}</Text>
            </View>
            {selected === lang.id && <Check size={20} color={C.primary} />}
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.separator,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 18, fontWeight: '700' },
  list: { marginTop: 16 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.separator,
  },
  label: { fontSize: 16, fontWeight: '600' },
  sub: { fontSize: 13, marginTop: 2 },
});
