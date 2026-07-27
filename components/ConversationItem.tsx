import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Avatar } from './Avatar';
import { ConversationWithUser } from '@/types/database';
import { Colors } from '@/lib/colors';

const UNREAD_BLUE = '#1976D2';

interface ConversationItemProps {
  item: ConversationWithUser & { unread_count?: number };
  onPress: () => void;
  onLongPress?: () => void;
  previewEnabled?: boolean;
}

function formatTime(iso: string): string {
  if (!iso) return '';
  const date = new Date(iso);
  const now = new Date();
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', hour12: false });
  }
  return date.toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' });
}

export function ConversationItem({ item, onPress, onLongPress, previewEnabled = true }: ConversationItemProps) {
  const lastMsg = item.last_message;
  const user = item.other_user;
  const unreadCount = item.unread_count ?? 0;
  const isUnread = unreadCount > 0;

  let previewText = '';
  if (lastMsg) {
    if (lastMsg.is_deleted) {
      previewText = 'メッセージが削除されました';
    } else if (!previewEnabled) {
      previewText = isUnread ? '新着メッセージがあります' : '';
    } else if (lastMsg.message_type === 'image') {
      previewText = '📷 写真';
    } else if (lastMsg.message_type === 'sticker' || lastMsg.message_type === 'stamp') {
      previewText = lastMsg.content || '😊';
    } else {
      previewText = lastMsg.content?.substring(0, 30) ?? '';
    }
  }

  const isStamp = lastMsg?.message_type === 'sticker' || lastMsg?.message_type === 'stamp';

  return (
    <TouchableOpacity style={styles.container} onPress={onPress} onLongPress={onLongPress} activeOpacity={0.7}>
      <Avatar
        uri={user.avatar_url}
        name={user.display_name || user.handle}
        size={56}
        online={user.is_online}
      />
      <View style={styles.content}>
        <View style={styles.topRow}>
          <Text
            style={[styles.name, isUnread && styles.nameUnread]}
            numberOfLines={1}
          >
            {user.display_name || user.handle}
          </Text>
          <Text style={styles.time}>{formatTime(item.last_message_at)}</Text>
        </View>
        <View style={styles.bottomRow}>
          <Text
            style={[styles.preview, isUnread && styles.previewUnread, isStamp && styles.previewStamp]}
            numberOfLines={1}
          >
            {previewText}
          </Text>
          {isUnread && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {unreadCount > 99 ? '99+' : unreadCount}
              </Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
    gap: 12,
  },
  content: {
    flex: 1,
    gap: 4,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  name: {
    fontSize: 16,
    fontWeight: '500',
    color: '#212121',
    flex: 1,
    marginRight: 8,
  },
  nameUnread: {
    fontWeight: '700',
    color: '#0D47A1',
  },
  time: {
    fontSize: 12,
    color: '#9E9E9E',
    flexShrink: 0,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  preview: {
    fontSize: 14,
    color: '#9E9E9E',
    fontWeight: '400',
    flex: 1,
  },
  previewUnread: {
    fontWeight: '700',
    color: '#424242',
  },
  previewStamp: {
    fontSize: 20,
  },
  badge: {
    backgroundColor: UNREAD_BLUE,
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    flexShrink: 0,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
});
