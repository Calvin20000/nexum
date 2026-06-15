import React from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import { Message, UserProfile } from '@/types/database';
import { Colors } from '@/lib/colors';
import { Avatar } from './Avatar';

const BUBBLE_SELF = '#E3F2FD';
const BUBBLE_OTHER = '#FFFFFF';
const BUBBLE_TEXT = '#212121';
const LINE_READ = '#78909C';

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  sender?: UserProfile;
  showAvatar?: boolean;
  onImagePress?: (url: string) => void;
  onForward?: (imageUrl: string) => void;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', hour12: false });
}

export function MessageBubble({ message, isOwn, sender, showAvatar = true, onImagePress, onForward }: MessageBubbleProps) {
  const { width: screenWidth } = useWindowDimensions();
  const time = formatTime(message.created_at);
  const isRead = !!message.read_at;

  if (message.is_deleted) {
    return (
      <View style={[styles.row, isOwn ? styles.rowRight : styles.rowLeft]}>
        <View style={styles.deletedBubble}>
          <Text style={styles.deletedText}>メッセージを取り消しました</Text>
        </View>
      </View>
    );
  }

  // Sticker
  if (message.message_type === 'sticker') {
    return (
      <View style={[styles.row, isOwn ? styles.rowRight : styles.rowLeft]}>
        {!isOwn && showAvatar && (
          <Avatar
            uri={sender?.avatar_url}
            name={sender?.display_name || sender?.handle || ''}
            size={34}
            style={styles.avatarLeft}
          />
        )}
        {!isOwn && !showAvatar && <View style={styles.avatarSpacer} />}
        <View style={[styles.stickerWrapper, isOwn ? styles.stickerRight : styles.stickerLeft]}>
          {!isOwn && sender && showAvatar && (
            <Text style={styles.senderName}>{sender.display_name || sender.handle}</Text>
          )}
          <View style={styles.stickerMeta}>
            {isOwn && (
              <View style={styles.ownMeta}>
                {isRead && <Text style={styles.readLabel}>既読</Text>}
                <Text style={styles.timeOwn}>{time}</Text>
              </View>
            )}
            <Text style={styles.stickerEmoji}>{message.content}</Text>
            {!isOwn && <Text style={styles.timeOther}>{time}</Text>}
          </View>
        </View>
      </View>
    );
  }

  // Image
  if (message.message_type === 'image' && message.image_url) {
    const imgW = screenWidth * 0.6;
    const rawAspect =
      message.image_width && message.image_height
        ? message.image_width / message.image_height
        : 1;
    // Clamp height: 60% wide, max 80% of screen width tall
    const imgH = Math.min(imgW / rawAspect, screenWidth * 0.8);

    return (
      <View style={[styles.row, isOwn ? styles.rowRight : styles.rowLeft]}>
        {!isOwn && showAvatar && (
          <Avatar
            uri={sender?.avatar_url}
            name={sender?.display_name || sender?.handle || ''}
            size={34}
            style={styles.avatarLeft}
          />
        )}
        {!isOwn && !showAvatar && <View style={styles.avatarSpacer} />}
        <View style={isOwn ? styles.stickerRight : styles.stickerLeft}>
          {!isOwn && sender && showAvatar && (
            <Text style={styles.senderName}>{sender.display_name || sender.handle}</Text>
          )}
          <View style={styles.stickerMeta}>
            {isOwn && (
              <View style={styles.ownMeta}>
                {isRead && <Text style={styles.readLabel}>既読</Text>}
                <Text style={styles.timeOwn}>{time}</Text>
              </View>
            )}
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => onImagePress?.(message.image_url!)}
              style={[styles.imageBubble, isOwn ? styles.imageBubbleOwn : styles.imageBubbleOther]}
            >
              <Image
                source={{ uri: message.image_url }}
                style={{ width: imgW, height: imgH, borderRadius: 14 }}
                resizeMode="cover"
              />
              {!isOwn && onForward && (
                <TouchableOpacity
                  style={styles.forwardBtn}
                  onPress={() => onForward(message.image_url!)}
                >
                  <Text style={styles.forwardIcon}>📤</Text>
                </TouchableOpacity>
              )}
            </TouchableOpacity>
            {!isOwn && <Text style={styles.timeOther}>{time}</Text>}
          </View>
        </View>
      </View>
    );
  }

  // Text
  return (
    <View style={[styles.row, isOwn ? styles.rowRight : styles.rowLeft]}>
      {!isOwn && showAvatar && (
        <Avatar
          uri={sender?.avatar_url}
          name={sender?.display_name || sender?.handle || ''}
          size={34}
          style={styles.avatarLeft}
        />
      )}
      {!isOwn && !showAvatar && <View style={styles.avatarSpacer} />}

      <View style={isOwn ? styles.ownGroup : styles.otherGroup}>
        {!isOwn && sender && showAvatar && (
          <Text style={styles.senderName}>{sender.display_name || sender.handle}</Text>
        )}
        <View style={styles.bubbleRow}>
          {isOwn && (
            <View style={styles.ownMeta}>
              {isRead && <Text style={styles.readLabel}>既読</Text>}
              <Text style={styles.timeOwn}>{time}</Text>
            </View>
          )}
          <View style={[styles.bubble, isOwn ? styles.bubbleOwn : styles.bubbleOther]}>
            <Text style={[styles.text, isOwn ? styles.textOwn : styles.textOther]}>
              {message.content}
            </Text>
          </View>
          {!isOwn && <Text style={styles.timeOther}>{time}</Text>}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginVertical: 2,
    paddingHorizontal: 8,
  },
  rowRight: { justifyContent: 'flex-end' },
  rowLeft: { justifyContent: 'flex-start' },

  avatarLeft: { marginRight: 6, marginBottom: 2 },
  avatarSpacer: { width: 40 },

  ownGroup: { alignItems: 'flex-end', maxWidth: '78%' },
  otherGroup: { alignItems: 'flex-start', maxWidth: '78%' },

  senderName: { fontSize: 11, color: Colors.textMuted, marginBottom: 3, marginLeft: 10 },

  bubbleRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 4 },

  bubble: {
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 9,
    maxWidth: '100%',
  },
  bubbleOwn: {
    backgroundColor: BUBBLE_SELF,
    borderBottomRightRadius: 4,
    shadowColor: '#1976D2',
    shadowOpacity: 0.1,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  bubbleOther: {
    backgroundColor: BUBBLE_OTHER,
    borderBottomLeftRadius: 4,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },

  text: { fontSize: 15, lineHeight: 22 },
  textOwn: { color: BUBBLE_TEXT },
  textOther: { color: BUBBLE_TEXT },

  ownMeta: { alignItems: 'flex-end', justifyContent: 'flex-end', marginBottom: 2, gap: 1 },
  readLabel: { fontSize: 10, color: LINE_READ, fontWeight: '600' },
  timeOwn: { fontSize: 10, color: Colors.textMuted },
  timeOther: { fontSize: 10, color: Colors.textMuted, marginBottom: 2, alignSelf: 'flex-end' },

  deletedBubble: {
    backgroundColor: '#F5F5F5',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  deletedText: { fontSize: 13, color: Colors.textMuted, fontStyle: 'italic' },

  stickerWrapper: { maxWidth: '50%' },
  stickerRight: { alignItems: 'flex-end' },
  stickerLeft: { alignItems: 'flex-start' },
  stickerMeta: { flexDirection: 'row', alignItems: 'flex-end', gap: 4 },
  stickerEmoji: { fontSize: 72, lineHeight: 84 },

  imageBubble: {
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  imageBubbleOwn: { borderRadius: 14, borderBottomRightRadius: 4 },
  imageBubbleOther: { borderRadius: 14, borderBottomLeftRadius: 4 },
  forwardBtn: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 16,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  forwardIcon: { fontSize: 15 },
});
