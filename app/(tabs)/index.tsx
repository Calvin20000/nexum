{gc.unread_count > 0 && (
                <View style={gcStyles.unreadBadge}>
                  <Text style={gcStyles.unreadText}>
                    {gc.unread_count > 99 ? '99+' : gc.unread_count}
                  </Text>
                </View>
              )}import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Animated,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Edit3 } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { ConversationWithUser, UserProfile } from '@/types/database';
import { useGroupConversations, GroupConversationWithUnread } from '@/hooks/useGroupChat';
import { ConversationItem } from '@/components/ConversationItem';
import { Colors } from '@/lib/colors';
import { useColors } from '@/lib/theme';

const MESSAGE_PREVIEW_KEY = 'message_preview_enabled';

type ConversationWithUnread = ConversationWithUser & { unread_count: number };

type ChatListItem =
  | { type: 'dm'; data: ConversationWithUnread }
  | { type: 'group'; data: GroupConversationWithUnread };

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
  avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: Colors.border },
  body: { flex: 1, gap: 8 },
  lineShort: { height: 14, width: '50%', borderRadius: 7, backgroundColor: Colors.border },
  lineLong: { height: 12, width: '80%', borderRadius: 6, backgroundColor: Colors.surface },
  meta: { alignItems: 'flex-end', gap: 8 },
  lineTime: { height: 10, width: 36, borderRadius: 5, backgroundColor: Colors.border },
  sep: { height: 1, backgroundColor: Colors.separator, marginLeft: 80 },
});

