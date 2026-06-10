import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { UserPlus, Bell, MessageCircle } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { Friendship, UserProfile } from '@/types/database';
import { Avatar } from '@/components/Avatar';
import { Colors } from '@/lib/colors';

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

function FriendSkeleton({ opacity }: { opacity: Animated.Value }) {
  return (
    <Animated.View style={[skeletonStyles.row, { opacity }]}>
      <View style={skeletonStyles.avatar} />
      <View style={skeletonStyles.body}>
        <View style={skeletonStyles.lineName} />
        <View style={skeletonStyles.lineHandle} />
      </View>
      <View style={skeletonStyles.actionBtn} />
    </Animated.View>
  );
}

function FriendsListSkeleton() {
  const opacity = useSkeletonPulse();
  return (
    <View>
      {Array.from({ length: 6 }).map((_, i) => (
        <View key={i}>
          <FriendSkeleton opacity={opacity} />
          {i < 5 && <View style={skeletonStyles.sep} />}
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
    paddingVertical: 12,
    backgroundColor: Colors.white,
    gap: 12,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: Colors.border,
  },
  body: { flex: 1, gap: 8 },
  lineName: {
    height: 14,
    width: '45%',
    borderRadius: 7,
    backgroundColor: Colors.border,
  },
  lineHandle: {
    height: 11,
    width: '30%',
    borderRadius: 5,
    backgroundColor: Colors.surface,
  },
  actionBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.border,
  },
  sep: { height: 1, backgroundColor: Colors.separator, marginLeft: 78 },
});

type FriendWithUser = Friendship & { friend: UserProfile };

export default function FriendsScreen() {
  const { session } = useAuthStore();
  const [friends, setFriends] = useState<FriendWithUser[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchFriends = useCallback(async () => {
    if (!session?.user) return;
    const userId = session.user.id;

    const { data, error } = await supabase
      .from('friendships')
      .select('*')
      .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
      .eq('status', 'accepted');

    if (error || !data) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    const enriched: FriendWithUser[] = await Promise.all(
      data.map(async (f) => {
        const friendId = f.requester_id === userId ? f.addressee_id : f.requester_id;
        const { data: user } = await supabase
          .from('users')
          .select('*')
          .eq('id', friendId)
          .maybeSingle();
        return { ...f, friend: user! };
      })
    );

    setFriends(enriched.filter((f) => f.friend != null));

    const { count } = await supabase
      .from('friendships')
      .select('*', { count: 'exact', head: true })
      .eq('addressee_id', userId)
      .eq('status', 'pending');
    setPendingCount(count ?? 0);

    setLoading(false);
    setRefreshing(false);
  }, [session]);

  useEffect(() => {
    fetchFriends();
  }, [fetchFriends]);

  const [startingId, setStartingId] = useState<string | null>(null);

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

    if (existing) {
      router.push(`/chat/${existing.id}`);
    }
    setStartingId(null);
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchFriends();
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>フレンド</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={() => router.push('/friend/requests')}
          >
            <Bell size={20} color={Colors.primary} />
            {pendingCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{pendingCount}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={() => router.push('/friend/search')}
          >
            <UserPlus size={20} color={Colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <FriendsListSkeleton />
      ) : friends.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>フレンドがいません</Text>
          <Text style={styles.emptySubtitle}>@IDで友達を検索して申請しましょう</Text>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => router.push('/friend/search')}
          >
            <Text style={styles.addBtnText}>フレンドを追加</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={friends}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.friendItem}
              onPress={() => startChat(item.friend.id)}
              activeOpacity={0.7}
              disabled={!!startingId}
            >
              <View style={styles.friendLeft}>
                <TouchableOpacity onPress={() => router.push(`/profile/${item.friend.id}`)}>
                  <Avatar
                    uri={item.friend.avatar_url}
                    name={item.friend.display_name || item.friend.handle}
                    size={50}
                    online={item.friend.is_online}
                  />
                </TouchableOpacity>
                <View style={styles.friendInfo}>
                  <Text style={styles.friendName}>
                    {item.friend.display_name || item.friend.handle}
                  </Text>
                  <Text style={styles.friendHandle}>@{item.friend.handle}</Text>
                </View>
              </View>
              {startingId === item.friend.id ? (
                <ActivityIndicator size="small" color={Colors.primary} />
              ) : (
                <View style={styles.chatBtn}>
                  <MessageCircle size={20} color={Colors.primary} />
                </View>
              )}
            </TouchableOpacity>
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
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.separator,
  },
  headerTitle: { fontSize: 22, fontWeight: '800', color: Colors.primary },
  headerActions: { flexDirection: 'row', gap: 8 },
  headerBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: Colors.surface,
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: Colors.error,
    borderRadius: 8,
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: Colors.white, fontSize: 9, fontWeight: '700' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty:{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary, textAlign: 'center' },
  emptySubtitle: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20 },
  addBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
    marginTop: 8,
  },
  addBtnText: { color: Colors.white, fontWeight: '600', fontSize: 15 },
  friendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.white,
    justifyContent: 'space-between',
  },
  friendLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  friendInfo: { gap: 2 },
  friendName: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
  friendHandle: { fontSize: 12, color: Colors.textMuted },
  chatBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  separator: { height: 1, backgroundColor: Colors.separator, marginLeft: 78 },
});
