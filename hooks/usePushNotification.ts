import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { supabase } from '@/lib/supabase';

export async function registerPushToken(userId: string): Promise<void> {
  if (Platform.OS === 'web') return;
  if (!Device.isDevice) return;

  try {
    const { status: existing } = await Notifications.getPermissionsAsync();
    let finalStatus = existing;

    if (existing !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') return;

    const token = await Notifications.getExpoPushTokenAsync();

    const { error } = await supabase
      .from('users')
      .update({ expo_push_token: token.data })
      .eq('id', userId);

    if (error) return;
  } catch {
    // Silently ignored — push notifications require an EAS build on Android
  }
}
