import { useEffect } from 'react';
import { Platform } from 'react-native';

export function useFrameworkReady() {
  useEffect(() => {
    if (Platform.OS === 'web') {
      try {
        (window as any).frameworkReady?.();
      } catch (e) {
        // ignore
      }
    }
  }, []);
}
