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
  useEffect(() => { (global as any).__setUnreadCount = setCount; return () => { delete (global as any).__setUnreadCount; }; }, []);

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

    const { data: groupMembers } = await supabase
      .from('group_members')
      .select('group_id, last_read_at')
      .eq('user_id', userId);
    let groupUnread = 0;
    if (groupMembers && groupMembers.length > 0) {
      for (const gm of groupMembers) {
        const query = supabase
          .from('group_messages')
          .select('*', { count: 'exact', head: true })
          .eq('group_id', gm.group_id)
          .neq('sender_id', userId);
        if (gm.last_read_at) {
          query.gt('created_at', gm.last_read_at);
        }
        const { count: gc } = await query;
        groupUnread += gc || 0;
      }
    }
    setCount((unread || 0) + groupUnread);
  };

  useEffect(() => {
    refresh();
    if (!session?.user) return;

    const channel = supabase
      .channel('unread_count_watch')
     .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
  const msg = payload.new as any;
  if (msg.sender_id !== session?.user?.id) setCount((c) => c + 1);
})
.on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages' }, () => { refresh(); })
.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'group_messages' }, (payload) => {
  const msg = payload.new as any;
  if (msg.sender_id !== session?.user?.id) setCount((c) => c + 1);
})
.on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'group_members' }, (payload) => {
  const updated = payload.new as any;
  if (updated.user_id === session?.user?.id && updated.last_read_at) {
    refresh();
  }
})
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [session]);
  return { count, refresh, setCount };
}

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = 56 + insets.bottom;
  const { count: unreadCount, refresh: refreshUnread, setCount: setUnreadCount } = useUnreadCount();
  useEffect(() => {
    (global as any).__refreshUnread = refreshUnread;
    (global as any).__setUnreadCount = setUnreadCount;
    return () => {
      delete (global as any).__refreshUnread;
      delete (global as any).__setUnreadCount;
    };
  }, [refreshUnread]);
  const C = useColors();

  return (
    <Tabs
      initialRouteName="friends"
      screenListeners={{
        focus: () => {
          refreshUnread();
        },
      }}
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
            backgroundColor: '#F44336',
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
