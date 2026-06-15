import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ChevronLeft, Search, UserPlus, Check } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { UserProfile, Friendship } from '@/types/database';
import { Avatar } from '@/components/Avatar';
import { Colors } from '@/lib/colors';
import { useColors } from '@/lib/theme';

type SearchResult = UserProfile & { friendshipStatus?: 'pending' | 'accepted' | 'rejected' | 'self' };

export default function FriendSearchScreen() {
  const { session } = useAuthStore();
  const C = useColors();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [sendingTo, setSendingTo] = useState<string | null>(null);

  const userId = session?.user?.id;

  const search = async () => {
    if (!query.trim() || !userId) return;
    setLoading(true);
    setSearched(true);

    const { data: users } = await supabase
      .from('users')
      .select('*')
      .ilike('handle', `%${query.trim()}%`)
      .neq('id', userId)
      .limit(20);

    if (!users) {
      setResults([]);
      setLoading(false);
      return;
    }

    const { data: friendships } = await supabase
      .from('friendships')
      .select('*')
      .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);

    const enriched: SearchResult[] = users.map((u) => {
      if (u.id === userId) return { ...u, friendshipStatus: 'self' };
      const f = (friendships ?? []).find(
        (fs) =>
          (fs.requester_id === userId && fs.addressee_id === u.id) ||
          (fs.addressee_id === userId && fs.requester_id === u.id)
      );
      return { ...u, friendshipStatus: f?.status };
    });

    setResults(enriched);
    setLoading(false);
  };

  const sendRequest = async (targetId: string) => {
    if (!userId || sendingTo) return;
    setSendingTo(targetId);

    const { error } = await supabase.from('friendships').insert({
      requester_id: userId,
      addressee_id: targetId,
    });

    if (!error) {
      setResults((prev) =>
        prev.map((u) =>
          u.id === targetId ? { ...u, friendshipStatus: 'pending' } : u
        )
      );
    }
    setSendingTo(null);
  };

  const renderUser = ({ item }: { item: SearchResult }) => (
    <View style={styles.resultItem}>
      <TouchableOpacity
        style={styles.userInfo}
        onPress={() => router.push(`/profile/${item.id}`)}
      >
        <Avatar uri={item.avatar_url} name={item.display_name || item.handle} size={46} online={item.is_online} />
        <View style={styles.userText}>
          <Text style={styles.userName}>{item.display_name || item.handle}</Text>
          <Text style={styles.userHandle}>@{item.handle}</Text>
        </View>
      </TouchableOpacity>

      {item.friendshipStatus === 'accepted' ? (
        <View style={styles.statusBadge}>
          <Check size={14} color={Colors.success} />
          <Text style={styles.statusText}>フレンド</Text>
        </View>
      ) : item.friendshipStatus === 'pending' ? (
        <View style={[styles.statusBadge, { backgroundColor: C.surface }]}>
          <Text style={[styles.statusText, { color: C.primary }]}>申請済</Text>
        </View>
      ) : item.friendshipStatus !== 'self' ? (
        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: C.primary }]}
          onPress={() => sendRequest(item.id)}
          disabled={sendingTo === item.id}
        >
          {sendingTo === item.id
            ? <ActivityIndicator size="small" color={Colors.white} />
            : <><UserPlus size={14} color={Colors.white} /><Text style={styles.addBtnText}>申請</Text></>}
        </TouchableOpacity>
      ) : null}
    </View>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ChevronLeft size={24} color={C.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>ユーザーを検索</Text>
        <View style={styles.headerRight} />
      </View>

      <View style={styles.searchBar}>
        <Search size={18} color={Colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="@IDで検索..."
          placeholderTextColor={Colors.textMuted}
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={search}
          autoCapitalize="none"
          returnKeyType="search"
          autoFocus
        />
        <TouchableOpacity
          style={[styles.searchBtn, { backgroundColor: C.primary }, !query.trim() && styles.searchBtnDisabled]}
          onPress={search}
          disabled={!query.trim()}
        >
          <Text style={styles.searchBtnText}>検索</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={C.primary} />
        </View>
      ) : searched && results.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.noResults}>ユーザーが見つかりません</Text>
          <Text style={styles.noResultsSub}>@IDを正確に入力してください</Text>
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          renderItem={renderUser}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          contentContainerStyle={styles.list}
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
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.separator,
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '700', color: Colors.textPrimary },
  headerRight: { width: 36 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    backgroundColor: Colors.white,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    gap: 10,
    height: 50,
  },
  searchInput: { flex: 1, fontSize: 15, color: Colors.textPrimary },
  searchBtn: {
    borderRadius: 9,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  searchBtnDisabled: { opacity: 0.4 },
  searchBtnText: { color: Colors.white, fontWeight: '600', fontSize: 14 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  noResults: { fontSize: 16, fontWeight: '600', color: Colors.textPrimary },
  noResultsSub: { fontSize: 13, color: Colors.textSecondary },
  list: { paddingBottom: 20 },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.white,
    justifyContent: 'space-between',
  },
  userInfo: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  userText: { gap: 2 },
  userName: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
  userHandle: { fontSize: 12, color: Colors.textMuted },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E8F5E9',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  statusText: { fontSize: 12, color: Colors.success, fontWeight: '600' },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
    minWidth: 56,
    justifyContent: 'center',
  },
  addBtnText: { color: Colors.white, fontSize: 13, fontWeight: '600' },
  separator: { height: 1, backgroundColor: Colors.separator, marginLeft: 74 },
});