export default function ChatsScreen() {
  const { session } = useAuthStore();
  const C = useColors();
  const userId = session?.user?.id;
  const [dmItems, setDmItems] = useState<ConversationWithUnread[]>([]);
  const [dmLoading, setDmLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [previewEnabled, setPreviewEnabled] = useState(true);

  const { groups, loading: groupsLoading, refetch: refetchGroups, clearGroupUnread } = useGroupConversations(userId);

  useEffect(() => {
    AsyncStorage.getItem(MESSAGE_PREVIEW_KEY).then((val) => {
      if (val !== null) setPreviewEnabled(val !== 'false');
    });
  }, []);
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel('group-members-changes')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'group_members',
        filter: `user_id=eq.${userId}`,
      }, () => {
        refetchGroups();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  const fetchDMs = useCallback(async () => {
    if (!userId) return;

    const { data: dmData } = await supabase
      .from('conversations')
      .select('*')
      .or(`participant_1_id.eq.${userId},participant_2_id.eq.${userId}`)
      .order('last_message_at', { ascending: false }).limit(10);

    const items: ConversationWithUnread[] = await Promise.all(
      (dmData ?? []).map(async (conv) => {
        const otherId = conv.participant_1_id === userId ? conv.participant_2_id : conv.participant_1_id;
        const [userRes, msgRes, unreadRes] = await Promise.all([
          supabase.from('users').select('*').eq('id', otherId).maybeSingle(),
          conv.last_message_id
            ? supabase.from('messages').select('*').eq('id', conv.last_message_id).maybeSingle()
            : Promise.resolve({ data: null }),
          supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('conversation_id', conv.id)
            .is('read_at', null)
            .neq('sender_id', userId),
        ]);
        return {
          ...conv,
          other_user: userRes.data!,
          last_message: msgRes.data,
          unread_count: unreadRes.count ?? 0,
        };
      })
    );
    setDmItems(items.filter((c) => c.other_user != null));
    setDmLoading(false);
    setRefreshing(false);
  }, [userId]);

  useEffect(() => {
    fetchDMs();

    if (!userId) return;
    const channel = supabase
      .channel('dm_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, () => fetchDMs())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => fetchDMs())
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages' }, () => fetchDMs())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchDMs, userId]);

  useFocusEffect(
    useCallback(() => {
      fetchDMs();
      refetchGroups();
    }, [fetchDMs, refetchGroups])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchDMs();
    refetchGroups();
  };

  const chatItems: ChatListItem[] = [
    ...dmItems.map((d) => ({ type: 'dm' as const, data: d })),
    ...groups.map((g) => ({ type: 'group' as const, data: g })),
  ].sort((a, b) => {
    const aTime = a.data.last_message_at ?? '1970-01-01';
     if (!a.data.last_message_at) return 1;
    if (!b.data.last_message_at) return -1;
    const bTime = b.data.last_message_at ?? '1970-01-01';
    return new Date(bTime).getTime() - new Date(aTime).getTime();
  });

  const uniqueChatItems = chatItems.filter((item, index, self) => self.findIndex(i => i.type === item.type && i.data.id === item.data.id) === index);
  const loading = dmLoading || groupsLoading;

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
        <TouchableOpacity style={styles.headerBtn} onPress={() => router.push('/chat/new')}>
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
          data={uniqueChatItems}
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

            const gc = item.data;
            const lastMsg = gc.last_message as any;
            const senderPrefix = lastMsg?.sender?.display_name ? `${lastMsg.sender.display_name}：` : '';
            let preview = '';
            if (lastMsg) {
              if (lastMsg.is_deleted) {
                preview = 'メッセージが削除されました';
              } else if (lastMsg.message_type === 'image') {
                preview = `${senderPrefix}📷 写真`;
              } else if (lastMsg.message_type === 'sticker' || lastMsg.message_type === 'stamp') {
                preview = `${senderPrefix}${lastMsg.content || '😊'}`;
              } else {
                preview = `${senderPrefix}${lastMsg.content?.substring(0, 28) ?? ''}`;
              }
            }
            return (
              <TouchableOpacity
                style={gcStyles.row}
                onPress={() => { clearGroupUnread(gc.id); router.push(`/group-chat/${gc.id}`); }}
                activeOpacity={0.7}
              >
                <View style={gcStyles.avatarWrapper}>
                  {gc.avatar_url ? (
                    <Image source={{ uri: gc.avatar_url }} style={gcStyles.avatar} />
                  ) : (
                    <View style={[gcStyles.avatar, { backgroundColor: '#E3F2FD' }]}>
                      <Text style={gcStyles.avatarEmoji}>👥</Text>
                    </View>
                  )}
                  
                </View>
                <View style={gcStyles.content}>
                  <View style={gcStyles.topRow}>
                    <Text style={[gcStyles.name, gc.unread_count > 0 && gcStyles.nameUnread]} numberOfLines={1}>
                      {gc.name}
                    </Text>
                    <Text style={gcStyles.time}>
                      {gc.last_message_at ? formatRelativeTime(gc.last_message_at) : ''}
                    </Text>
                  </View>
                  <View style={gcStyles.bottomRow}>
                    <View style={[gcStyles.memberBadge, { backgroundColor: C.surface }]}>
                      <Text style={[gcStyles.memberBadgeText, { color: C.primary }]}>{gc.members.length}人</Text>
                    </View>
                    <Text
                      style={[gcStyles.preview, gc.unread_count > 0 && gcStyles.previewUnread]}
                      numberOfLines={1}
                    >
                      {preview || 'メッセージを送ろう'}
                    </Text>
                  </View>
                </View>
              {gc.unread_count > 0 && (
                <View style={gcStyles.unreadBadge}>
                  <Text style={gcStyles.unreadText}>
                    {gc.unread_count > 99 ? '99+' : gc.unread_count}
                  </Text>
                </View>
              )}</TouchableOpacity>
            );
          }}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} />
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
  headerTitle: { fontSize: 24, fontWeight: '800', letterSpacing: 2 },
  headerBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: Colors.surface,
  },
  separator: { height: 1, backgroundColor: Colors.separator, marginLeft: 80 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary, textAlign: 'center' },
  emptySubtitle: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20 },
  startBtn: { borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12, marginTop: 8 },
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
  avatarWrapper: { position: 'relative', flexShrink: 0 },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarEmoji: { fontSize: 26 },
  unreadBadge: {
    backgroundColor: '#1976D2',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    flexShrink: 0,
  },
  unreadText: { color: Colors.white, fontSize: 10, fontWeight: '700' },
  content: { flex: 1, gap: 4 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary, flex: 1 },
  nameUnread: { fontWeight: '800', color: Colors.textPrimary },
  time: { fontSize: 12, color: Colors.textMuted, marginLeft: 8 },
  bottomRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  memberBadge: { borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2, flexShrink: 0 },
  memberBadgeText: { fontSize: 11, fontWeight: '700' },
  preview: { fontSize: 13, color: Colors.textSecondary, flex: 1 },
  previewUnread: { color: Colors.textPrimary, fontWeight: '600' },
});
