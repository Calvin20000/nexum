import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Edit3 } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { ConversationWithUser } from '@/types/database';
import { ConversationItem } from '@/components/ConversationItem';
import { Colors } from '@/lib/colors';
import { useColors } from '@/lib/theme';

const MESSAGE_PREVIEW_KEY = 'message_preview_enabled';

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
  const [conversations, setConversations] = useState<ConversationWithUser[]>([]);
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

    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .or(`participant_1_id.eq.${userId},participant_2_id.eq.${userId}`)
      .order('last_message_at', { ascending: false });

    if (error || !data) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    const enriched: ConversationWithUser[] = await Promise.all(
      data.map(async (conv) => {
        const otherId =
          conv.participant_1_id === userId
            ? conv.participant_2_id
            : conv.participant_1_id;

        const [userRes, msgRes] = await Promise.all([
          supabase.from('users').select('*').eq('id', otherId).maybeSingle(),
          conv.last_message_id
            ? supabase.from('messages').select('*').eq('id', conv.last_message_id).maybeSingle()
            : Promise.resolve({ data: null, error: null }),
        ]);

        return {
          ...conv,
          other_user: userRes.data!,
          last_message: msgRes.data,
        };
      })
    );

    setConversations(enriched.filter((c) => c.other_user != null));
    setLoading(false);
    setRefreshing(false);
  }, [session]);

  useEffect(() => {
    fetchConversations();

    if (!session?.user) return;
    const channel = supabase
      .channel('conversations_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'conversations' },
        () => fetchConversations()
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        () => fetchConversations()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchConversations, session]);

  useEffect(() => {
    if (!loading && conversations.length > 0 && !hasAutoNavigated.current) {
      hasAutoNavigated.current = true;
      router.push(`/chat/${conversations[0].id}`);
    }
  }, [loading, conversations]);

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

      {conversations.length === 0 ? (
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
          data={conversations}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ConversationItem
              item={item}
              onPress={() => router.push(`/chat/${item.id}`)}
              previewEnabled={previewEnabled}
            />
          )}
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
