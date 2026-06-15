import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const THEME_COLOR_KEY = 'theme_color';
const DEFAULT_COLOR = '#0D47A1';

type ThemeContextType = {
  primaryColor: string;
  setPrimaryColor: (color: string) => void;
};

export const ThemeContext = createContext<ThemeContextType>({
  primaryColor: DEFAULT_COLOR,
  setPrimaryColor: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [primaryColor, setPrimaryColorState] = useState(DEFAULT_COLOR);

  useEffect(() => {
    AsyncStorage.getItem(THEME_COLOR_KEY).then((color) => {
      if (color) setPrimaryColorState(color);
    });
  }, []);

  const setPrimaryColor = async (color: string) => {
    setPrimaryColorState(color);
    await AsyncStorage.setItem(THEME_COLOR_KEY, color);
  };

  return (
    <ThemeContext.Provider value={{ primaryColor, setPrimaryColor }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const THEME_COLORS = [
  { name: 'ブルー',   color: '#0D47A1' },
  { name: 'ネイビー', color: '#1A237E' },
  { name: 'ティール', color: '#00695C' },
  { name: 'パープル', color: '#4A148C' },
  { name: 'グレー',   color: '#37474F' },
  { name: 'ブラック', color: '#212121' },
];
