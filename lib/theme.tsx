import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '@/lib/colors';

const THEME_COLOR_KEY = 'theme_color';
const DARK_MODE_KEY = 'dark_mode';
const DEFAULT_COLOR = '#0D47A1';

type ThemeContextType = {
  primaryColor: string;
  setPrimaryColor: (color: string) => void;
  isDark: boolean;
  setIsDark: (dark: boolean) => void;
};

export const ThemeContext = createContext<ThemeContextType>({
  primaryColor: DEFAULT_COLOR,
  setPrimaryColor: () => {},
  isDark: false,
  setIsDark: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

export function useColors() {
  const { primaryColor, isDark } = useTheme();
  const isLight = primaryColor === '#EEEEEE' || primaryColor === '#F9A825';
  return {
    ...Colors,
    primary: primaryColor,
    secondary: primaryColor,
    accent: primaryColor,
    surface: primaryColor + '1A',
    border: primaryColor + '44',
    textOnPrimary: isLight ? '#212121' : '#FFFFFF',
    isDark,
    background: isDark ? '#121212' : Colors.background,
    white: isDark ? '#1E1E1E' : '#FFFFFF',
    textPrimary: isDark ? '#FFFFFF' : Colors.textPrimary,
    textSecondary: isDark ? '#AAAAAA' : Colors.textSecondary,
    separator: isDark ? '#333333' : Colors.separator,
    bubbleOwn: isDark ? '#1976D2' : '#E3F2FD',
    bubbleOther: isDark ? '#2C2C2C' : '#FFFFFF',
    bubbleOwnText: '#000000',
    bubbleOtherText: isDark ? '#FFFFFF' : Colors.textPrimary,
  };
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [primaryColor, setPrimaryColorState] = useState(DEFAULT_COLOR);
  const [isDark, setIsDarkState] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(THEME_COLOR_KEY).then((color) => {
      if (color) setPrimaryColorState(color);
    });
    AsyncStorage.getItem(DARK_MODE_KEY).then((val) => {
      if (val !== null) setIsDarkState(val === 'true');
    });
  }, []);

  const setPrimaryColor = async (color: string) => {
    setPrimaryColorState(color);
    await AsyncStorage.setItem(THEME_COLOR_KEY, color);
  };
  const setIsDark = async (dark: boolean) => {
    setIsDarkState(dark);
    await AsyncStorage.setItem(DARK_MODE_KEY, dark ? 'true' : 'false');
  };

  return (
    <ThemeContext.Provider value={{ primaryColor, setPrimaryColor, isDark, setIsDark }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const THEME_COLORS = [
  { name: 'ブルー',     color: '#0D47A1' },
  { name: 'スカイ',     color: '#0288D1' },
  { name: 'ネイビー',   color: '#1A237E' },
  { name: 'ティール',   color: '#00695C' },
  { name: 'グリーン',   color: '#2E7D32' },
  { name: 'ライム',     color: '#558B2F' },
  { name: 'レッド',     color: '#C62828' },
  { name: 'ピンク',     color: '#AD1457' },
  { name: 'オレンジ',   color: '#E65100' },
  { name: 'イエロー',   color: '#F9A825' },
  { name: 'パープル',   color: '#4A148C' },
  { name: 'グレー',     color: '#37474F' },
  { name: 'ブラック',   color: '#212121' },
  { name: 'ホワイト',   color: '#EEEEEE' },
];
