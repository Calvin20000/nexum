import { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Dimensions,
  Platform,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';

const { width } = Dimensions.get('window');
const TOP_INSET = Platform.OS === 'ios' ? 54 : 36;

export type InAppNotificationData = {
  id: string;
  title: string;
  body: string;
  conversationId: string;
  avatarUrl?: string;
  messageType?: string;
  messageContent?: string;
};

export type InAppNotificationRef = {
  show: (data: InAppNotificationData) => void;
};

function getPreview(data: InAppNotificationData): string {
  switch (data.messageType) {
    case 'image':
      return '📷 写真を送りました';
    case 'sticker':
    case 'stamp':
      return data.messageContent || '😊';
    default:
      return data.messageContent?.substring(0, 35) || data.body || '';
  }
}

export const InAppNotification = forwardRef<InAppNotificationRef>((_props, ref) => {
  const router = useRouter();
  const [notification, setNotification] = useState<InAppNotificationData | null>(null);
  const translateY = useRef(new Animated.Value(-120)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hide = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -120,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => setNotification(null));
  };

  const show = (data: InAppNotificationData) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    setNotification(data);
    translateY.setValue(-120);
    opacity.setValue(0);

    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 80,
        friction: 8,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();

    timeoutRef.current = setTimeout(hide, 4000);
  };

  useImperativeHandle(ref, () => ({ show }));

  if (!notification) return null;

  const handleTap = () => {
    hide();
    const isGroup = notification.isGroup;
    if (isGroup) {
      router.push(`/group-chat/${notification.conversationId}` as any);
    } else {
      router.push(`/chat/${notification.conversationId}` as any);
    }
  };

  const initial = notification.title.charAt(0).toUpperCase() || '?';

  return (
    <Animated.View
      style={[
        styles.container,
        { transform: [{ translateY }], opacity },
      ]}
    >
      <TouchableOpacity
        onPress={handleTap}
        activeOpacity={0.92}
        style={styles.inner}
      >
        {/* アバター */}
        <View style={styles.avatarWrapper}>
          {notification.avatarUrl ? (
            <Image
              source={{ uri: notification.avatarUrl }}
              style={styles.avatar}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback]}>
              <Text style={styles.avatarInitial}>{initial}</Text>
            </View>
          )}
        </View>

        {/* テキストエリア */}
        <View style={styles.textArea}>
          {notification.isGroup && notification.groupName && (
            <Text style={styles.groupName} numberOfLines={1}>
              {notification.groupName}
            </Text>
          )}<Text style={styles.senderName} numberOfLines={1}>
            {notification.title}
          </Text>
          <Text style={styles.preview} numberOfLines={2}>
            {getPreview(notification)}
          </Text>
        </View>

        {/* 閉じるボタン */}
        <TouchableOpacity
          onPress={hide}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          style={styles.closeBtn}
        >
          <Text style={styles.closeIcon}>✕</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    paddingHorizontal: 12,
    paddingTop: TOP_INSET,
    backgroundColor: 'transparent',
  },
  inner: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#1976D2',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    maxWidth: width,
  },
  avatarWrapper: {
    flexShrink: 0,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarFallback: {
    backgroundColor: '#1976D2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },
  textArea: {
    flex: 1,
    gap: 4,
  },
  senderName: {
    color: '#0D47A1',
    fontSize: 15,
    fontWeight: '800',
  },
  preview: {
    color: '#424242',
    fontSize: 14,
    lineHeight: 20,
  },
  groupNameText: { fontSize: 12, color: "#757575", fontWeight: "400" },
  groupName: { fontSize: 11, color: '#1976D2', fontWeight: '600', marginBottom: 1 },closeBtn: { paddingLeft: 4 },
  closeIcon: { color: '#9E9E9E', fontSize: 14, fontWeight: '600' },
});
