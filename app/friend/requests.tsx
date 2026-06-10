import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ChevronLeft, Check, X } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { Friendship, UserProfile } from '@/types/database';
import { Avatar } from '@/components/Avatar';
import { Colors } from '@/lib/colors';

type Request = Friendship & { requester: UserProfile };

export default function FriendRequestsScreen() {
  const { session } = useAuthStore();
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processing, setProcessing] = useState<string | null>(null);

  const userId = session?.user?.id;

  const fetchRequests = useCallback(async () => {
    if (!userId) return;

    const { data, error } = await supabase
      .from('friendships')
      .select('*')
      .eq('addressee_id', userId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error || !data) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    const enriched: Request[] = await Promise.all(
      data.map(async (f) => {
        const { data: user } = await supabase
          .from('users')
          .select('*')
          .eq('id', f.requester_id)
          .maybeSingle();
        return { ...f, requester: user! };
      })
    );

    setRequests(enriched.filter((r) => r.requester != null));
    setLoading(false);
    setRefreshing(false);
  }, [userId]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const respond = async (friendshipId: string, status: 'accepted' | 'rejected') => {
    setProcessing(friendshipId);
    await supabase
      .from('friendships')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', friendshipId);

    setRequests((prev) => prev.filter((r) => r.id !== friendshipId));
    setProcessing(null);
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchRequests();
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ChevronLeft size={24} color={Colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>フレンド申請</Text>
        <View style={styles.headerRight} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.primary} />
        </View>
      ) : requests.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyTitle}>申請はありません</Text>
          <Text style={styles.emptySubtitle}>新しいフレンド申請が届くとここに表示されます</Text>
        </View>
      ) : (
        <FlatList
          data={requests}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.requestItem}>
              <TouchableOpacity
                style={styles.userInfo}
                onPress={() => router.push(`/profile/${item.requester.id}`)}
              >
                <Avatar
                  uri={item.requester.avatar_url}
                  name={item.requester.display_name || item.requester.handle}
                  size={50}
                />
                <View style={styles.userText}>
                  <Text style={styles.userName}>
                    {item.requester.display_name || item.requester.handle}
                  </Text>
                  <Text style={styles.userHandle}>@{item.requester.handle}</Text>
                  {item.requester.bio ? (
                    <Text style={styles.userBio} numberOfLines={1}>
                      {item.requester.bio}
                    </Text>
                  ) : null}
                </View>
              </TouchableOpacity>
              <View style={styles.actions}>
                <TouchableOpacity
                  style={styles.acceptBtn}
                  onPress={() => respond(item.id, 'accepted')}
                  disabled={processing === item.id}
                >
                  {processing === item.id
                    ? <ActivityIndicator size="small" color={Colors.white} />
                    : <Check size={18} color={Colors.white} />}
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.rejectBtn}
                  onPress={() => respond(item.id, 'rejected')}
                  disabled={processing === item.id}
                >
                  <X size={18} color={Colors.error} />
                </TouchableOpacity>
              </View>
            </View>
          )}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
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
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.separator,
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '700', color: Colors.textPrimary },
  headerRight: { width: 36 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: Colors.textPrimary },
  emptySubtitle: { fontSize: 13, color: Colors.textSecondary, textAlign: 'center', lineHeight: 19 },
  requestItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: Colors.white,
  },
  userInfo: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  userText: { flex: 1, gap: 2 },
  userName: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
  userHandle: { fontSize: 12, color: Colors.textMuted },
  userBio: { fontSize: 12, color: Colors.textSecondary, marginTop: 1 },
  actions: { flexDirection: 'row', gap: 8 },
  acceptBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rejectBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFEBEE',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FFCDD2',
  },
  separator: { height: 1, backgroundColor: Colors.separator, marginLeft: 78 },
});
