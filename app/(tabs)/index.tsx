import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Animated,
} from 'react-native';import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Edit3, Users } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { ConversationWithUser, GroupChatWithDetails, UserProfile, GroupChatMessage } from '@/types/database';
import { ConversationItem } from '@/components/ConversationItem';
import { Avatar } from '@/components/Avatar';
import { Colors } from '@/lib/colors';
import { useColors } from '@/lib/theme';

const MESSAGE_PREVIEW_KEY = 'message_preview_enabled';

type ChatListItem =
  | { type: 'dm'; data: ConversationWithUser }
  | { type: 'group'; data: GroupChatWithDetails };

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'たった今';
  if (mins < 60) return `${mins}分前`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}時間前`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}日前`;
  return new Date(iso).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' });
}

function useSkeletonPulse() {
  const anim = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [anim]);
  return anim;
}

function ConversationSkeleton({ opacity }: { opacity: Animated.Value }) {
  return (
    <Animated.View style={[skeletonStyles.row, { opacity }]}>
      <View style={skeletonStyles.avatar} />
      <View style={skeletonStyles.body}>
        <View style={skeletonStyles.lineShort} />
        <View style={skeletonStyles.lineLong} />
      </View>
      <View style={skeletonStyles.meta}>
        <View style={skeletonStyles.lineTime} />
      </View>
    </Animated.View>
  );
}

function ChatListSkeleton() {
  const opacity = useSkeletonPulse();
  return (
    <View>
      {Array.from({ length: 7 }).map((_, i) => (
        <View key={i}>
          <ConversationSkeleton opacity={opacity} />
          {i < 6 && <View style={skeletonStyles.sep} />}
        </View>
      ))}
    </View>
  );
}

const skeletonStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: Colors.white,
    gap: 12,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.border,
  },
  body: { flex: 1, gap: 8 },
  lineShort: {
    height: 14,
    width: '50%',
    borderRadius: 7,
    backgroundColor: Colors.border,
  },
  lineLong: {
    height: 12,
    width: '80%',
    borderRadius: 6,
    backgroundColor: Colors.surface,
  },
  meta: { alignItems: 'flex-end', gap: 8 },
  lineTime: {
    height: 10,
    width: 36,
    borderRadius: 5,
    backgroundColor: Colors.border,
  },
  sep: { height: 1, backgroundColor: Colors.separator, marginLeft: 80 },
});

