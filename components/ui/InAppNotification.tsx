import { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Image,
  Dimensions,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';

const { width } = Dimensions.get('window');

export type InAppNotificationData = {
  id: string;
  title: string;
  body: string;
  conversationId: string;
  avatarUrl?: string;
};

export type InAppNotificationRef = {
  show: (data: InAppNotificationData) => void;
};

export const InAppNotification = forwardRef<InAppNotificationRef>((_props, ref) => {
  const router = useRouter();
  const [notification, setNotification] = useState<InAppNotificationData | null>(null);
  const translateY = useRef(new Animated.Value(-120)).current;
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hide = () => {
    Animated.timing(translateY, {
      toValue: -120,
      duration: 280,
      useNativeDriver: true,
    }).start(() => setNotification(null));
  };

  const show = (data: InAppNotificationData) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    setNotification(data);
    translateY.setValue(-120);

    Animated.spring(translateY, {
      toValue: 0,
      useNativeDriver: true,
      tension: 100,
      friction: 9,
    }).start();

    timeoutRef.current = setTimeout(hide, 4000);
  };

  useImperativeHandle(ref, () => ({ show }));

  if (!notification) return null;

  const handleTap = () => {
    hide();
    router.push(`/chat/${notification.conversationId}` as any);
  };

  return (
    <Animated.View style={[styles.container, { transform: [{ translateY }] }]}>
      <TouchableOpacity onPress={handleTap} activeOpacity={0.92} style={styles.inner}>
        <View style={styles.avatar}>
          {notification.avatarUrl ? (
            <Image source={{ uri: notification.avatarUrl }} style={styles.avatarImage} />
          ) : (
            <View style={styles.avatarFallback}>
              <Text style={styles.avatarInitial}>{notification.title.charAt(0).toUpperCase()}</Text>
            </View>
          )}
        </View>

        <View style={styles.textArea}>
          <Text style={styles.title} numberOfLines={1}>{notification.title}</Text>
          <Text style={styles.body} numberOfLines={2}>{notification.body}</Text>
        </View>

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

const TOP_INSET = Platform.OS === 'ios' ? 54 : 36;

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    paddingHorizontal: 12,
    paddingTop: TOP_INSET,
  },
  inner: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#1976D2',
    shadowColor: '#1976D2',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    maxWidth: width,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
    flexShrink: 0,
  },
  avatarImage: {
    width: 44,
    height: 44,
  },
  avatarFallback: {
    width: 44,
    height: 44,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    color: '#1976D2',
    fontSize: 18,
    fontWeight: '700',
  },
  textArea: { flex: 1 },
  title: {
    color: '#0D47A1',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  body: {
    color: '#424242',
    fontSize: 13,
    lineHeight: 18,
  },
  closeBtn: { paddingLeft: 4 },
  closeIcon: { color: '#9E9E9E', fontSize: 14 },
});
