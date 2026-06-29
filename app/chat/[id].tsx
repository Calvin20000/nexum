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
  Modal,
  Alert,
  Image,
  Clipboard,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { ChevronLeft, Send, Image as ImageIcon, Smile, Sticker, Camera, X } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Linking from 'expo-linking';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import { uploadImageToStorage, getMimeInfo } from '@/lib/imageUpload';
import { useAuthStore } from '@/stores/authStore';
import { Message, UserProfile } from '@/types/database';
import { MessageBubble, QuotedMessage } from '@/components/MessageBubble';
import { EmojiPicker } from '@/components/EmojiPicker';
import { StickerPicker, Sticker as StickerType } from '@/components/StickerPicker';
import { Avatar } from '@/components/Avatar';
import { Colors } from '@/lib/colors';
import { useColors } from '@/lib/theme';
import { SOUND_ENABLED_KEY, VIBRATE_ENABLED_KEY } from '@/app/(tabs)/settings';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const PAGE_SIZE = 50;

type PanelType = 'none' | 'emoji' | 'sticker';

interface PendingImage {
  uri: string;
  mimeType: string;
  width: number;
  height: number;
}

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuthStore();
  const C = useColors();
  const [messages, setMessages] = useState<Message[]>([]);
  const [senderMap, setSenderMap] = useState<Record<string, UserProfile>>({});
  const [otherUser, setOtherUser] = useState<UserProfile | null>(null);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [isOtherTyping, setIsOtherTyping] = useState(false);
  const [panel, setPanel] = useState<PanelType>('none');
  // Image feature states
  const [showPickerSheet, setShowPickerSheet] = useState(false);
  const [pendingImage, setPendingImage] = useState<PendingImage | null>(null);
  const [sendingImage, setSendingImage] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  const [forwardImageUrl, setForwardImageUrl] = useState<string | null>(null);
  const [forwardFriends, setForwardFriends] = useState<any[]>([]);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [actionMessage, setActionMessage] = useState<Message | null>(null);
  const [replyCache, setReplyCache] = useState<Record<string, Message>>({});
  // New message banner
  const [bannerMsg, setBannerMsg] = useState<{ senderName: string; preview: string } | null>(null);
  const bannerAnim = useRef(new Animated.Value(-80)).current;
  const bannerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showBanner = useCallback((senderName: string, preview: string) => {
    if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current);
    setBannerMsg({ senderName, preview });
    Animated.spring(bannerAnim, { toValue: 0, useNativeDriver: true, speed: 20, bounciness: 4 }).start();
    bannerTimerRef.current = setTimeout(() => {
      Animated.timing(bannerAnim, { toValue: -80, duration: 280, useNativeDriver: true }).start(() => {
        setBannerMsg(null);
      });
    }, 3000);
  }, [bannerAnim]);
  // On web: position the container to exactly match the visual viewport (handles keyboard + IME bar).
  type WebContainerStyle = { position: 'absolute'; top: number; left: number; right: number; height: number };
  const [webStyle, setWebStyle] = useState<WebContainerStyle | undefined>(() => {
    if (Platform.OS !== 'web') return undefined;
    const vv = (window as unknown as { visualViewport?: { height: number; offsetTop: number } }).visualViewport;
    if (vv) return { position: 'absolute', top: vv.offsetTop, left: 0, right: 0, height: vv.height };
    if (typeof window !== 'undefined') return { position: 'absolute', top: 0, left: 0, right: 0, height: window.innerHeight };
    return undefined;
  });
  const flatListRef = useRef<FlatList>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<TextInput>(null);
  // Stores File reference for web image upload (File can't be re-fetched)
  const pendingFileRef = useRef<Blob | null>(null);
  // Persistent hidden file-input element for web (created once on mount).
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const el = document.createElement('input');
    el.type = 'file';
    el.accept = 'image/*';
    el.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;opacity:0;';
    document.body.appendChild(el);
    fileInputRef.current = el;
    return () => {
      if (document.body.contains(el)) document.body.removeChild(el);
      fileInputRef.current = null;
    };
  }, []);

  const userId = session?.user?.id;

  // With inverted FlatList, offset 0 is always the newest message (visual bottom).
  const scrollToBottom = useCallback((animated = true) => {
    flatListRef.current?.scrollToOffset({ offset: 0, animated });
  }, []);

  // On web: keep the container in sync with the visual viewport (handles keyboard + IME bar).
  useEffect(() => {
    if (Platform.OS !== 'web') return;

    type VV = EventTarget & {
      height: number;
      offsetTop: number;
      addEventListener: (e: string, h: () => void) => void;
      removeEventListener: (e: string, h: () => void) => void;
    };
    const vv = (window as unknown as { visualViewport?: VV }).visualViewport;

    const update = () => {
      if (vv) {
        setWebStyle({ position: 'absolute', top: vv.offsetTop, left: 0, right: 0, height: vv.height });
      } else {
        setWebStyle({ position: 'absolute', top: 0, left: 0, right: 0, height: window.innerHeight });
      }
    };

    if (vv) {
      vv.addEventListener('resize', update);
      vv.addEventListener('scroll', update);
      return () => {
        vv.removeEventListener('resize', update);
        vv.removeEventListener('scroll', update);
      };
    } else {
      window.addEventListener('resize', update);
      return () => window.removeEventListener('resize', update);
    }
  }, []);

  const handleForwardOpen = async (imageUrl: string) => {
    if (!userId) return;
    const { data } = await supabase
      .from('friendships')
      .select('*')
      .eq('status', 'accepted')
      .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);

    if (data) {
      const enriched = await Promise.all(
        data.map(async (f) => {
          const friendId = f.requester_id === userId ? f.addressee_id : f.requester_id;
          const { data: user } = await supabase.from('users').select('*').eq('id', friendId).maybeSingle();
          return { ...f, friend: user };
        })
      );
      setForwardFriends(enriched.filter((f) => f.friend != null));
    }
    setForwardImageUrl(imageUrl);
  };

  const handleForwardToFriend = async (friendId: string) => {
    if (!userId || !forwardImageUrl) return;
    const p1 = userId < friendId ? userId : friendId;
    const p2 = userId < friendId ? friendId : userId;

    let { data: conv } = await supabase
      .from('conversations')
      .select('id')
      .eq('participant_1_id', p1)
      .eq('participant_2_id', p2)
      .maybeSingle();

    if (!conv) {
      const { data: created } = await supabase
        .from('conversations')
        .insert({ participant_1_id: p1, participant_2_id: p2 })
        .select('id')
        .single();
      conv = created;
    }

    if (conv) {
      const { data: msg } = await supabase
        .from('messages')
        .insert({
          conversation_id: conv.id,
          sender_id: userId,
          message_type: 'image',
          image_url: forwardImageUrl,
        })
        .select()
        .single();

      if (msg) {
        supabase.from('conversations').update({ last_message_id: msg.id, last_message_at: msg.created_at }).eq('id', conv.id);
      }
    }

    setForwardImageUrl(null);
    Alert.alert('転送完了', '画像を転送しました。');
  };

  const handleForwardClose = () => setForwardImageUrl(null);

  const handleLongPress = (msg: Message) => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setActionMessage(msg);
  };

  const handleReply = (msg: Message) => {
    setReplyTo(msg);
    setActionMessage(null);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const handleCopyMessage = (msg: Message) => {
    const text = msg.message_type === 'image' ? msg.image_url ?? '' : msg.content ?? '';
    if (Platform.OS === 'web') {
      navigator.clipboard?.writeText(text);
    } else {
      Clipboard.setString(text);
    }
    setActionMessage(null);
  };

  const handleDeleteMessage = async (msg: Message) => {
    setActionMessage(null);
    await supabase.from('messages').update({ is_deleted: true }).eq('id', msg.id);
  };

  const fetchData = useCallback(async () => {
    if (!id || !userId) return;

    const { data: conv } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (!conv) {
      console.error('会話が見つかりません conversationId:', id);
      setLoading(false);
      return;
    }

    const otherId =
      conv.participant_1_id === userId ? conv.participant_2_id : conv.participant_1_id;

    const [{ data: other }, { data: msgs }] = await Promise.all([
      supabase.from('users').select('*').eq('id', otherId).maybeSingle(),
      supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', id)
        .order('created_at', { ascending: false }) // descending: newest first for inverted list
        .limit(PAGE_SIZE),
    ]);

    setOtherUser(other);
    setHasMore((msgs?.length ?? 0) === PAGE_SIZE);

    const userIds = [...new Set((msgs ?? []).map((m) => m.sender_id))];
    const { data: senders } = await supabase
      .from('users')
      .select('*')
      .in('id', userIds);
    const map: Record<string, UserProfile> = {};
    (senders ?? []).forEach((u) => { map[u.id] = u; });
    if (other) map[other.id] = other;
    setSenderMap(map);

    setMessages(msgs ?? []);
    setLoading(false);

    const unread = (msgs ?? []).filter((m) => m.sender_id !== userId && !m.read_at);
    if (unread.length > 0) {
      await supabase
        .from('messages')
        .update({ read_at: new Date().toISOString() })
        .in('id', unread.map((m) => m.id));
    }
  }, [id, userId]);

  // Load older messages when the user scrolls to the top (end of inverted list).
  const loadMoreMessages = useCallback(async () => {
    if (!id || !hasMore || isLoadingMore) return;
    setIsLoadingMore(true);

    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', id)
      .order('created_at', { ascending: false })
      .range(messages.length, messages.length + PAGE_SIZE - 1);

    if (data && data.length > 0) {
      // Fetch sender profiles for any unknown senders
      const newUserIds = data
        .map((m) => m.sender_id)
        .filter((sid) => !senderMap[sid]);
      if (newUserIds.length > 0) {
        const { data: senders } = await supabase
          .from('users')
          .select('*')
          .in('id', [...new Set(newUserIds)]);
        if (senders) {
          setSenderMap((prev) => {
            const next = { ...prev };
            senders.forEach((u) => { next[u.id] = u; });
            return next;
          });
        }
      }
      setMessages((prev) => [...prev, ...data]);
      setHasMore(data.length === PAGE_SIZE);
    } else {
      setHasMore(false);
    }

    setIsLoadingMore(false);
  }, [id, hasMore, isLoadingMore, messages.length, senderMap]);

  useEffect(() => {
    fetchData();

    const channel = supabase
      .channel(`chat_${id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${id}` },
        async (payload) => {
          const newMsg = payload.new as Message;
          // Prepend to front — inverted list shows it at the visual bottom instantly
          setMessages((prev) => prev.find((m) => m.id === newMsg.id) ? prev : [newMsg, ...prev]);
          if (newMsg.sender_id !== userId) {
            supabase.from('messages').update({ read_at: new Date().toISOString() }).eq('id', newMsg.id);
            if (!senderMap[newMsg.sender_id]) {
              const { data: u } = await supabase.from('users').select('*').eq('id', newMsg.sender_id).maybeSingle();
              if (u) setSenderMap((prev) => ({ ...prev, [u.id]: u }));
            }
            // Show in-chat banner
            const sender = senderMap[newMsg.sender_id] ?? otherUser;
            const senderName = sender?.display_name || sender?.handle || '...';
            const preview = newMsg.message_type === 'text'
              ? (newMsg.content ?? '').substring(0, 40)
              : newMsg.message_type === 'image' ? '写真' : 'スタンプ';
            showBanner(senderName, preview);
            if (Platform.OS !== 'web') {
              const [soundVal, vibrateVal] = await Promise.all([
                AsyncStorage.getItem(SOUND_ENABLED_KEY),
                AsyncStorage.getItem(VIBRATE_ENABLED_KEY),
              ]);
              const soundOn = soundVal !== 'false';
              const vibrateOn = vibrateVal !== 'false';
              if (soundOn) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              } else if (vibrateOn) {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              }
            }
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'messages', filter: `conversation_id=eq.${id}` },
        (payload) => {
          const updated = payload.new as Message;
          setMessages((prev) => prev.map((m) => m.id === updated.id ? updated : m));
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'typing_indicators', filter: `conversation_id=eq.${id}` },
        (payload) => {
          const ind = payload.new as { user_id: string; is_typing: boolean };
          if (ind.user_id !== userId) setIsOtherTyping(ind.is_typing);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      clearTyping();
    };
  }, [fetchData, id, userId]);

  const setTyping = async (val: boolean) => {
    if (!userId || !id) return;
    await supabase.from('typing_indicators').upsert({
      conversation_id: id,
      user_id: userId,
      is_typing: val,
      updated_at: new Date().toISOString(),
    });
  };

  const clearTyping = () => {
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    setTyping(false);
  };

  const handleTextChange = (val: string) => {
    setText(val);
    setTyping(true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => setTyping(false), 2000);
  };

  const openPanel = (type: PanelType) => {
    Keyboard.dismiss();
    setPanel((prev) => (prev === type ? 'none' : type));
  };

  const closePanel = () => setPanel('none');

  const focusInput = () => {
    closePanel();
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const resolveTemp = (tempId: string, real: Message) => {
    setMessages((prev) =>
      prev.some((m) => m.id === real.id)
        ? prev.filter((m) => m.id !== tempId)
        : prev.map((m) => (m.id === tempId ? real : m))
    );
  };

  const makeTempMessage = (
    overrides: Partial<Message> & { message_type: Message['message_type'] }
  ): Message => ({
    id: `temp_${Date.now()}_${Math.random()}`,
    conversation_id: id as string,
    sender_id: userId!,
    content: null,
    image_url: null,
    image_width: null,
    image_height: null,
    read_at: null,
    is_deleted: false,
    reply_to_id: null,
    created_at: new Date().toISOString(),
    ...overrides,
  });

  const sendTextMessage = async (content: string) => {
    if (!content.trim() || !userId || !id || sending) return;
    setSending(true);
    clearTyping();

    console.log('送信開始 conversationId:', id, 'sender_id:', userId);

    const currentReplyTo = replyTo;
    setReplyTo(null);

    const temp = makeTempMessage({
      message_type: 'text',
      content: content.trim(),
      reply_to_id: currentReplyTo?.id ?? null,
    });
    setMessages((prev) => [temp, ...prev]);
    scrollToBottom();

    const { data: msg, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: id,
        sender_id: userId,
        message_type: 'text',
        content: content.trim(),
        reply_to_id: currentReplyTo?.id ?? null,
      })
      .select()
      .single();

    if (!error && msg) {
      console.log('送信成功:', msg.id);
      resolveTemp(temp.id, msg);
      supabase
        .from('conversations')
        .update({ last_message_id: msg.id, last_message_at: msg.created_at })
        .eq('id', id);
    } else {
      console.error('送信エラー:', JSON.stringify(error));
      setMessages((prev) => prev.filter((m) => m.id !== temp.id));
      Alert.alert('送信エラー', error?.message ?? '不明なエラーが発生しました');
    }
    setSending(false);
  };

  const handleSend = async () => {
    const content = text;
    setText('');
    await sendTextMessage(content);
  };

  const handleEmojiSelect = (emoji: string) => {
    setText((prev) => prev + emoji);
  };

  const handleStickerSelect = async (sticker: StickerType) => {
    if (!userId || !id) return;
    closePanel();

    console.log('スタンプ送信 conversationId:', id, 'sender_id:', userId, 'sticker:', sticker.emoji);

    const temp = makeTempMessage({ message_type: 'sticker', content: sticker.emoji });
    setMessages((prev) => [temp, ...prev]);
    scrollToBottom();

    const { data: msg, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: id,
        sender_id: userId,
        message_type: 'sticker',
        content: sticker.emoji,
      })
      .select()
      .single();

    if (!error && msg) {
      console.log('スタンプ送信成功:', msg.id);
      resolveTemp(temp.id, msg);
      supabase
        .from('conversations')
        .update({ last_message_id: msg.id, last_message_at: msg.created_at })
        .eq('id', id);
    } else {
      console.error('スタンプエラー:', JSON.stringify(error));
      setMessages((prev) => prev.filter((m) => m.id !== temp.id));
      Alert.alert('送信エラー', error?.message ?? '不明なエラーが発生しました');
    }
  };

  const uploadAndSendImage = async (
    uri: string,
    rawMimeType: string,
    imgWidth: number,
    imgHeight: number,
  ): Promise<boolean> => {
    if (!userId || !id) return false;
    const { ext } = getMimeInfo(rawMimeType);
    const storageFileName = `${id}/${userId}_${Date.now()}.${ext}`;

    let publicUrl: string;
    try {
      publicUrl = await uploadImageToStorage(uri, 'chats', storageFileName, rawMimeType);
    } catch (e: any) {
      console.error('[chat] upload error:', e);
      setUploadError(e.message ?? 'アップロードに失敗しました。もう一度お試しください。');
      return false;
    }

    const urlData = { publicUrl };

    const temp = makeTempMessage({
      message_type: 'image',
      image_url: urlData.publicUrl,
      image_width: imgWidth,
      image_height: imgHeight,
    });
    setMessages((prev) => [temp, ...prev]);
    scrollToBottom();

    const { data: msg, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: id,
        sender_id: userId,
        message_type: 'image',
        image_url: urlData.publicUrl,
        image_width: imgWidth,
        image_height: imgHeight,
      })
      .select()
      .single();

    if (!error && msg) {
      resolveTemp(temp.id, msg);
      supabase
        .from('conversations')
        .update({ last_message_id: msg.id, last_message_at: msg.created_at })
        .eq('id', id);
      return true;
    } else {
      setMessages((prev) => prev.filter((m) => m.id !== temp.id));
      setUploadError('送信に失敗しました。もう一度お試しください。');
      return false;
    }
  };

  // --- Image picker helpers ---

  const showPermissionAlert = (title: string) => {
    Alert.alert(title, '設定からアクセスを許可してください。', [
      { text: 'キャンセル', style: 'cancel' },
      { text: '設定を開く', onPress: () => Linking.openSettings() },
    ]);
  };

  const getImageDimensionsFromUri = (uri: string): Promise<{ width: number; height: number }> =>
    new Promise((resolve) => {
      if (Platform.OS !== 'web') {
        resolve({ width: 800, height: 600 });
        return;
      }
      const img = new window.Image();
      img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
      img.onerror = () => resolve({ width: 800, height: 600 });
      img.src = uri;
    });

  const handleImageButtonPress = () => {
    if (Platform.OS === 'web') {
      handlePickFromLibrary();
    } else {
      closePanel();
      setShowPickerSheet(true);
    }
  };

  const handlePickFromLibrary = async () => {
    setShowPickerSheet(false);

    if (Platform.OS === 'web') {
      const input = fileInputRef.current;
      if (!input) return;
      input.value = '';
      const onFileChange = async () => {
        input.removeEventListener('change', onFileChange);
        const file = input.files?.[0];
        if (!file) return;
        if (file.size > MAX_FILE_SIZE) {
          Alert.alert('ファイルサイズエラー', '10MB以下の画像を選択してください。');
          return;
        }
        const uri = URL.createObjectURL(file);
        const dims = await getImageDimensionsFromUri(uri);
        const mimeType =
          !file.type || file.type === 'image/heic' || file.type === 'image/heif'
            ? 'image/jpeg'
            : file.type;
        pendingFileRef.current = file;
        setUploadError(null);
        setPendingImage({ uri, mimeType, width: dims.width, height: dims.height });
      };
      input.addEventListener('change', onFileChange);
      input.click();
      return;
    }

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      showPermissionAlert('写真へのアクセスが必要です');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];

    if (asset.fileSize && asset.fileSize > MAX_FILE_SIZE) {
      Alert.alert('ファイルサイズエラー', '10MB以下の画像を選択してください。');
      return;
    }

    setUploadError(null);
    setPendingImage({
      uri: asset.uri,
      mimeType: asset.mimeType ?? 'image/jpeg',
      width: asset.width,
      height: asset.height,
    });
  };

  const handlePickFromCamera = async () => {
    setShowPickerSheet(false);

    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      showPermissionAlert('カメラへのアクセスが必要です');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: true,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];

    if (asset.fileSize && asset.fileSize > MAX_FILE_SIZE) {
      Alert.alert('ファイルサイズエラー', '10MB以下の画像を選択してください。');
      return;
    }

    setUploadError(null);
    setPendingImage({
      uri: asset.uri,
      mimeType: asset.mimeType ?? 'image/jpeg',
      width: asset.width,
      height: asset.height,
    });
  };

  const handleConfirmSend = async () => {
    if (!pendingImage || sendingImage) return;
    setSendingImage(true);
    setUploadError(null);

    const success = await uploadAndSendImage(
      pendingImage.uri,
      pendingImage.mimeType,
      pendingImage.width,
      pendingImage.height,
    );

    setSendingImage(false);
    if (success) {
      setPendingImage(null);
      pendingFileRef.current = null;
      setUploadError(null);
    }
  };

  const handleCancelPreview = () => {
    if (sendingImage) return;
    setPendingImage(null);
    pendingFileRef.current = null;
    setUploadError(null);
  };

  // In inverted mode, messages[0] is newest (visual bottom).
  // The "visual previous" (message shown above current one) = messages[index + 1].
  const renderMessage = useCallback(({ item, index }: { item: Message; index: number }) => {
    const isOwn = item.sender_id === userId;
    const sender = senderMap[item.sender_id];
    const prevMsg = index < messages.length - 1 ? messages[index + 1] : null;
    const showAvatar = !isOwn && (
      !prevMsg || prevMsg.sender_id !== item.sender_id || prevMsg.message_type === 'sticker'
    );

    let replyMsg: Message | null = null;
    if (item.reply_to_id) {
      replyMsg = messages.find((m) => m.id === item.reply_to_id) ?? replyCache[item.reply_to_id] ?? null;
      if (!replyMsg && !replyCache[item.reply_to_id]) {
        // Fetch asynchronously and store in cache
        supabase
          .from('messages')
          .select('*')
          .eq('id', item.reply_to_id)
          .maybeSingle()
          .then(({ data }) => {
            if (data) setReplyCache((prev) => ({ ...prev, [data.id]: data }));
          });
      }
    }

    const replySender = replyMsg ? senderMap[replyMsg.sender_id] : undefined;
    return (
      <MessageBubble
        message={item}
        isOwn={isOwn}
        sender={sender}
        showAvatar={showAvatar}
        onImagePress={setFullscreenImage}
        onForward={handleForwardOpen}
        onLongPress={handleLongPress}
        replyMessage={replyMsg}
        replySenderName={replySender?.display_name || replySender?.handle}
      />
    );
  }, [userId, senderMap, messages, replyCache]);

  if (loading) {
    return (
      <View style={[styles.rootWrapper, webStyle]}>
        <SafeAreaView style={styles.safe}>
          <View style={styles.center}>
            <ActivityIndicator size="large" color={C.primary} />
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={[styles.rootWrapper, webStyle]}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <ChevronLeft size={26} color={C.primary} />
          </TouchableOpacity>
          {otherUser && (
            <TouchableOpacity
              style={styles.headerUser}
              onPress={() => router.push(`/profile/${otherUser.id}`)}
            >
              <Avatar
                uri={otherUser.avatar_url}
                name={otherUser.display_name || otherUser.handle}
                size={38}
                online={otherUser.is_online}
              />
              <View>
                <Text style={styles.headerName} numberOfLines={1}>
                  {otherUser.display_name || otherUser.handle}
                </Text>
                <Text style={styles.headerStatus}>
                  {otherUser.is_online ? 'オンライン' : formatLastSeen(otherUser.last_seen_at)}
                </Text>
              </View>
            </TouchableOpacity>
          )}
          <View style={styles.headerRight} />
        </View>

        {/* New message banner */}
        {bannerMsg && (
          <Animated.View
            style={[styles.banner, { transform: [{ translateY: bannerAnim }] }]}
          >
            <TouchableOpacity
              style={styles.bannerInner}
              activeOpacity={0.85}
              onPress={() => {
                if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current);
                Animated.timing(bannerAnim, { toValue: -80, duration: 220, useNativeDriver: true }).start(() => setBannerMsg(null));
              }}
            >
              <View style={[styles.bannerAvatar, { backgroundColor: C.primary }]}>
                <Text style={styles.bannerAvatarText}>
                  {(bannerMsg.senderName.charAt(0) || '?').toUpperCase()}
                </Text>
              </View>
              <View style={styles.bannerText}>
                <Text style={styles.bannerName} numberOfLines={1}>{bannerMsg.senderName}</Text>
                <Text style={styles.bannerPreview} numberOfLines={1}>{bannerMsg.preview}</Text>
              </View>
            </TouchableOpacity>
          </Animated.View>
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
              isLoadingMore
                ? <ActivityIndicator size="small" color={C.primary} />
                : null
            }
            ListEmptyComponent={
              <View style={styles.emptyChat}>
                {otherUser && (
                  <Avatar
                    uri={otherUser.avatar_url}
                    name={otherUser.display_name || otherUser.handle}
                    size={64}
                  />
                )}
                <Text style={styles.emptyChatText}>
                  {otherUser?.display_name || otherUser?.handle} さんにメッセージを送りましょう
                </Text>
              </View>
            }
          />

          {isOtherTyping && (
            <View style={styles.typingRow}>
              <View style={styles.typingBubble}>
                <View style={styles.typingDots}>
                  {[0, 1, 2].map((i) => (
                    <View key={i} style={styles.dot} />
                  ))}
                </View>
              </View>
              <Text style={styles.typingText}>{otherUser?.display_name || otherUser?.handle} が入力中…</Text>
            </View>
          )}

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

            <TouchableOpacity style={styles.toolBtn} onPress={handleImageButtonPress}>
              <Camera size={22} color={Colors.textMuted} />
            </TouchableOpacity>

            <TextInput
              ref={inputRef}
              style={styles.textInput}
              placeholder="メッセージを入力..."
              placeholderTextColor={Colors.textMuted}
              value={text}
              onChangeText={handleTextChange}
              multiline
              maxLength={2000}
              spellCheck={false}
              autoCorrect={false}
              onFocus={() => {
                closePanel();
                scrollToBottom();
              }}
            />

            <TouchableOpacity
              style={[styles.sendBtn, (!text.trim() || sending) && styles.sendBtnDisabled]}
              onPress={handleSend}
              disabled={!text.trim() || sending}
            >
              {sending
                ? <ActivityIndicator size="small" color={Colors.white} />
                : <Send size={18} color={Colors.white} />}
            </TouchableOpacity>
          </View>

          {panel === 'emoji' && <EmojiPicker onSelect={handleEmojiSelect} />}
          {panel === 'sticker' && <StickerPicker onSelect={handleStickerSelect} />}

          {replyTo && (
            <View style={[styles.replyBar, { backgroundColor: C.surface, borderTopColor: C.border }]}>
              <View style={[styles.replyBarLine, { backgroundColor: C.primary }]} />
              <View style={styles.replyBarContent}>
                <Text style={[styles.replyBarName, { color: C.primary }]}>
                  {senderMap[replyTo.sender_id]?.display_name ||
                    senderMap[replyTo.sender_id]?.handle ||
                    '返信先'}
                </Text>
                {replyTo.message_type === 'image' && replyTo.image_url ? (
                  <View style={styles.replyBarImageRow}>
                    <Image source={{ uri: replyTo.image_url }} style={styles.replyBarThumb} />
                    <Text style={styles.replyBarText} numberOfLines={1}>写真</Text>
                  </View>
                ) : (
                  <Text style={styles.replyBarText} numberOfLines={1}>
                    {replyTo.message_type === 'sticker' ? replyTo.content : replyTo.content}
                  </Text>
                )}
              </View>
              <TouchableOpacity onPress={() => setReplyTo(null)} style={styles.replyBarCancel}>
                <X size={18} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* ── Action Sheet: カメラ or ライブラリ ── */}
      <Modal
        visible={showPickerSheet}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPickerSheet(false)}
      >
        <TouchableOpacity
          style={styles.sheetOverlay}
          activeOpacity={1}
          onPress={() => setShowPickerSheet(false)}
        >
          <View style={styles.sheetContainer}>
            <Text style={styles.sheetTitle}>写真を送信</Text>
            <TouchableOpacity style={styles.sheetOption} onPress={handlePickFromCamera}>
              <Camera size={22} color={C.primary} />
              <Text style={styles.sheetOptionText}>カメラで撮影</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.sheetOption} onPress={handlePickFromLibrary}>
              <ImageIcon size={22} color={C.primary} />
              <Text style={styles.sheetOptionText}>ライブラリから選択</Text>
            </TouchableOpacity>
            <View style={styles.sheetDivider} />
            <TouchableOpacity
              style={styles.sheetOption}
              onPress={() => setShowPickerSheet(false)}
            >
              <Text style={styles.sheetCancelText}>キャンセル</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ── Preview Modal: 確認してから送信 ── */}
      {pendingImage && (
        <Modal
          visible
          animationType="slide"
          transparent
          onRequestClose={handleCancelPreview}
        >
          <View style={styles.previewOverlay}>
            <View style={styles.previewContainer}>
              <Text style={styles.previewTitle}>この写真を送信しますか？</Text>
              <Image
                source={{ uri: pendingImage.uri }}
                style={styles.previewImage}
                resizeMode="contain"
              />
              {uploadError && (
                <Text style={styles.errorText}>{uploadError}</Text>
              )}
              {sendingImage && (
                <View style={styles.uploadingRow}>
                  <ActivityIndicator size="small" color={C.primary} />
                  <Text style={styles.uploadingText}>アップロード中...</Text>
                </View>
              )}
              <View style={styles.previewActions}>
                <TouchableOpacity
                  style={[styles.previewCancelBtn, sendingImage && styles.btnDisabled]}
                  onPress={handleCancelPreview}
                  disabled={sendingImage}
                >
                  <Text style={styles.previewCancelText}>キャンセル</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.previewSendBtn, sendingImage && styles.btnDisabled]}
                  onPress={handleConfirmSend}
                  disabled={sendingImage}
                >
                  <Text style={styles.previewSendText}>
                    {uploadError ? '再試行' : '送信'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* ── Long-press Action Menu ── */}
      <Modal
        visible={!!actionMessage}
        transparent
        animationType="fade"
        onRequestClose={() => setActionMessage(null)}
      >
        <TouchableOpacity
          style={styles.actionOverlay}
          activeOpacity={1}
          onPress={() => setActionMessage(null)}
        >
          <View style={styles.actionMenu}>
            <TouchableOpacity
              style={styles.actionItem}
              onPress={() => actionMessage && handleReply(actionMessage)}
            >
              <Text style={styles.actionIcon}>↩️</Text>
              <Text style={styles.actionText}>返信</Text>
            </TouchableOpacity>
            {actionMessage && (actionMessage.message_type === 'text' || actionMessage.message_type === 'sticker') && (
              <>
                <View style={styles.actionDivider} />
                <TouchableOpacity
                  style={styles.actionItem}
                  onPress={() => actionMessage && handleCopyMessage(actionMessage)}
                >
                  <Text style={styles.actionIcon}>📋</Text>
                  <Text style={styles.actionText}>コピー</Text>
                </TouchableOpacity>
              </>
            )}
            {actionMessage && actionMessage.sender_id === userId && (
              <>
                <View style={styles.actionDivider} />
                <TouchableOpacity
                  style={styles.actionItem}
                  onPress={() => actionMessage && handleDeleteMessage(actionMessage)}
                >
                  <Text style={styles.actionIcon}>🗑️</Text>
                  <Text style={[styles.actionText, styles.actionTextDelete]}>削除</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ── Forward Modal ── */}
      <Modal
        visible={!!forwardImageUrl}
        animationType="slide"
        onRequestClose={handleForwardClose}
      >
        <View style={styles.forwardContainer}>
          <View style={styles.forwardHeader}>
            <Text style={styles.forwardTitle}>転送先を選択</Text>
            <TouchableOpacity onPress={handleForwardClose} style={styles.forwardCloseBtn}>
              <X size={22} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          <FlatList
            data={forwardFriends}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.forwardFriendItem}
                onPress={() => handleForwardToFriend(item.friend.id)}
                activeOpacity={0.7}
              >
                <Text style={styles.forwardFriendName}>
                  {item.friend.display_name || item.friend.handle}
                </Text>
                <Text style={styles.forwardFriendHandle}>@{item.friend.handle}</Text>
              </TouchableOpacity>
            )}
            ItemSeparatorComponent={() => <View style={styles.forwardSep} />}
            ListEmptyComponent={
              <View style={styles.forwardEmpty}>
                <Text style={styles.forwardEmptyText}>転送できるフレンドがいません</Text>
              </View>
            }
          />
        </View>
      </Modal>

      {/* ── Fullscreen Image Viewer ── */}
      <Modal
        visible={!!fullscreenImage}
        transparent
        animationType="fade"
        onRequestClose={() => setFullscreenImage(null)}
        statusBarTranslucent
      >
        <View style={styles.fullscreenOverlay}>
          <TouchableOpacity
            style={styles.fullscreenClose}
            onPress={() => setFullscreenImage(null)}
          >
            <X size={28} color="#fff" />
          </TouchableOpacity>
          {fullscreenImage && (
            <Image
              source={{ uri: fullscreenImage }}
              style={styles.fullscreenImage}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>
    </View>
  );
}