export default function ChatsScreen() {
  const { session } = useAuthStore();
  const C = useColors();
  const [chatItems, setChatItems] = useState<ChatListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [previewEnabled, setPreviewEnabled] = useState(true);
  const hasAutoNavigated = useRef(false);

  useEffect(() => {
    AsyncStorage.getItem(MESSAGE_PREVIEW_KEY).then((val) => {
      if (val !== null) setPreviewEnabled(val !== 'false');
    });
  }, []);

  const fetchConversations = useCallback(async () => {
    if (!session?.user) return;
    const userId = session.user.id;

    // Fetch 1-on-1 conversations
    const { data: dmData } = await supabase
      .from('conversations')
      .select('*')
      .or(`participant_1_id.eq.${userId},participant_2_id.eq.${userId}`)
      .order('last_message_at', { ascending: false });

    const dmItems: ConversationWithUser[] = await Promise.all(
      (dmData ?? []).map(async (conv) => {
        const otherId = conv.participant_1_id === userId ? conv.participant_2_id : conv.participant_1_id;
        const [userRes, msgRes] = await Promise.all([
          supabase.from('users').select('*').eq('id', otherId).maybeSingle(),
          conv.last_message_id
            ? supabase.from('messages').select('*').eq('id', conv.last_message_id).maybeSingle()
            : Promise.resolve({ data: null }),
        ]);
        return { ...conv, other_user: userRes.data!, last_message: msgRes.data };
      })
    );

    // Fetch group chats
    const { data: gcData } = await (supabase.from('group_chats' as any) as any)
      .select('*')
      .order('last_message_at', { ascending: false });

    const gcItems: GroupChatWithDetails[] = await Promise.all(
      ((gcData ?? []) as any[]).map(async (gc: any) => {
        const { data: memberRows } = await (supabase.from('group_chat_members' as any) as any)
          .select('user_id')
          .eq('group_chat_id', gc.id);
        const memberIds = ((memberRows ?? []) as any[]).map((m: any) => m.user_id);
        let members: UserProfile[] = [];
        if (memberIds.length > 0) {
          const { data: users } = await supabase.from('users').select('*').in('id', memberIds);
          members = (users ?? []) as UserProfile[];
        }
        // Last message
        const { data: lastMsgRow } = await (supabase.from('group_chat_messages' as any) as any)
          .select('*')
          .eq('group_chat_id', gc.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        return { ...gc, members, last_message: lastMsgRow ?? null };
      })
    );

    // Merge and sort by last_message_at
    const allItems: ChatListItem[] = [
      ...dmItems.filter((c) => c.other_user != null).map((d) => ({ type: 'dm' as const, data: d })),
      ...gcItems.map((g) => ({ type: 'group' as const, data: g })),
    ].sort((a, b) => {
      const aTime = a.type === 'dm' ? a.data.last_message_at : a.data.last_message_at;
      const bTime = b.type === 'dm' ? b.data.last_message_at : b.data.last_message_at;
      return new Date(bTime).getTime() - new Date(aTime).getTime();
    });

    setChatItems(allItems);
    setLoading(false);
    setRefreshing(false);
  }, [session]);

  useEffect(() => {
    fetchConversations();

    if (!session?.user) return;
    const channel = supabase
      .channel('conversations_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, () => fetchConversations())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => fetchConversations())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'group_chat_messages' }, () => fetchConversations())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'group_chats' }, () => fetchConversations())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchConversations, session]);

  useEffect(() => {
    if (!loading && chatItems.length > 0 && !hasAutoNavigated.current) {
      hasAutoNavigated.current = true;
      const first = chatItems[0];
      if (first.type === 'dm') router.push(`/chat/${first.data.id}`);
      else router.push(`/group-chat/${first.data.id}`);
    }
  }, [loading, chatItems]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchConversations();
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: C.primary }]}>NEXUM</Text>
        </View>
        <ChatListSkeleton />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: C.primary }]}>NEXUM</Text>
        <TouchableOpacity
          style={styles.headerBtn}
          onPress={() => router.push('/chat/new')}
        >
          <Edit3 size={22} color={C.primary} />
        </TouchableOpacity>
      </View>

      {chatItems.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>まだチャットがありません</Text>
          <Text style={styles.emptySubtitle}>フレンドを追加してチャットを始めましょう</Text>
          <TouchableOpacity
            style={[styles.startBtn, { backgroundColor: C.primary }]}
            onPress={() => router.push('/friend/search')}
          >
            <Text style={styles.startBtnText}>フレンドを探す</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={chatItems}
          keyExtractor={(item) => item.type + '_' + item.data.id}
          renderItem={({ item }) => {
            if (item.type === 'dm') {
              return (
                <ConversationItem
                  item={item.data}
                  onPress={() => router.push(`/chat/${item.data.id}`)}
                  previewEnabled={previewEnabled}
                />
              );
            }
            // Group chat row
            const gc = item.data;
            const lastMsg = gc.last_message;
            const preview = lastMsg
              ? lastMsg.is_deleted
                ? 'メッセージが削除されました'
                : lastMsg.message_type === 'image'
                  ? '📷 画像'
                  : (lastMsg.content?.substring(0, 35) ?? '')
              : '';
            return (
              <TouchableOpacity
                style={gcStyles.row}
                onPress={() => router.push(`/group-chat/${gc.id}`)}
                activeOpacity={0.7}
              >
                <View style={[gcStyles.avatar, { backgroundColor: C.surface }]}>
                  <Users size={22} color={C.primary} />
                </View>
                <View style={gcStyles.content}>
                  <View style={gcStyles.topRow}>
                    <Text style={gcStyles.name} numberOfLines={1}>{gc.name}</Text>
                    <Text style={gcStyles.time}>{formatRelativeTime(gc.last_message_at)}</Text>
                  </View>
                  <View style={gcStyles.bottomRow}>
                    <Text style={gcStyles.preview} numberOfLines={1}>
                      {preview || `${gc.members.length}人のメンバー`}
                    </Text>
                    <View style={[gcStyles.groupBadge, { backgroundColor: C.surface }]}>
                      <Text style={[gcStyles.groupBadgeText, { color: C.primary }]}>グループ</Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={C.primary}
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.separator,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 2,
  },
  headerBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: Colors.surface,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  separator: { height: 1, backgroundColor: Colors.separator, marginLeft: 80 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary, textAlign: 'center' },
  emptySubtitle: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20 },
  startBtn: {
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
    marginTop: 8,
  },
  startBtnText: { color: Colors.white, fontWeight: '600', fontSize: 15 },
});

const gcStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.white,
    gap: 12,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { flex: 1, gap: 4 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary, flex: 1 },
  time: { fontSize: 12, color: Colors.textMuted, marginLeft: 8 },
  bottomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  preview: { fontSize: 13, color: Colors.textSecondary, flex: 1 },
  groupBadge: {
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 6,
  },
  groupBadgeText: { fontSize: 10, fontWeight: '700' },
});
