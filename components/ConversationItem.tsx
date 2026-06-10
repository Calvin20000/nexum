import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Avatar } from './Avatar';
import { ConversationWithUser } from '@/types/database';
import { Colors } from '@/lib/colors';

interface ConversationItemProps {
  item: ConversationWithUser;
  onPress: () => void;
}

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'たった今';
  if (mins < 60) return `${mins}分前`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}時間前`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}日前`;
  return new Date(iso).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' });
}

export function ConversationItem({ item, onPress }: ConversationItemProps) {
  const lastMsg = item.last_message;
  const user = item.other_user;
  const isUnread = lastMsg && !lastMsg.read_at && lastMsg.sender_id !== user.id;

  const previewText = lastMsg
    ? lastMsg.is_deleted
      ? 'メッセージが削除されました'
      : lastMsg.message_type === 'image'
      ? '[画像]'
      : lastMsg.content ?? ''
    : '';

  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.7}>
      <Avatar
        uri={user.avatar_url}
        name={user.display_name || user.handle}
        size={52}
        online={user.is_online}
      />
      <View style={styles.content}>
        <View style={styles.topRow}>
          <Text style={styles.name} numberOfLines={1}>
            {user.display_name || user.handle}
          </Text>
          <Text style={styles.time}>{formatRelativeTime(item.last_message_at)}</Text>
        </View>
        <View style={styles.bottomRow}>
          <Text
            style={[styles.preview, isUnread && styles.previewUnread]}
            numberOfLines={1}
          >
            {previewText || 'チャットを開始しましょう'}
          </Text>
          {isUnread && <View style={styles.unreadDot} />}
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
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
    flex: 1,
  },
  time: {
    fontSize: 12,
    color: Colors.textMuted,
    marginLeft: 8,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  preview: {
    fontSize: 13,
    color: Colors.textSecondary,
    flex: 1,
  },
  previewUnread: {
    color: Colors.primary,
    fontWeight: '600',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.accent,
    marginLeft: 8,
  },
});
