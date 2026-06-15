import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as Notifications from 'expo-notifications';
import * as SplashScreen from 'expo-splash-screen';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { InAppNotification, InAppNotificationRef } from '@/components/ui/InAppNotification';
import { registerPushToken } from '@/hooks/usePushNotification';
import { ThemeProvider } from '@/lib/theme';

SplashScreen.preventAutoHideAsync();

// フォアグラウンド中もサウンド・バッジを処理し、
// システムバナーは出さずインアプリ通知で代替する
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: false,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

function AuthGuard() {
  const { session, loading, setSession, setLoading, fetchProfile } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
      setSession(newSession);
      if (event === 'INITIAL_SESSION') {
        setLoading(false);
      }
      if (newSession?.user) {
        setTimeout(() => {
          fetchProfile(newSession.user.id);
          supabase.from('users').update({ is_online: true }).eq('id', newSession.user.id);
          registerPushToken(newSession.user.id);
        }, 0);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (loading) return;

    SplashScreen.hideAsync();

    const isRoot = segments.length === 0 || segments[0] === undefined;
    const inAuthGroup = segments[0] === '(auth)';
    const inTabGroup = segments[0] === '(tabs)';

    if (session?.user && (inAuthGroup || isRoot)) {
      router.replace('/(tabs)/friends');
    } else if (!session && (inTabGroup || isRoot)) {
      router.replace('/(auth)/welcome');
    }
  }, [session, loading, segments]);

  return null;
}

export default function RootLayout() {
  useFrameworkReady();
  const router = useRouter();
  const notificationRef = useRef<InAppNotificationRef>(null);

  useEffect(() => {
    // Android: メッセージ用通知チャンネルを作成
    if (Platform.OS === 'android') {
      Notifications.setNotificationChannelAsync('messages', {
        name: 'メッセージ通知',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#1976D2',
        sound: 'default',
        enableVibrate: true,
        showBadge: true,
      });
    }

    // フォアグラウンド中に通知を受信 → インアプリ通知を表示
    const receivedSub = Notifications.addNotificationReceivedListener((notification) => {
      const { title, body, data } = notification.request.content;
      const conversationId = data?.conversationId as string | undefined;
      if (conversationId) {
        notificationRef.current?.show({
          id: notification.request.identifier,
          title: title || 'NEXUM',
          body: body || '',
          conversationId,
        });
      }
    });

    // 通知バナーをタップ（バックグラウンド・終了時）→ チャット画面へ遷移
    const responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
      const conversationId = response.notification.request.content.data
        ?.conversationId as string | undefined;
      if (conversationId) {
        router.push(`/chat/${conversationId}` as any);
      }
    });

    return () => {
      receivedSub.remove();
      responseSub.remove();
    };
  }, []);

  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="chat/new" options={{ presentation: 'card' }} />
          <Stack.Screen name="chat/[id]" options={{ presentation: 'card' }} />
          <Stack.Screen name="profile/[id]" options={{ presentation: 'card' }} />
          <Stack.Screen name="profile/edit" options={{ presentation: 'modal' }} />
          <Stack.Screen name="friend/search" options={{ presentation: 'card' }} />
          <Stack.Screen name="friend/requests" options={{ presentation: 'card' }} />
          <Stack.Screen name="+not-found" />
        </Stack>
        <AuthGuard />
        <StatusBar style="auto" />
        <InAppNotification ref={notificationRef} />
      </QueryClientProvider>
    </ThemeProvider>
  );
}
