import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { ChevronLeft, MessageCircle, UserPlus, Check, UserMinus } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { UserProfile, Friendship } from '@/types/database';
import { Avatar } from '@/components/Avatar';
import { Colors } from '@/lib/colors';
import { PhotoGallery } from '@/components/PhotoGallery';

export default function UserProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuthStore();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [friendship, setFriendship] = useState<Friendship | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);

  const myId = session?.user?.id;

  useEffect(() => {
    if (!id || !myId) return;

    Promise.all([
      supabase.from('users').select('*').eq('id', id).maybeSingle(),
      supabase
        .from('friendships')
        .select('*')
        .or(
          `and(requester_id.eq.${myId},addressee_id.eq.${id}),and(requester_id.eq.${id},addressee_id.eq.${myId})`
        )
        .maybeSingle(),
    ]).then(([userRes, friendRes]) => {
      setProfile(userRes.data);
      setFriendship(friendRes.data);
      setLoading(false);
    });
  }, [id, myId]);

  const sendRequest = async () => {
    if (!myId || !id || acting) return;
    setActing(true);
    const { data } = await supabase
      .from('friendships')
      .insert({ requester_id: myId, addressee_id: id })
      .select()
      .single();
    if (data) setFriendship(data);
    setActing(false);
  };

  const startChat = async () => {
    if (!myId || !id) return;
    const p1 = myId < id ? myId : id;
    const p2 = myId < id ? id : myId;

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

    if (existing) router.push(`/chat/${existing.id}`);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Text style={styles.notFound}>ユーザーが見つかりません</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isSelf = myId === profile.id;
  const isFriend = friendship?.status === 'accepted';
  const isPending = friendship?.status === 'pending';
  const iAmRequester = friendship?.requester_id === myId;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ChevronLeft size={24} color={Colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {profile.display_name || profile.handle}のプロフィール
        </Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView>
        <View style={styles.coverBg} />

        <View style={styles.profileSection}>
          <Avatar
            uri={profile.avatar_url}
            name={profile.display_name || profile.handle}
            size={88}
            online={profile.is_online}
            style={styles.avatar}
          />
          <Text style={styles.displayName}>{profile.display_name || profile.handle}</Text>
          <Text style={styles.handle}>@{profile.handle}</Text>
          {profile.bio ? (
            <Text style={styles.bio}>{profile.bio}</Text>
          ) : null}
          <Text style={styles.joined}>
            {new Date(profile.created_at).toLocaleDateString('ja-JP', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })} 参加
          </Text>
        </View>

        {!isSelf && (
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.chatBtn} onPress={startChat}>
              <MessageCircle size={18} color={Colors.white} />
              <Text style={styles.chatBtnText}>メッセージ</Text>
            </TouchableOpacity>

            {isFriend ? (
              <View style={styles.friendBadge}>
                <Check size={16} color={Colors.success} />
                <Text style={styles.friendBadgeText}>フレンド</Text>
              </View>
            ) : isPending && iAmRequester ? (
              <View style={[styles.friendBadge, { backgroundColor: Colors.surface }]}>
                <Text style={[styles.friendBadgeText, { color: Colors.secondary }]}>申請済</Text>
              </View>
            ) : isPending && !iAmRequester ? (
              <TouchableOpacity
                style={styles.acceptBtn}
                onPress={async () => {
                  if (!friendship) return;
                  setActing(true);
                  await supabase
                    .from('friendships')
                    .update({ status: 'accepted' })
                    .eq('id', friendship.id);
                  setFriendship({ ...friendship, status: 'accepted' });
                  setActing(false);
                }}
                disabled={acting}
              >
                <Check size={16} color={Colors.white} />
                <Text style={styles.acceptBtnText}>申請を承認</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.addBtn}
                onPress={sendRequest}
                disabled={acting}
              >
                {acting
                  ? <ActivityIndicator size="small" color={Colors.white} />
                  : <><UserPlus size={16} color={Colors.white} /><Text style={styles.addBtnText}>申請する</Text></>}
              </TouchableOpacity>
            )}
          </View>
        )}

        <PhotoGallery userId={profile.id} isOwner={isSelf} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  notFound: { fontSize: 16, color: Colors.textSecondary },
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
  coverBg: { height: 100, backgroundColor: Colors.primary },
  profileSection: {
    alignItems: 'center',
    marginTop: -44,
    paddingBottom: 24,
    paddingHorizontal: 24,
    gap: 6,
  },
  avatar: { marginBottom: 4 },
  displayName: { fontSize: 22, fontWeight: '800', color: Colors.textPrimary },
  handle: { fontSize: 14, color: Colors.textMuted },
  bio: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 4,
    maxWidth: 280,
  },
  joined: { fontSize: 12, color: Colors.textMuted, marginTop: 4 },
  actionRow: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    gap: 12,
    marginBottom: 24,
  },
  chatBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
  },
  chatBtnText: { color: Colors.white, fontWeight: '600', fontSize: 15 },
  friendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  friendBadgeText: { color: Colors.success, fontWeight: '600', fontSize: 14 },
  acceptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.success,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  acceptBtnText: { color: Colors.white, fontWeight: '600', fontSize: 14 },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.secondary,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minWidth: 80,
    justifyContent: 'center',
  },
  addBtnText: { color: Colors.white, fontWeight: '600', fontSize: 14 },
});
