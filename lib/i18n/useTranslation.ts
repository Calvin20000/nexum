import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { translations } from './translations';

export type LanguageId = 'ja' | 'en' | 'zh-Hans' | 'zh-Hant';
export const SELECTED_LANGUAGE_KEY = 'selected_language';

let currentLanguage: LanguageId = 'ja';
const listeners: (() => void)[] = [];

export function setLanguage(lang: LanguageId) {
  currentLanguage = lang;
  AsyncStorage.setItem(SELECTED_LANGUAGE_KEY, lang);
  listeners.forEach(l => l());
}

export function useTranslation() {
  const [lang, setLang] = useState<LanguageId>(currentLanguage);

  useEffect(() => {
    AsyncStorage.getItem(SELECTED_LANGUAGE_KEY).then((val) => {
      if (val) {
        currentLanguage = val as LanguageId;
        setLang(val as LanguageId);
      }
    });
    const listener = () => setLang(currentLanguage);
    listeners.push(listener);
    return () => {
      const idx = listeners.indexOf(listener);
      if (idx > -1) listeners.splice(idx, 1);
    };
  }, []);

  const t = (key: keyof typeof translations['ja']) => {
    return translations[lang]?.[key] ?? translations['ja'][key];
  };

  return { t, lang };
}
