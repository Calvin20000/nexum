import React, { useState, useCallback, useRef, useEffect } from 'react';
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
import { useLocalSearchParams, router, useFocusEffect } from 'expo-router';
import { ChevronLeft, ChevronRight, Send, Users, Smile, Sticker, ImageIcon, Plus, Paperclip, Camera } from 'lucide-react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { GroupMessage } from '@/types/database';
import { useAuthStore } from '@/stores/authStore';
import { useGroupChatMessages } from '@/hooks/useGroupChat';
import { Avatar } from '@/components/Avatar';
import { EmojiPicker } from '@/components/EmojiPicker';
import { StickerPicker, Sticker as StickerType } from '@/components/StickerPicker';
import { Colors } from '@/lib/colors';
import { useColors } from '@/lib/theme';
import { uploadImageToStorage } from '@/lib/imageUpload';
import { supabase } from '@/lib/supabase';

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

  const {
    groupConv, members, messages, senderMap, memberReadMap,
    loading, sending, isLoadingMore, hasMore,
    sendMessage, deleteMessage, loadMore, markAsRead, setMessages,
  } = useGroupChatMessages(id as string, userId);

  const [text, setText] = useState('');
  const [replyTo, setReplyTo] = useState<GroupMessage | null>(null);
  const [showPickerSheet, setShowPickerSheet] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [pendingImage, setPendingImage] = useState<{ uri: string; mimeType: string } | null>(null);
  const [replyCache, setReplyCache] = useState<Record<string, GroupMessage>>({});
  useEffect(() => { markAsRead(); }, [messages]);
  useFocusEffect(
    useCallback(() => {
      markAsRead();
    }, [markAsRead])
  );
  const [panel, setPanel] = useState<PanelType>('none');
  const [showMembers, setShowMembers] = useState(false);

  const flatListRef = useRef<FlatList>(null);

  const scrollToBottom = useCallback((animated = true) => {
    flatListRef.current?.scrollToOffset({ offset: 0, animated });
  }, []);

  const openPanel = (type: PanelType) => {
    Keyboard.dismiss();
    setPanel((prev) => (prev === type ? 'none' : type));
  };

  const closePanel = () => setPanel('none');

  const handleSend = async () => {
    const content = text;
    setText('');
    const replyId = replyTo?.id;
    setReplyTo(null);
    await sendMessage(content, 'text', replyId);
    scrollToBottom();
  };

  const handleStickerSelect = async (sticker: StickerType) => {
    closePanel();
    await sendMessage(sticker.emoji, 'stamp');
    scrollToBottom();
  };

  const handlePickFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: '*/*',
      copyToCacheDirectory: true,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const file = result.assets[0];
    Alert.alert('ファイル送信', file.name + ' を送信しますか？', [
      { text: 'キャンセル', style: 'cancel' },
      { text: '送信', onPress: async () => {
        await uploadAndSendImage(file.uri, file.mimeType ?? 'application/octet-stream');
      }},
    ]);
  };

  const handlePickImageCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('権限が必要です', 'カメラへのアクセスを許可してください');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: true,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    setPendingImage({ uri: asset.uri, mimeType: asset.mimeType ?? 'image/jpeg' });
  };

  const handlePickImage = async () => {
    if (Platform.OS === 'web') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = async () => {
        const file = input.files?.[0];
        if (!file) return;
        const uri = URL.createObjectURL(file);
        await uploadAndSendImage(uri, file.type || 'image/jpeg');
      };
      input.click();
      return;
    }
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('権限が必要です', '写真へのアクセスを許可してください');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsMultipleSelection: true,
      selectionLimit: 10,
    });
    if (result.canceled || !result.assets.length) return;
    for (const asset of result.assets) {
      await uploadAndSendImage(asset.uri, asset.mimeType ?? 'image/jpeg');
    }
  };

  const uploadAndSendImage = async (uri: string, mimeType: string) => {
    if (!userId || !id) return;
    const ext = mimeType.includes('png') ? 'png' : 'jpg';
    const path = `group/${id}/${Date.now()}.${ext}`;
    try {
      const publicUrl = await uploadImageToStorage(uri, 'chats', path, mimeType);
      const { data: newMsg } = await (supabase.from('group_messages' as any) as any).insert({
        group_id: id,
        sender_id: userId,
        message_type: 'image',
        image_url: publicUrl,
      }).select().single();
      if (newMsg) {
        setMessages((prev: any[]) => [newMsg, ...prev]);
        await (supabase.from('group_conversations' as any) as any)
          .update({ last_message_at: (newMsg as any).created_at })
          .eq('id', id);
      }
    } catch (e) {
      console.error('画像送信エラー:', e);
      Alert.alert('エラー', String(e));
    }
  };

  const handleDeleteMessage = (msg: GroupMessage) => {
    if (msg.sender_id !== userId) return;
    Alert.alert('メッセージを削除', '削除しますか？', [
      { text: 'キャンセル', style: 'cancel' },
      { text: '削除', style: 'destructive', onPress: () => deleteMessage(msg.id) },
    ]);
  };

  const renderMessage = useCallback(({ item, index }: { item: GroupMessage; index: number }) => {
    const isOwn = item.sender_id === userId;
    const sender = senderMap[item.sender_id];
    let replyMsg: GroupMessage | null = null;
    if (item.reply_to_id) {
      replyMsg = messages.find((m) => m.id === item.reply_to_id) ?? replyCache[item.reply_to_id] ?? null;
      if (!replyMsg && !replyCache[item.reply_to_id]) {
        (supabase.from('group_messages' as any) as any)
          .select('*')
          .eq('id', item.reply_to_id)
          .maybeSingle()
          .then(({ data }: any) => {
            if (data) setReplyCache((prev) => ({ ...prev, [data.id]: data as GroupMessage }));
          });
      }
    }
    const replySender = replyMsg ? senderMap[replyMsg.sender_id] : undefined;
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
            {replyMsg && (
              <View style={{ backgroundColor: '#BBDEFB', borderRadius: 8, padding: 6, marginBottom: 4, borderLeftWidth: 3, borderLeftColor: '#1976D2' }}>
                <Text style={{ fontSize: 11, color: '#1976D2', fontWeight: '700' }}>
                  {replySender?.display_name || replySender?.handle || ''}
                </Text>
                {replyMsg.message_type === 'stamp' || replyMsg.message_type === 'sticker' ? (
                  <Text style={{ fontSize: 24 }}>{replyMsg.content}</Text>
                ) : replyMsg.message_type === 'image' && replyMsg.image_url ? (
                  <Image source={{ uri: replyMsg.image_url }} style={{ width: 40, height: 40, borderRadius: 4 }} />
                ) : (
                  <Text style={{ fontSize: 12, color: '#424242' }} numberOfLines={1}>{replyMsg.content}</Text>
                )}
              </View>
            )}<TouchableOpacity onLongPress={() => setReplyTo(item)} activeOpacity={0.8}>
  <Text style={styles.sticker}>{item.content}</Text>
</TouchableOpacity>
            <Text style={[styles.timeLabel, isOwn ? styles.timeLabelOwn : styles.timeLabelOther]}>
              {formatTime(item.created_at)}
            </Text>
            {isOwn && Object.entries(memberReadMap ?? {}).some(([uid, readAt]) =>
              uid !== userId && readAt &&
              new Date(readAt) >= new Date(item.created_at)
            ) && (
              <Text style={[styles.timeLabel, { color: C.primary, marginRight: 4 }]}>既読</Text>
            )}
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
            <TouchableOpacity onLongPress={() => setReplyTo(item)} activeOpacity={0.9}>
              <Image source={{ uri: item.image_url }} style={styles.imageBubble} resizeMode="cover" />
            </TouchableOpacity>
            {isOwn && Object.entries(memberReadMap).some(([uid, readAt]) => 
  uid !== userId && readAt && 
  new Date(readAt) >= new Date(item.created_at)
) && (
  <Text style={[styles.timeLabel, { color: C.primary, marginRight: 4 }]}>既読</Text>
)}
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
          {replyMsg && (
              <View style={{ backgroundColor: '#BBDEFB', borderRadius: 8, padding: 6, marginBottom: 4, borderLeftWidth: 3, borderLeftColor: '#1976D2' }}>
                <Text style={{ fontSize: 11, color: '#1976D2', fontWeight: '700' }}>
                  {replySender?.display_name || replySender?.handle || ''}
                </Text>
                {replyMsg.message_type === 'image' && replyMsg.image_url ? (
                  <Image source={{ uri: replyMsg.image_url }} style={{ width: 40, height: 40, borderRadius: 4 }} />
                ) : replyMsg.message_type === 'stamp' || replyMsg.message_type === 'sticker' ? (
                  <Text style={{ fontSize: 24 }}>{replyMsg.content}</Text>
                ) : (
                  <Text style={{ fontSize: 12, color: '#424242' }} numberOfLines={1}>{replyMsg.content}</Text>
                )}
              </View>
            )}<TouchableOpacity onLongPress={() => { setReplyTo(item); }} activeOpacity={0.85}>
            <View style={[
              styles.bubble,
              isOwn ? [styles.bubbleOwn, { backgroundColor: C.primary }] : styles.bubbleOther,
            ]}>
              <Text style={[styles.bubbleText, isOwn ? styles.bubbleTextOwn : styles.bubbleTextOther]}>
                {item.content}
              </Text>
            </View>
          </TouchableOpacity>
          {/* debug: {JSON.stringify(memberReadMap)} */}
          {isOwn && (() => { const result = Object.entries(memberReadMap ?? {}).some(([uid, readAt]) => uid !== userId && readAt && new Date(readAt) >= new Date(item.created_at)); if (isOwn) console.log("既読判定:", result, "memberReadMap:", JSON.stringify(memberReadMap), "created_at:", item.created_at); return result; })() && (
  <Text style={[styles.timeLabel, { color: C.primary, marginRight: 4 }]}>既読</Text>
)}
<Text style={[styles.timeLabel, isOwn ? styles.timeLabelOwn : styles.timeLabelOther]}>
  {formatTime(item.created_at)}
</Text>
        </View>
      </View>
    );
  }, [userId, senderMap, messages, C.primary, memberReadMap, setReplyTo, replyCache]);

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
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ChevronLeft size={26} color={C.primary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.headerCenter}
          onPress={() => setShowMembers((v) => !v)}
          activeOpacity={0.7}
        >
          {groupConv?.avatar_url ? (
            <Image source={{ uri: groupConv.avatar_url }} style={styles.groupAvatar} />
          ) : (
            <View style={[styles.groupAvatar, { backgroundColor: C.surface }]}>
              <Users size={18} color={C.primary} />
            </View>
          )}
          <View>
            <Text style={styles.headerName} numberOfLines={1}>{groupConv?.name}</Text>
            <Text style={styles.headerSub}>{members.length}人のメンバー</Text>
          </View>
        </TouchableOpacity>
        <View style={styles.headerRight} />
      </View>

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
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={
            isLoadingMore
              ? <ActivityIndicator size="small" color={C.primary} style={{ marginVertical: 8 }} />
              : null
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

        {replyTo && (
          <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#E3F2FD', paddingHorizontal: 12, paddingVertical: 6, borderTopWidth: 1, borderTopColor: '#BBDEFB' }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 11, color: '#1976D2', fontWeight: '700' }}>
                返信先: {replyTo.sender_id === userId ? 'あなた' : (senderMap[replyTo.sender_id]?.display_name ?? '')}
              </Text>
              <Text style={{ fontSize: 12, color: '#424242' }} numberOfLines={1}>
                {replyTo.content}
              </Text>
            </View>
            <TouchableOpacity onPress={() => setReplyTo(null)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={{ fontSize: 18, color: '#9E9E9E' }}>✕</Text>
            </TouchableOpacity>
          </View>
        )}
        <View style={styles.inputBar}>
          {!isTyping ? (
            <>
            <TouchableOpacity style={styles.toolBtn}
              onPress={()=>setShowPickerSheet(true)}>
              <Plus size={24} color={Colors.textMuted}/>
            </TouchableOpacity>
            <TouchableOpacity style={styles.toolBtn}
              onPress={handlePickImageCamera}>
              <Camera size={22} color={Colors.textMuted}/>
            </TouchableOpacity>
            <TouchableOpacity style={styles.toolBtn}
              onPress={handlePickImage}>
              <ImageIcon size={22} color={Colors.textMuted}/>
            </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity style={styles.toolBtn}
              onPress={()=>setIsTyping(false)}>
              <ChevronRight size={24} color={Colors.textMuted}/>
            </TouchableOpacity>
          )}
          <View style={{
            flex:1, flexDirection:'row',
            alignItems:'flex-end',
            backgroundColor:Colors.white,
            borderRadius:22, borderWidth:1,
            borderColor:Colors.border, minHeight:38
          }}>
            <TextInput
              style={[styles.textInput,
                {flex:1, backgroundColor:'transparent', borderWidth:0}]}
              placeholder='メッセージを入力...'
              placeholderTextColor={Colors.textMuted}
              value={text}
              onChangeText={(v)=>{setText(v);setIsTyping(v.length>0);}}
              multiline
              maxLength={2000}
              spellCheck={false}
              autoCorrect={false}
              onFocus={()=>{closePanel();scrollToBottom();}}
            />
            <TouchableOpacity style={{padding:8}}
              onPress={()=>openPanel(
                panel==='sticker'?'none':'sticker')}>
              <Sticker size={20}
                color={panel==='sticker'?C.primary:Colors.textMuted}/>
            </TouchableOpacity>
          </View>

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
      {showPickerSheet && (
        <View style={{position:'absolute',top:0,left:0,right:0,bottom:0,
          backgroundColor:'rgba(0,0,0,0.5)'}}>
          <TouchableOpacity style={{flex:1}}
            onPress={()=>setShowPickerSheet(false)}/>
          <View style={{backgroundColor:'white',
            borderTopLeftRadius:16,borderTopRightRadius:16,padding:16}}>
            <Text style={{fontSize:16,fontWeight:'700',marginBottom:16}}>
              送信
            </Text>
            <TouchableOpacity
              style={{flexDirection:'row',alignItems:'center',gap:12,padding:12}}
              onPress={()=>{setShowPickerSheet(false);handlePickFile();}}>
              <Paperclip size={22} color='#1976D2'/>
              <Text>ファイルを送信</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{flexDirection:'row',alignItems:'center',gap:12,padding:12}}
              onPress={()=>setShowPickerSheet(false)}>
              <Text style={{fontSize:22}}>location</Text>
              <Text>位置情報を送信</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{padding:12,alignItems:'center'}}
              onPress={()=>setShowPickerSheet(false)}>
              <Text style={{color:'red'}}>キャンセル</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
      {showPickerSheet && (
        <View style={{position:'absolute',top:0,left:0,right:0,bottom:0,
          backgroundColor:'rgba(0,0,0,0.5)'}}>
          <TouchableOpacity style={{flex:1}}
            onPress={()=>setShowPickerSheet(false)}/>
          <View style={{backgroundColor:'white',
            borderTopLeftRadius:16,borderTopRightRadius:16,padding:16}}>
            <Text style={{fontSize:16,fontWeight:'700',marginBottom:16}}>
              送信
            </Text>
            <TouchableOpacity
              style={{flexDirection:'row',alignItems:'center',gap:12,padding:12}}
              onPress={()=>{setShowPickerSheet(false);handlePickFile();}}>
              <Paperclip size={22} color='#1976D2'/>
              <Text>ファイルを送信</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{flexDirection:'row',alignItems:'center',gap:12,padding:12}}
              onPress={()=>setShowPickerSheet(false)}>
              <Text style={{fontSize:22}}>location</Text>
              <Text>位置情報を送信</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{padding:12,alignItems:'center'}}
              onPress={()=>setShowPickerSheet(false)}>
              <Text style={{color:'red'}}>キャンセル</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
      {pendingImage && (
        <View style={{position:"absolute",top:0,left:0,right:0,bottom:0,backgroundColor:"rgba(0,0,0,0.8)",justifyContent:"center",alignItems:"center"}}>
          <Image source={{uri:pendingImage.uri}} style={{width:300,height:300,borderRadius:12}} resizeMode="contain"/>
          <TouchableOpacity onPress={()=>setPendingImage(null)}>
            <Text style={{color:"white",marginTop:24}}>cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={async()=>{const img=pendingImage;setPendingImage(null);await uploadAndSendImage(img.uri,img.mimeType);}}>
            <Text style={{color:"white",marginTop:8}}>send</Text>
          </TouchableOpacity>
        </View>
      )}
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
  bubble: { borderRadius: 18, paddingHorizontal: 14, paddingVertical: 9, maxWidth: '100%' },
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
  sticker: { fontSize: 72, lineHeight: 84 },
  imageBubble: { width: 200, height: 200, borderRadius: 14 },
  textInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    paddingHorizontal: 12,
    marginHorizontal: 4,
  },
  emojiBtn: {
    padding: 4,
  },
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