function formatLastSeen(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'たった今';
  if (mins < 60) return `${mins}分前`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}時間前`;
  return new Date(iso).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' });
}

const styles = StyleSheet.create({
  rootWrapper: { flex: 1 },
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
  headerUser: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerName: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  headerStatus: { fontSize: 11, color: Colors.online },
  headerRight: { width: 36 },
  banner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  bannerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(30,30,30,0.92)',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 12,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  bannerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerAvatarText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
  bannerText: { flex: 1 },
  bannerName: { fontSize: 13, fontWeight: '700', color: '#FFFFFF', marginBottom: 2 },
  bannerPreview: { fontSize: 12, color: 'rgba(255,255,255,0.75)' },
  kav: { flex: 1 },
  // inverted flips the list, so paddingTop becomes visual bottom padding
  messageList: { paddingVertical: 12, paddingHorizontal: 4, flexGrow: 1 },
  loadMoreSpinner: { paddingVertical: 12 },
  emptyChat: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    paddingTop: 80,
  },
  emptyChatText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  typingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 6,
    gap: 8,
  },
  typingBubble: {
    backgroundColor: Colors.white,
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  typingDots: { flexDirection: 'row', gap: 4 },
  dot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: Colors.textMuted },
  typingText: { fontSize: 11, color: Colors.textMuted },
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
    backgroundColor: Colors.inputBackground,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 9,
    fontSize: 15,
    color: Colors.textPrimary,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: Colors.border,
    minHeight: 38,
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#06C755',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: Colors.textMuted, opacity: 0.5 },

  // Action Sheet
  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 32,
    paddingTop: 8,
    paddingHorizontal: 16,
  },
  sheetTitle: {
    textAlign: 'center',
    fontSize: 13,
    color: Colors.textMuted,
    paddingVertical: 12,
    fontWeight: '500',
  },
  sheetOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 16,
    paddingHorizontal: 8,
  },
  sheetOptionText: {
    fontSize: 17,
    color: Colors.textPrimary,
    fontWeight: '500',
  },
  sheetDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 4,
  },
  sheetCancelText: {
    fontSize: 17,
    color: Colors.error ?? '#EF4444',
    fontWeight: '600',
    textAlign: 'center',
    flex: 1,
  },

  // Preview Modal
  previewOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  previewContainer: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 20,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    gap: 16,
  },
  previewTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  previewImage: {
    width: '100%',
    height: 280,
    borderRadius: 14,
    backgroundColor: Colors.surface,
  },
  errorText: {
    fontSize: 13,
    color: Colors.error ?? '#EF4444',
    textAlign: 'center',
  },
  uploadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  uploadingText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  previewActions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  previewCancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  previewCancelText: {
    fontSize: 16,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  previewSendBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#06C755',
    alignItems: 'center',
  },
  previewSendText: {
    fontSize: 16,
    color: Colors.white,
    fontWeight: '700',
  },
  btnDisabled: { opacity: 0.5 },

  // Fullscreen Viewer
  fullscreenOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenClose: {
    position: 'absolute',
    top: 56,
    right: 20,
    zIndex: 10,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullscreenImage: {
    width: '100%',
    height: '100%',
  },

  // Forward Modal
  forwardContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  forwardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#0D47A1',
    paddingTop: 56,
  },
  forwardTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  forwardCloseBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  forwardFriendItem: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: Colors.white,
    gap: 2,
  },
  forwardFriendName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  forwardFriendHandle: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  forwardSep: {
    height: 1,
    backgroundColor: Colors.separator,
    marginLeft: 20,
  },
  forwardEmpty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
  },
  forwardEmptyText: {
    fontSize: 15,
    color: Colors.textSecondary,
  },

  replyBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    gap: 8,
  },
  replyBarLine: { width: 3, height: 36, borderRadius: 2 },
  replyBarContent: { flex: 1 },
  replyBarName: { fontSize: 12, fontWeight: '700', marginBottom: 2 },
  replyBarText: { fontSize: 12, color: Colors.textSecondary },
  replyBarImageRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  replyBarThumb: { width: 32, height: 32, borderRadius: 4, backgroundColor: Colors.border },
  replyBarCancel: { padding: 4 },

  // Action menu
  actionOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionMenu: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    paddingVertical: 4,
    width: 210,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 14,
    gap: 14,
  },
  actionIcon: { fontSize: 20 },
  actionText: { fontSize: 16, color: Colors.textPrimary, fontWeight: '500' },
  actionTextDelete: { color: '#F44336' },
  actionDivider: { height: 1, backgroundColor: Colors.separator, marginHorizontal: 12 },
});
