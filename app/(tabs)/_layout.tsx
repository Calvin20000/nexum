import { useEffect, useState } from 'react';
import { Tabs } from 'expo-router';
import { MessageCircle, Users, User, Settings } from 'lucide-react-native';
import { Colors } from '@/lib/colors';
import { useColors } from '@/lib/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';

function useUnreadCount() {
  const { session } = useAuthStore();
  const [count, setCount] = useState(0);

  const refresh = async () => {
    if (!session?.user) { setCount(0); return; }
    const userId = session.user.id;

    const { data: convs } = await supabase
      .from('conversations')
      .select('id')
      .or(`participant_1_id.eq.${userId},participant_2_id.eq.${userId}`);

    if (!convs || convs.length === 0) { setCount(0); return; }

    const convIds = convs.map((c) => c.id);

    const { count: unread } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .is('read_at', null)
      .neq('sender_id', userId)
      .in('conversation_id', convIds);

    setCount(unread || 0);
  };

  useEffect(() => {
    refresh();
    if (!session?.user) return;

    const channel = supabase
      .channel('unread_count_watch')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, refresh)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [session]);

  return count;
}

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = 56 + insets.bottom;
  const unreadCount = useUnreadCount();
  const C = useColors();

  return (
    <Tabs
      initialRouteName="friends"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: C.primary,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarStyle: {
          backgroundColor: Colors.white,
          borderTopColor: Colors.separator,
          borderTopWidth: 1,
          height: tabBarHeight,
          paddingBottom: insets.bottom + 4,
          paddingTop: 8,
          elevation: 8,
          shadowColor: '#000',
          shadowOpacity: 0.06,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: -2 },
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="friends"
        options={{
          title: 'フレンド',
          tabBarIcon: ({ color, size }) => <Users size={size} color={color} strokeWidth={2} />,
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          title: 'チャット',
          tabBarBadge: unreadCount > 0 ? (unreadCount > 99 ? '99+' : unreadCount) : undefined,
          tabBarBadgeStyle: {
            backgroundColor: '#1976D2',
            fontSize: 11,
            fontWeight: '700',
            minWidth: 18,
            height: 18,
            lineHeight: 18,
          },
          tabBarIcon: ({ color, size }) => <MessageCircle size={size} color={color} strokeWidth={2} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'プロフィール',
          tabBarIcon: ({ color, size }) => <User size={size} color={color} strokeWidth={2} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: '設定',
          tabBarIcon: ({ color, size }) => <Settings size={size} color={color} strokeWidth={2} />,
        }}
      />
    </Tabs>
  );
}
