import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ChevronLeft, Search, MessageCircle } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { UserProfile, Friendship } from '@/types/database';
import { Avatar } from '@/components/Avatar';
import { Colors } from '@/lib/colors';

type FriendWithUser = Friendship & { friend: UserProfile };

export default function NewChatScreen() {
  const { session } = useAuthStore();
  const [friends, setFriends] = useState<FriendWithUser[]>([]);
  const [filtered, setFiltered] = useState<FriendWithUser[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [startingId, setStartingId] = useState<string | null>(null);

  const fetchFriends = useCallback(async () => {
    if (!session?.user) return;
    const userId = session.user.id;

    const { data, error } = await supabase
      .from('friendships')
      .select('*')
      .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
      .eq('status', 'accepted');

    if (error || !data) { setLoading(false); return; }

    const enriched: FriendWithUser[] = await Promise.all(
      data.map(async (f) => {
        const friendId = f.requester_id === userId ? f.addressee_id : f.requester_id;
        const { data: user } = await supabase.from('users').select('*').eq('id', friendId).maybeSingle();
        return { ...f, friend: user! };
      })
    );

    const valid = enriched.filter((f) => f.friend != null);
    setFriends(valid);
    setFiltered(valid);
    setLoading(false);
  }, [session]);

  useEffect(() => { fetchFriends(); }, [fetchFriends]);

  useEffect(() => {
    if (!query.trim()) {
      setFiltered(friends);
      return;
    }
    const q = query.toLowerCase();
    setFiltered(friends.filter((f) =>
      (f.friend.display_name || '').toLowerCase().includes(q) ||
      f.friend.handle.toLowerCase().includes(q)
    ));
  }, [query, friends]);

  const startChat = async (friendId: string) => {
    if (!session?.user || startingId) return;
    setStartingId(friendId);
    const userId = session.user.id;
    const p1 = userId < friendId ? userId : friendId;
    const p2 = userId < friendId ? friendId : userId;

    let { data: existing } = await supabase
      .from('conversations')
      .select('id')
      .eq('participant_1_id', p1)
      .eq('participant_2_id', p2)
      .maybeSingle();

    if (!existing) {
      const { data: created } = await supabase
        .from('conversations')
        .insert({ participant_1_id: p1, participant_2_id: p2 })
        .select('id')
        .single();
      existing = created;
    }

    setStartingId(null);
    if (existing) {
      router.replace(`/chat/${existing.id}`);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ChevronLeft size={26} color={Colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>新しいメッセージ</Text>
        <View style={styles.headerRight} />
      </View>

      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Search size={16} color={Colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="フレンドを検索..."
            placeholderTextColor={Colors.textMuted}
            value={query}
            onChangeText={setQuery}
            autoFocus
          />
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.empty}>
          {query ? (
            <Text style={styles.emptyText}>「{query}」に一致するフレンドがいません</Text>
          ) : (
            <>
              <Text style={styles.emptyTitle}>フレンドがいません</Text>
              <Text style={styles.emptyText}>まずフレンドを追加しましょう</Text>
              <TouchableOpacity
                style={styles.addBtn}
                onPress={() => router.push('/friend/search')}
              >
                <Text style={styles.addBtnText}>フレンドを探す</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            const isLoading = startingId === item.friend.id;
            return (
              <TouchableOpacity
                style={styles.row}
                onPress={() => startChat(item.friend.id)}
                activeOpacity={0.7}
                disabled={!!startingId}
              >
                <Avatar
                  uri={item.friend.avatar_url}
                  name={item.friend.display_name || item.friend.handle}
                  size={50}
                  online={item.friend.is_online}
                />
                <View style={styles.rowInfo}>
                  <Text style={styles.name}>{item.friend.display_name || item.friend.handle}</Text>
                  <Text style={styles.handle}>@{item.friend.handle}</Text>
                </View>
                {isLoading ? (
                  <ActivityIndicator size="small" color={Colors.primary} />
                ) : (
                  <MessageCircle size={20} color={Colors.primary} />
                )}
              </TouchableOpacity>
            );
          }}
          ItemSeparatorComponent={() => <View style={styles.sep} />}
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
    paddingHorizontal: 8,
    paddingVertical: 12,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.separator,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: Colors.textPrimary, textAlign: 'center' },
  headerRight: { width: 40 },
  searchRow: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.separator,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.inputBackground,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  emptyText: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center' },
  addBtn: {
    marginTop: 8,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  addBtnText: { color: Colors.white, fontWeight: '600', fontSize: 15 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.white,
    gap: 12,
  },
  rowInfo: { flex: 1 },
  name: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
  handle: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  sep: { height: 1, backgroundColor: Colors.separator, marginLeft: 78 },
});
