import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Keyboard,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { ChevronLeft, Send, Users, Smile, Sticker } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { GroupConversation, GroupMessage, UserProfile } from '@/types/database';
import { Avatar } from '@/components/Avatar';
import { EmojiPicker } from '@/components/EmojiPicker';
import { StickerPicker, Sticker as StickerType } from '@/components/StickerPicker';
import { Colors } from '@/lib/colors';
import { useColors } from '@/lib/theme';

const PAGE_SIZE = 50;
type PanelType = 'none' | 'emoji' | 'sticker';

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
}

export default function GroupChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuthStore();
  const C = useColors();
  const userId = session?.user?.id;

  const [groupConv, setGroupConv] = useState<GroupConversation | null>(null);
  const [members, setMembers] = useState<UserProfile[]>([]);
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [senderMap, setSenderMap] = useState<Record<string, UserProfile>>({});
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [panel, setPanel] = useState<PanelType>('none');
  const [showMembers, setShowMembers] = useState(false);

  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);

  const scrollToBottom = useCallback((animated = true) => {
    flatListRef.current?.scrollToOffset({ offset: 0, animated });
  }, []);

  const fetchData = useCallback(async () => {
    if (!id || !userId) return;

    const [{ data: gc }, { data: memberRows }, { data: msgs }] = await Promise.all([
      supabase.from('group_conversations' as any).select('*').eq('id', id).maybeSingle(),
      supabase.from('group_members' as any).select('user_id').eq('group_id', id),
      supabase
        .from('group_messages' as any)
        .select('*')
        .eq('group_id', id)
        .order('created_at', { ascending: false })
        .limit(PAGE_SIZE),
    ]);

    setGroupConv(gc as GroupConversation);
    setHasMore((msgs?.length ?? 0) === PAGE_SIZE);

    const memberIds = ((memberRows ?? []) as any[]).map((m: any) => m.user_id);
    if (memberIds.length > 0) {
      const { data: users } = await supabase.from('users').select('*').in('id', memberIds);
      const memberList = (users ?? []) as UserProfile[];
      setMembers(memberList);
      const map: Record<string, UserProfile> = {};
      memberList.forEach((u) => { map[u.id] = u; });
      setSenderMap(map);
    }

    setMessages((msgs ?? []) as GroupMessage[]);
    setLoading(false);
  }, [id, userId]);

  const loadMoreMessages = useCallback(async () => {
    if (!id || !hasMore || isLoadingMore) return;
    setIsLoadingMore(true);

    const { data } = await supabase
      .from('group_messages' as any)
      .select('*')
      .eq('group_id', id)
      .order('created_at', { ascending: false })
      .range(messages.length, messages.length + PAGE_SIZE - 1);

    if (data && data.length > 0) {
      setMessages((prev) => [...prev, ...(data as GroupMessage[])]);
      setHasMore(data.length === PAGE_SIZE);
    } else {
      setHasMore(false);
    }
    setIsLoadingMore(false);
  }, [id, hasMore, isLoadingMore, messages.length]);

  useEffect(() => {
    fetchData();

    const channel = supabase
      .channel(`group_conv_${id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'group_messages', filter: `group_id=eq.${id}` },
        async (payload) => {
          const newMsg = payload.new as GroupMessage;
          setMessages((prev) => prev.find((m) => m.id === newMsg.id) ? prev : [newMsg, ...prev]);
          if (newMsg.sender_id !== userId) {
            if (!senderMap[newMsg.sender_id]) {
              const { data: u } = await supabase.from('users').select('*').eq('id', newMsg.sender_id).maybeSingle();
              if (u) setSenderMap((prev) => ({ ...prev, [(u as UserProfile).id]: u as UserProfile }));
            }
            if (Platform.OS !== 'web') {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'group_messages', filter: `group_id=eq.${id}` },
        (payload) => {
          const updated = payload.new as GroupMessage;
          setMessages((prev) => prev.map((m) => m.id === updated.id ? updated : m));
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchData, id, userId]);

  const openPanel = (type: PanelType) => {
    Keyboard.dismiss();
    setPanel((prev) => (prev === type ? 'none' : type));
  };

  const closePanel = () => setPanel('none');

  const makeTempMessage = (overrides: Partial<GroupMessage> & { message_type: GroupMessage['message_type'] }): GroupMessage => ({
    id: `temp_${Date.now()}_${Math.random()}`,
    group_id: id as string,
    sender_id: userId!,
    content: null,
    image_url: null,
    is_deleted: false,
    reply_to_id: null,
    created_at: new Date().toISOString(),
    ...overrides,
  });

  const resolveTemp = (tempId: string, real: GroupMessage) => {
    setMessages((prev) =>
      prev.some((m) => m.id === real.id)
        ? prev.filter((m) => m.id !== tempId)
        : prev.map((m) => m.id === tempId ? real : m)
    );
  };

  const sendMessage = async (content: string, type: GroupMessage['message_type'] = 'text') => {
    if (!content.trim() || !userId || !id || sending) return;
    setSending(true);

    const temp = makeTempMessage({ message_type: type, content: content.trim() });
    setMessages((prev) => [temp, ...prev]);
    scrollToBottom();

    const { data: msg, error } = await (supabase.from('group_messages' as any) as any)
      .insert({
        group_id: id,
        sender_id: userId,
        message_type: type,
        content: content.trim(),
      })
      .select()
      .single();

    if (!error && msg) {
      resolveTemp(temp.id, msg as GroupMessage);
      (supabase.from('group_conversations' as any) as any)
        .update({ last_message_at: (msg as GroupMessage).created_at })
        .eq('id', id);
    } else {
      setMessages((prev) => prev.filter((m) => m.id !== temp.id));
    }
    setSending(false);
  };

  const handleSend = async () => {
    const content = text;
    setText('');
    await sendMessage(content);
  };

  const handleStickerSelect = async (sticker: StickerType) => {
    closePanel();
    await sendMessage(sticker.emoji, 'sticker');
  };

  const handleDeleteMessage = (msg: GroupMessage) => {
    if (msg.sender_id !== userId) return;
    Alert.alert('メッセージを削除', '削除しますか？', [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: '削除', style: 'destructive',
        onPress: () => {
          (supabase.from('group_messages' as any) as any)
            .update({ is_deleted: true })
            .eq('id', msg.id);
        },
      },
    ]);
  };

  const renderMessage = useCallback(({ item, index }: { item: GroupMessage; index: number }) => {
    const isOwn = item.sender_id === userId;
    const sender = senderMap[item.sender_id];
    const prevMsg = index < messages.length - 1 ? messages[index + 1] : null;
    const showAvatar = !isOwn && (!prevMsg || prevMsg.sender_id !== item.sender_id);
    const showName = !isOwn && showAvatar;

    if (item.is_deleted) {
      return (
        <View style={[styles.msgRow, isOwn ? styles.msgRowOwn : styles.msgRowOther]}>
          {!isOwn && <View style={{ width: 34 }} />}
          <View style={styles.deletedBubble}>
            <Text style={styles.deletedText}>メッセージが削除されました</Text>
          </View>
        </View>
      );
    }

    if (item.message_type === 'sticker' || item.message_type === 'stamp') {
      return (
        <View style={[styles.msgRow, isOwn ? styles.msgRowOwn : styles.msgRowOther]}>
          {!isOwn && (
            showAvatar
              ? <Avatar uri={sender?.avatar_url} name={sender?.display_name || sender?.handle} size={30} />
              : <View style={{ width: 30 }} />
          )}
          <View style={styles.msgColumn}>
            {showName && (
              <Text style={[styles.senderName, { color: C.primary }]}>
                {sender?.display_name || sender?.handle}
              </Text>
            )}
            <Text style={styles.sticker}>{item.content}</Text>
          </View>
        </View>
      );
    }

    if (item.message_type === 'image' && item.image_url) {
      return (
        <View style={[styles.msgRow, isOwn ? styles.msgRowOwn : styles.msgRowOther]}>
          {!isOwn && (
            showAvatar
              ? <Avatar uri={sender?.avatar_url} name={sender?.display_name || sender?.handle} size={30} />
              : <View style={{ width: 30 }} />
          )}
          <View style={styles.msgColumn}>
            {showName && (
              <Text style={[styles.senderName, { color: C.primary }]}>
                {sender?.display_name || sender?.handle}
              </Text>
            )}
            <TouchableOpacity onLongPress={() => handleDeleteMessage(item)} activeOpacity={0.9}>
              <Image source={{ uri: item.image_url }} style={styles.imageBubble} resizeMode="cover" />
            </TouchableOpacity>
            <Text style={[styles.timeLabel, isOwn ? styles.timeLabelOwn : styles.timeLabelOther]}>
              {formatTime(item.created_at)}
            </Text>
          </View>
        </View>
      );
    }

    return (
      <View style={[styles.msgRow, isOwn ? styles.msgRowOwn : styles.msgRowOther]}>
        {!isOwn && (
          showAvatar
            ? <Avatar uri={sender?.avatar_url} name={sender?.display_name || sender?.handle} size={30} />
            : <View style={{ width: 30 }} />
        )}
        <View style={styles.msgColumn}>
          {showName && (
            <Text style={[styles.senderName, { color: C.primary }]}>
              {sender?.display_name || sender?.handle}
            </Text>
          )}
          <TouchableOpacity
            onLongPress={() => handleDeleteMessage(item)}
            activeOpacity={0.85}
          >
            <View style={[
              styles.bubble,
              isOwn ? [styles.bubbleOwn, { backgroundColor: C.primary }] : styles.bubbleOther,
            ]}>
              <Text style={[styles.bubbleText, isOwn ? styles.bubbleTextOwn : styles.bubbleTextOther]}>
                {item.content}
              </Text>
            </View>
          </TouchableOpacity>
          <Text style={[styles.timeLabel, isOwn ? styles.timeLabelOwn : styles.timeLabelOther]}>
            {formatTime(item.created_at)}
          </Text>
        </View>
      </View>
    );
  }, [userId, senderMap, messages, C.primary]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={C.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ChevronLeft size={26} color={C.primary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.headerCenter}
          onPress={() => setShowMembers((v) => !v)}
          activeOpacity={0.7}
        >
          <View style={[styles.groupAvatar, { backgroundColor: C.surface }]}>
            <Users size={18} color={C.primary} />
          </View>
          <View>
            <Text style={styles.headerName} numberOfLines={1}>{groupConv?.name}</Text>
            <Text style={styles.headerSub}>{members.length}人のメンバー</Text>
          </View>
        </TouchableOpacity>
        <View style={styles.headerRight} />
      </View>

      {/* Members panel */}
      {showMembers && (
        <View style={[styles.membersPanel, { borderColor: C.border }]}>
          <Text style={[styles.membersPanelTitle, { color: C.primary }]}>メンバー</Text>
          <View style={styles.membersRow}>
            {members.map((m) => (
              <TouchableOpacity
                key={m.id}
                style={styles.memberChip}
                onPress={() => { setShowMembers(false); router.push(`/profile/${m.id}`); }}
                activeOpacity={0.7}
              >
                <Avatar uri={m.avatar_url} name={m.display_name || m.handle} size={36} online={m.is_online} />
                <Text style={styles.memberChipName} numberOfLines={1}>{m.display_name || m.handle}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      <KeyboardAvoidingView
        style={styles.kav}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
        enabled={Platform.OS !== 'web'}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          inverted
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.messageList}
          keyboardShouldPersistTaps="handled"
          onScrollBeginDrag={closePanel}
          onEndReached={loadMoreMessages}
          onEndReachedThreshold={0.3}
          ListFooterComponent={
            isLoadingMore ? <ActivityIndicator size="small" color={C.primary} style={{ marginVertical: 8 }} /> : null
          }
          ListEmptyComponent={
            <View style={styles.emptyChat}>
              <View style={[styles.emptyChatIcon, { backgroundColor: C.surface }]}>
                <Users size={32} color={C.primary} />
              </View>
              <Text style={styles.emptyChatText}>グループチャットを始めましょう</Text>
            </View>
          }
        />

        <View style={styles.inputBar}>
          <TouchableOpacity
            style={[styles.toolBtn, panel === 'sticker' && styles.toolBtnActive]}
            onPress={() => openPanel('sticker')}
          >
            <Sticker size={22} color={panel === 'sticker' ? C.primary : Colors.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toolBtn, panel === 'emoji' && styles.toolBtnActive]}
            onPress={() => openPanel('emoji')}
          >
            <Smile size={22} color={panel === 'emoji' ? C.primary : Colors.textMuted} />
          </TouchableOpacity>

          <TextInput
            ref={inputRef}
            style={styles.textInput}
            placeholder="メッセージを入力..."
            placeholderTextColor={Colors.textMuted}
            value={text}
            onChangeText={setText}
            multiline
            maxLength={2000}
            spellCheck={false}
            autoCorrect={false}
            onFocus={() => { closePanel(); scrollToBottom(); }}
          />

          <TouchableOpacity
            style={[styles.sendBtn, { backgroundColor: C.primary }, (!text.trim() || sending) && styles.sendBtnDisabled]}
            onPress={handleSend}
            disabled={!text.trim() || sending}
          >
            {sending
              ? <ActivityIndicator size="small" color={Colors.white} />
              : <Send size={18} color={Colors.white} />}
          </TouchableOpacity>
        </View>

        {panel === 'emoji' && <EmojiPicker onSelect={(emoji) => setText((p) => p + emoji)} />}
        {panel === 'sticker' && <StickerPicker onSelect={handleStickerSelect} />}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#EAE6DF' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 10,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.separator,
    gap: 8,
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  groupAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerName: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  headerSub: { fontSize: 11, color: Colors.textMuted },
  headerRight: { width: 36 },
  membersPanel: {
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  membersPanelTitle: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 },
  membersRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  memberChip: { alignItems: 'center', gap: 4, width: 52 },
  memberChipName: { fontSize: 10, color: Colors.textSecondary, textAlign: 'center' },
  kav: { flex: 1 },
  messageList: { paddingVertical: 12, paddingHorizontal: 8, flexGrow: 1 },
  emptyChat: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingTop: 80 },
  emptyChatIcon: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  emptyChatText: { fontSize: 14, color: Colors.textSecondary },
  msgRow: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 4, gap: 6, paddingHorizontal: 4 },
  msgRowOwn: { justifyContent: 'flex-end' },
  msgRowOther: { justifyContent: 'flex-start' },
  msgColumn: { maxWidth: '72%', gap: 2 },
  senderName: { fontSize: 11, fontWeight: '600', marginLeft: 2, marginBottom: 1 },
  bubble: {
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 9,
    maxWidth: '100%',
  },
  bubbleOwn: { borderBottomRightRadius: 4 },
  bubbleOther: {
    backgroundColor: Colors.white,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  bubbleText: { fontSize: 15, lineHeight: 21 },
  bubbleTextOwn: { color: Colors.white },
  bubbleTextOther: { color: Colors.textPrimary },
  timeLabel: { fontSize: 10, color: Colors.textMuted, marginHorizontal: 4 },
  timeLabelOwn: { textAlign: 'right' },
  timeLabelOther: { textAlign: 'left' },
  deletedBubble: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  deletedText: { fontSize: 13, color: Colors.textMuted, fontStyle: 'italic' },
  sticker: { fontSize: 44, lineHeight: 52 },
  imageBubble: { width: 200, height: 200, borderRadius: 14 },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 8,
    paddingVertical: 8,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.separator,
    gap: 4,
  },
  toolBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
  },
  toolBtnActive: { backgroundColor: Colors.surface },
  textInput: {
    flex: 1,
    minHeight: 36,
    maxHeight: 120,
    backgroundColor: Colors.surface,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 15,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.4 },
});
