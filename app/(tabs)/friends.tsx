import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Animated,
  Modal,
  TextInput,
  Alert,
  ScrollView,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { UserPlus, Bell, MessageCircle, Users, Plus, X, Trash2, UserMinus } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { Friendship, UserProfile } from '@/types/database';
import { Avatar } from '@/components/Avatar';
import { Colors } from '@/lib/colors';
import { useColors } from '@/lib/theme';

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
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: Colors.white, gap: 12 },
  avatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: Colors.border },
  body: { flex: 1, gap: 8 },
  lineName: { height: 14, width: '45%', borderRadius: 7, backgroundColor: Colors.border },
  lineHandle: { height: 11, width: '30%', borderRadius: 5, backgroundColor: Colors.surface },
  actionBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.border },
  sep: { height: 1, backgroundColor: Colors.separator, marginLeft: 78 },
});

type FriendWithUser = Friendship & { friend: UserProfile };

interface FriendGroup {
  id: string;
  name: string;
  owner_id: string;
  created_at: string;
  members?: UserProfile[];
}

export default function FriendsScreen() {
  const { session } = useAuthStore();
  const C = useColors();
  const [friends, setFriends] = useState<FriendWithUser[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [startingId, setStartingId] = useState<string | null>(null);

  const [groups, setGroups] = useState<FriendGroup[]>([]);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [selectedFriendIds, setSelectedFriendIds] = useState<string[]>([]);
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<FriendGroup | null>(null);

  // Add-to-group action menu
  const [actionFriend, setActionFriend] = useState<UserProfile | null>(null);
  // Add member to existing group (from detail modal)
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);

  // Group message modal

  const fetchFriends = useCallback(async () => {
    if (!session?.user) return;
    const userId = session.user.id;
    const { data, error } = await supabase
      .from('friendships')
      .select('*')
      .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
      .eq('status', 'accepted');

    if (error || !data) { setLoading(false); setRefreshing(false); return; }

    const enriched: FriendWithUser[] = await Promise.all(
      data.map(async (f) => {
        const friendId = f.requester_id === userId ? f.addressee_id : f.requester_id;
        const { data: user } = await supabase.from('users').select('*').eq('id', friendId).maybeSingle();
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

  const fetchGroups = useCallback(async () => {
    if (!session?.user) return;
    const userId = session.user.id;
    const { data: groupData } = await supabase
      .from('friend_groups')
      .select('*')
      .eq('owner_id', userId)
      .order('created_at', { ascending: false });

    if (!groupData) return;
    const withMembers = await Promise.all(
      (groupData as any[]).map(async (g) => {
        const { data: memberRows } = await supabase
          .from('friend_group_members')
          .select('user_id')
          .eq('group_id', g.id);
        const memberIds = (memberRows ?? []).map((m: any) => m.user_id);
        let members: UserProfile[] = [];
        if (memberIds.length > 0) {
          const { data: users } = await supabase.from('users').select('*').in('id', memberIds);
          members = (users ?? []) as UserProfile[];
        }
        return { ...g, members };
      })
    );
    setGroups(withMembers);
  }, [session]);

  const refreshSelectedGroup = useCallback(async (groupId: string) => {
    const { data: memberRows } = await supabase
      .from('friend_group_members')
      .select('user_id')
      .eq('group_id', groupId);
    const memberIds = (memberRows ?? []).map((m: any) => m.user_id);
    let members: UserProfile[] = [];
    if (memberIds.length > 0) {
      const { data: users } = await supabase.from('users').select('*').in('id', memberIds);
      members = (users ?? []) as UserProfile[];
    }
    setSelectedGroup((prev) => prev ? { ...prev, members } : prev);
    setGroups((prev) => prev.map((g) => g.id === groupId ? { ...g, members } : g));
  }, []);

  useEffect(() => {
    fetchFriends();
    fetchGroups();
  }, [fetchFriends, fetchGroups]);

  const createGroup = async () => {
    if (!groupName.trim() || !session?.user) return;
    setCreatingGroup(true);
    const userId = session.user.id;
    const { data: group, error } = await supabase
      .from('friend_groups')
      .insert({ owner_id: userId, name: groupName.trim() })
      .select()
      .single();

    if (error || !group) { setCreatingGroup(false); return; }
    if (selectedFriendIds.length > 0) {
      await supabase.from('friend_group_members').insert(
        selectedFriendIds.map((uid) => ({ group_id: (group as any).id, user_id: uid }))
      );
    }
    setGroupName('');
    setSelectedFriendIds([]);
    setShowCreateGroup(false);
    setCreatingGroup(false);
    fetchGroups();
  };

  const deleteGroup = (groupId: string) => {
    Alert.alert('グループを削除', 'このグループを削除しますか？', [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: '削除', style: 'destructive',
        onPress: async () => {
          await supabase.from('friend_groups').delete().eq('id', groupId);
          setSelectedGroup(null);
          fetchGroups();
        },
      },
    ]);
  };

  const addMemberToGroup = async (groupId: string, userId: string, groupName: string, friendName: string) => {
    const { error } = await supabase
      .from('friend_group_members')
      .insert({ group_id: groupId, user_id: userId });

    if (error) {
      if (error.code === '23505') {
        Alert.alert('エラー', 'すでにグループに追加されています');
      } else {
        Alert.alert('エラー', 'グループへの追加に失敗しました');
      }
      return;
    }
    Alert.alert('完了', `${friendName}を${groupName}に追加しました`);
    setActionFriend(null);
    fetchGroups();
  };

  const removeMemberFromGroup = async (groupId: string, userId: string) => {
    Alert.alert('メンバーを削除', 'このメンバーをグループから削除しますか？', [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: '削除', style: 'destructive',
        onPress: async () => {
          const { error } = await supabase
            .from('friend_group_members')
            .delete()
            .eq('group_id', groupId)
            .eq('user_id', userId);
          if (error) {
            Alert.alert('エラー', 'メンバーの削除に失敗しました');
            return;
          }
          refreshSelectedGroup(groupId);
        },
      },
    ]);
  };

  const startGroupConversation = async (group: FriendGroup) => {
    if (!session?.user) return;
    const userId = session.user.id;
    const members = group.members ?? [];
    if (members.length === 0) {
      Alert.alert('メンバーがいません', 'グループにメンバーを追加してからチャットを開始してください。');
      return;
    }

    const { data: gc, error } = await (supabase.from('group_conversations' as any) as any)
      .insert({ name: group.name, owner_id: userId })
      .select()
      .single();

    if (error || !gc) {
      Alert.alert('エラー', 'グループチャットの作成に失敗しました。');
      return;
    }

    const allIds = [...new Set([userId, ...members.map((m) => m.id)])];
    await (supabase.from('group_members' as any) as any).insert(
      allIds.map((uid) => ({ group_id: (gc as any).id, user_id: uid }))
    );

    setSelectedGroup(null);
    router.push(`/group-chat/${(gc as any).id}`);
  };

  const startChat = async (friendId: string) => {
    if (!session?.user || startingId) return;
    setStartingId(friendId);
    const userId = session.user.id;
    const p1 = userId < friendId ? userId : friendId;
    const p2 = userId < friendId ? friendId : userId;
    let { data: existing } = await supabase
      .from('conversations').select('id')
      .eq('participant_1_id', p1).eq('participant_2_id', p2).maybeSingle();
    if (!existing) {
      const { data: created } = await supabase
        .from('conversations')
        .insert({ participant_1_id: p1, participant_2_id: p2 })
        .select('id').single();
      existing = created;
    }
    if (existing) router.push(`/chat/${(existing as any).id}`);
    setStartingId(null);
  };

  // Friends not yet in the selected group
  const friendsNotInGroup = selectedGroup
    ? friends.filter((f) => !selectedGroup.members?.some((m) => m.id === f.friend.id))
    : friends;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: C.primary }]}>フレンド</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerBtn} onPress={() => router.push('/friend/requests')}>
            <Bell size={20} color={C.primary} />
            {pendingCount > 0 && (
              <View style={styles.badge}><Text style={styles.badgeText}>{pendingCount}</Text></View>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerBtn} onPress={() => router.push('/friend/search')}>
            <UserPlus size={20} color={C.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <FriendsListSkeleton />
      ) : (
        <ScrollView
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); fetchFriends(); fetchGroups(); }}
              tintColor={C.primary}
            />
          }
        >
          {/* グループセクション */}
          <View style={styles.sectionHeader}>
            <View style={styles.sectionLeft}>
              <Users size={14} color={C.primary} />
              <Text style={styles.sectionLabel}>グループ</Text>
            </View>
            <TouchableOpacity
              style={[styles.createGroupBtn, { backgroundColor: C.primary }]}
              onPress={() => setShowCreateGroup(true)}
            >
              <Plus size={13} color={Colors.white} />
              <Text style={styles.createGroupText}>作成</Text>
            </TouchableOpacity>
          </View>

          {groups.length === 0 ? (
            <View style={styles.groupEmpty}>
              <Text style={styles.groupEmptyText}>グループがありません</Text>
            </View>
          ) : (
            groups.map((group) => (
              <TouchableOpacity key={group.id} style={styles.groupItem} onPress={() => setSelectedGroup(group)} activeOpacity={0.7}>
                <View style={styles.groupIcon}><Users size={18} color={C.primary} /></View>
                <View style={styles.groupInfo}>
                  <Text style={styles.groupName}>{group.name}</Text>
                  <Text style={styles.groupMemberCount}>{group.members?.length ?? 0}人のメンバー</Text>
                </View>
                <TouchableOpacity onPress={() => deleteGroup(group.id)} style={styles.deleteBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Trash2 size={16} color={Colors.error} />
                </TouchableOpacity>
              </TouchableOpacity>
            ))
          )}

          {/* フレンドセクション */}
          <View style={styles.sectionHeader}>
            <View style={styles.sectionLeft}>
              <Text style={styles.sectionLabel}>フレンド ({friends.length})</Text>
            </View>
          </View>

          {friends.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>フレンドがいません</Text>
              <Text style={styles.emptySubtitle}>@IDで友達を検索して申請しましょう</Text>
              <TouchableOpacity
                style={[styles.addBtn, { backgroundColor: C.primary }]}
                onPress={() => router.push('/friend/search')}
              >
                <Text style={styles.addBtnText}>フレンドを追加</Text>
              </TouchableOpacity>
            </View>
          ) : (
            friends.map((item, index) => (
              <View key={item.id}>
                <TouchableOpacity
                  style={styles.friendItem}
                  onPress={() => startChat(item.friend.id)}
                  onLongPress={() => setActionFriend(item.friend)}
                  activeOpacity={0.7}
                  disabled={!!startingId}
                  delayLongPress={400}
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
                      <Text style={styles.friendName}>{item.friend.display_name || item.friend.handle}</Text>
                      <Text style={styles.friendHandle}>@{item.friend.handle}</Text>
                    </View>
                  </View>
                  {startingId === item.friend.id
                    ? <ActivityIndicator size="small" color={C.primary} />
                    : <View style={styles.chatBtn}><MessageCircle size={20} color={C.primary} /></View>}
                </TouchableOpacity>
                {index < friends.length - 1 && <View style={styles.separator} />}
              </View>
            ))
          )}
        </ScrollView>
      )}

      {/* ── フレンド長押しアクションメニュー ── */}
      <Modal visible={!!actionFriend} transparent animationType="slide" onRequestClose={() => setActionFriend(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.actionMenuContainer}>
            <View style={styles.actionMenuHeader}>
              <Text style={styles.actionMenuTitle} numberOfLines={1}>
                {actionFriend?.display_name || actionFriend?.handle} をグループに追加
              </Text>
              <TouchableOpacity onPress={() => setActionFriend(null)}>
                <X size={22} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>
            {groups.length === 0 ? (
              <View style={styles.actionMenuEmpty}>
                <Text style={styles.actionMenuEmptyText}>グループがありません</Text>
                <Text style={styles.actionMenuEmptySub}>先にグループを作成してください</Text>
              </View>
            ) : (
              <FlatList
                data={groups}
                keyExtractor={(g) => g.id}
                style={styles.actionMenuList}
                renderItem={({ item: group }) => {
                  const alreadyIn = group.members?.some((m) => m.id === actionFriend?.id);
                  return (
                    <TouchableOpacity
                      style={[styles.actionMenuItem, alreadyIn && styles.actionMenuItemDisabled]}
                      onPress={() => {
                        if (!actionFriend || alreadyIn) return;
                        addMemberToGroup(
                          group.id,
                          actionFriend.id,
                          group.name,
                          actionFriend.display_name || actionFriend.handle
                        );
                      }}
                      activeOpacity={alreadyIn ? 1 : 0.7}
                    >
                      <View style={[styles.actionMenuGroupIcon, { backgroundColor: C.surface }]}>
                        <Users size={18} color={C.primary} />
                      </View>
                      <View style={styles.actionMenuGroupInfo}>
                        <Text style={styles.actionMenuGroupName}>{group.name}</Text>
                        <Text style={styles.actionMenuGroupCount}>{group.members?.length ?? 0}人</Text>
                      </View>
                      {alreadyIn
                        ? <Text style={styles.actionMenuAlready}>追加済み</Text>
                        : <Text style={[styles.actionMenuArrow, { color: C.primary }]}>›</Text>}
                    </TouchableOpacity>
                  );
                }}
              />
            )}
          </View>
        </View>
      </Modal>

      {/* グループ作成モーダル */}
      <Modal visible={showCreateGroup} animationType="slide" transparent onRequestClose={() => setShowCreateGroup(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>グループを作成</Text>
              <TouchableOpacity onPress={() => setShowCreateGroup(false)}>
                <X size={22} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.groupNameInput}
              placeholder="グループ名を入力"
              placeholderTextColor={Colors.textMuted}
              value={groupName}
              onChangeText={setGroupName}
              maxLength={30}
            />
            <Text style={styles.selectFriendsLabel}>メンバーを選択</Text>
            <ScrollView style={styles.friendSelectList} showsVerticalScrollIndicator={false}>
              {friends.map((item) => {
                const selected = selectedFriendIds.includes(item.friend.id);
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.friendSelectItem, selected && { backgroundColor: C.surface }]}
                    onPress={() => setSelectedFriendIds((p) =>
                      p.includes(item.friend.id) ? p.filter((x) => x !== item.friend.id) : [...p, item.friend.id]
                    )}
                    activeOpacity={0.7}
                  >
                    <Avatar uri={item.friend.avatar_url} name={item.friend.display_name || item.friend.handle} size={40} />
                    <Text style={[styles.friendSelectName, selected && { color: C.primary, fontWeight: '600' }]}>
                      {item.friend.display_name || item.friend.handle}
                    </Text>
                    {selected && (
                      <View style={[styles.checkMark, { backgroundColor: C.primary }]}>
                        <Text style={styles.checkMarkText}>✓</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <TouchableOpacity
              style={[styles.createBtn, { backgroundColor: C.primary }, (!groupName.trim() || creatingGroup) && styles.createBtnDisabled]}
              onPress={createGroup}
              disabled={!groupName.trim() || creatingGroup}
            >
              {creatingGroup
                ? <ActivityIndicator size="small" color={Colors.white} />
                : <Text style={styles.createBtnText}>グループを作成</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* グループ詳細モーダル */}
      <Modal visible={!!selectedGroup} animationType="slide" transparent onRequestClose={() => { setSelectedGroup(null); setShowAddMemberModal(false); }}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{selectedGroup?.name}</Text>
              <TouchableOpacity onPress={() => { setSelectedGroup(null); setShowAddMemberModal(false); }}>
                <X size={22} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {!showAddMemberModal ? (
              <>
                <Text style={styles.selectFriendsLabel}>
                  メンバー ({selectedGroup?.members?.length ?? 0}人)
                </Text>
                <ScrollView style={styles.friendSelectList} showsVerticalScrollIndicator={false}>
                  {(selectedGroup?.members ?? []).map((member) => (
                    <View key={member.id} style={styles.memberItem}>
                      <Avatar uri={member.avatar_url} name={member.display_name || member.handle} size={44} />
                      <View style={styles.memberInfo}>
                        <Text style={styles.memberName}>{member.display_name || member.handle}</Text>
                        <Text style={styles.memberHandle}>@{member.handle}</Text>
                      </View>
                      <TouchableOpacity
                        style={styles.removeMemberBtn}
                        onPress={() => selectedGroup && removeMemberFromGroup(selectedGroup.id, member.id)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <UserMinus size={16} color={Colors.error} />
                      </TouchableOpacity>
                    </View>
                  ))}
                  {(selectedGroup?.members ?? []).length === 0 && (
                    <Text style={styles.noMembersText}>メンバーがいません</Text>
                  )}
                </ScrollView>

                <TouchableOpacity
                  style={[styles.sendAllMsgBtn, { backgroundColor: C.primary }]}
                  onPress={() => selectedGroup && startGroupConversation(selectedGroup)}
                >
                  <MessageCircle size={16} color={Colors.white} />
                  <Text style={styles.sendAllMsgBtnText}>グループにメッセージを送る</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.addMemberBtn, { borderColor: C.primary }]}
                  onPress={() => setShowAddMemberModal(true)}
                >
                  <Plus size={16} color={C.primary} />
                  <Text style={[styles.addMemberBtnText, { color: C.primary }]}>メンバーを追加</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.deleteGroupBtn}
                  onPress={() => selectedGroup && deleteGroup(selectedGroup.id)}
                >
                  <Trash2 size={16} color={Colors.error} />
                  <Text style={styles.deleteGroupBtnText}>グループを削除</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <View style={styles.addMemberHeader}>
                  <TouchableOpacity onPress={() => setShowAddMemberModal(false)} style={styles.backArrowBtn}>
                    <Text style={[styles.backArrowText, { color: C.primary }]}>← 戻る</Text>
                  </TouchableOpacity>
                  <Text style={styles.selectFriendsLabel}>追加するフレンドを選択</Text>
                </View>
                <ScrollView style={styles.friendSelectList} showsVerticalScrollIndicator={false}>
                  {friendsNotInGroup.length === 0 ? (
                    <Text style={styles.noMembersText}>追加できるフレンドがいません</Text>
                  ) : (
                    friendsNotInGroup.map((item) => (
                      <TouchableOpacity
                        key={item.id}
                        style={styles.friendSelectItem}
                        onPress={async () => {
                          if (!selectedGroup) return;
                          const { error } = await supabase
                            .from('friend_group_members')
                            .insert({ group_id: selectedGroup.id, user_id: item.friend.id });
                          if (error) {
                            Alert.alert('エラー', 'メンバーの追加に失敗しました');
                            return;
                          }
                          await refreshSelectedGroup(selectedGroup.id);
                          setShowAddMemberModal(false);
                        }}
                        activeOpacity={0.7}
                      >
                        <Avatar uri={item.friend.avatar_url} name={item.friend.display_name || item.friend.handle} size={40} />
                        <View style={styles.memberInfo}>
                          <Text style={styles.friendSelectName}>{item.friend.display_name || item.friend.handle}</Text>
                          <Text style={styles.memberHandle}>@{item.friend.handle}</Text>
                        </View>
                        <Text style={[styles.actionMenuArrow, { color: C.primary }]}>›</Text>
                      </TouchableOpacity>
                    ))
                  )}
                </ScrollView>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16,
    backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.separator,
  },
  headerTitle: { fontSize: 22, fontWeight: '800' },
  headerActions: { flexDirection: 'row', gap: 8 },
  headerBtn: {
    width: 40, height: 40, alignItems: 'center', justifyContent: 'center',
    borderRadius: 20, backgroundColor: Colors.surface, position: 'relative',
  },
  badge: {
    position: 'absolute', top: 4, right: 4, backgroundColor: Colors.error,
    borderRadius: 8, width: 16, height: 16, alignItems: 'center', justifyContent: 'center',
  },
  badgeText: { color: Colors.white, fontSize: 9, fontWeight: '700' },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 10, backgroundColor: Colors.surface,
    borderTopWidth: 1, borderBottomWidth: 1, borderColor: Colors.separator,
  },
  sectionLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sectionLabel: { fontSize: 12, fontWeight: '700', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 1 },
  createGroupBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderRadius: 12, paddingHorizontal: 10, paddingVertical: 5,
  },
  createGroupText: { color: Colors.white, fontSize: 12, fontWeight: '600' },
  groupEmpty: { paddingVertical: 14, paddingHorizontal: 16, backgroundColor: Colors.white },
  groupEmptyText: { fontSize: 13, color: Colors.textMuted },
  groupItem: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.separator, gap: 12,
  },
  groupIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#E3F2FD', alignItems: 'center', justifyContent: 'center' },
  groupInfo: { flex: 1 },
  groupName: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
  groupMemberCount: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  deleteBtn: { padding: 4 },
  empty: { alignItems: 'center', gap: 12, paddingHorizontal: 40, paddingVertical: 40 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary, textAlign: 'center' },
  emptySubtitle: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20 },
  addBtn: { borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12, marginTop: 8 },
  addBtnText: { color: Colors.white, fontWeight: '600', fontSize: 15 },
  friendItem: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: Colors.white, justifyContent: 'space-between',
  },
  friendLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  friendInfo: { gap: 2 },
  friendName: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
  friendHandle: { fontSize: 12, color: Colors.textMuted },
  chatBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center' },
  separator: { height: 1, backgroundColor: Colors.separator, marginLeft: 78 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContainer: {
    backgroundColor: Colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingTop: 20, paddingHorizontal: 20, paddingBottom: 36, maxHeight: '80%',
  },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  groupNameInput: {
    backgroundColor: Colors.surface, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12,
    fontSize: 15, color: Colors.textPrimary, borderWidth: 1, borderColor: Colors.border, marginBottom: 16,
  },
  selectFriendsLabel: { fontSize: 12, fontWeight: '700', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
  friendSelectList: { maxHeight: 220, marginBottom: 12 },
  friendSelectItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 8, borderRadius: 12, gap: 12, marginBottom: 2 },
  friendSelectName: { flex: 1, fontSize: 15, color: Colors.textPrimary, fontWeight: '500' },
  checkMark: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  checkMarkText: { color: Colors.white, fontSize: 13, fontWeight: '700' },
  createBtn: { borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  createBtnDisabled: { opacity: 0.5 },
  createBtnText: { color: Colors.white, fontSize: 15, fontWeight: '700' },
  memberItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 12 },
  memberInfo: { flex: 1 },
  memberName: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
  memberHandle: { fontSize: 12, color: Colors.textMuted },
  noMembersText: { fontSize: 14, color: Colors.textMuted, textAlign: 'center', paddingVertical: 16 },
  removeMemberBtn: { padding: 6 },
  addMemberBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, borderRadius: 12, paddingVertical: 12, marginBottom: 8,
    borderWidth: 1.5,
  },
  addMemberBtnText: { fontWeight: '600', fontSize: 15 },
  addMemberHeader: { marginBottom: 8 },
  backArrowBtn: { marginBottom: 6 },
  backArrowText: { fontSize: 14, fontWeight: '600' },
  deleteGroupBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 12, backgroundColor: '#FFEBEE', marginTop: 4 },
  deleteGroupBtnText: { color: Colors.error, fontWeight: '600', fontSize: 14 },
  sendAllMsgBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, borderRadius: 12, paddingVertical: 13, marginBottom: 8,
  },
  sendAllMsgBtnText: { fontWeight: '700', fontSize: 15, color: Colors.white },
  // Long-press action menu
  actionMenuContainer: {
    backgroundColor: Colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingBottom: 36, maxHeight: '70%',
  },
  actionMenuHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 20, borderBottomWidth: 1, borderBottomColor: Colors.separator,
  },
  actionMenuTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary, flex: 1, marginRight: 12 },
  actionMenuList: { maxHeight: 320 },
  actionMenuEmpty: { padding: 32, alignItems: 'center' },
  actionMenuEmptyText: { fontSize: 16, color: Colors.textPrimary, fontWeight: '600', marginBottom: 6 },
  actionMenuEmptySub: { fontSize: 13, color: Colors.textMuted, textAlign: 'center' },
  actionMenuItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: Colors.separator, gap: 12,
  },
  actionMenuItemDisabled: { opacity: 0.45 },
  actionMenuGroupIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  actionMenuGroupInfo: { flex: 1 },
  actionMenuGroupName: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
  actionMenuGroupCount: { fontSize: 12, color: Colors.textMuted, marginTop: 1 },
  actionMenuAlready: { fontSize: 12, color: Colors.textMuted, fontWeight: '600' },
  actionMenuArrow: { fontSize: 22, fontWeight: '300' },
});
