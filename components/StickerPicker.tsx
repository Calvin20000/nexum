import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
} from 'react-native';
import { Colors } from '@/lib/colors';

export type Sticker = { id: string; emoji: string; label: string };

const STICKER_PACKS: { name: string; icon: string; stickers: Sticker[] }[] = [
  {
    name: 'ハッピー',
    icon: '😊',
    stickers: [
      { id: 'happy1',  emoji: '😊',         label: 'スマイル' },
      { id: 'happy2',  emoji: '😂',         label: '爆笑' },
      { id: 'happy3',  emoji: '🥰',         label: '大好き' },
      { id: 'happy4',  emoji: '😎',         label: 'クール' },
      { id: 'happy5',  emoji: '🥳',         label: 'パーティー' },
      { id: 'happy6',  emoji: '😍',         label: 'ときめき' },
      { id: 'happy7',  emoji: '🤩',         label: 'きらきら' },
      { id: 'happy8',  emoji: '😜',         label: 'ふざけた' },
      { id: 'happy9',  emoji: '🤗',         label: 'ぎゅー' },
      { id: 'happy10', emoji: '😇',         label: 'てんし' },
      { id: 'happy11', emoji: '🤭',         label: 'えへへ' },
      { id: 'happy12', emoji: '🥲',         label: '感動' },
    ],
  },
  {
    name: 'リアクション',
    icon: '👍',
    stickers: [
      { id: 'react1',  emoji: '👍',         label: 'いいね！' },
      { id: 'react2',  emoji: '👎',         label: 'ダメ' },
      { id: 'react3',  emoji: '👏',         label: '拍手' },
      { id: 'react4',  emoji: '🙌',         label: 'やった' },
      { id: 'react5',  emoji: '🤝',         label: 'よろしく' },
      { id: 'react6',  emoji: '💪',         label: 'ファイト' },
      { id: 'react7',  emoji: '🫶',         label: 'ハート手' },
      { id: 'react8',  emoji: '🤞',         label: 'がんばれ' },
      { id: 'react9',  emoji: '✌️',         label: 'ピース' },
      { id: 'react10', emoji: '🤙',         label: 'ヨロシク' },
      { id: 'react11', emoji: '🙏',         label: 'お願い' },
      { id: 'react12', emoji: '🤜',         label: 'グータッチ' },
    ],
  },
  {
    name: 'どうぶつ',
    icon: '🐱',
    stickers: [
      { id: 'ani1',  emoji: '🐱',           label: 'ねこ' },
      { id: 'ani2',  emoji: '🐶',           label: 'いぬ' },
      { id: 'ani3',  emoji: '🐼',           label: 'パンダ' },
      { id: 'ani4',  emoji: '🐨',           label: 'コアラ' },
      { id: 'ani5',  emoji: '🐸',           label: 'かえる' },
      { id: 'ani6',  emoji: '🐻',           label: 'くま' },
      { id: 'ani7',  emoji: '🦊',           label: 'きつね' },
      { id: 'ani8',  emoji: '🐰',           label: 'うさぎ' },
      { id: 'ani9',  emoji: '🐯',           label: 'とら' },
      { id: 'ani10', emoji: '🦁',           label: 'らいおん' },
      { id: 'ani11', emoji: '🐺',           label: 'おおかみ' },
      { id: 'ani12', emoji: '🦄',           label: 'ユニコーン' },
    ],
  },
  {
    name: 'イベント',
    icon: '🎉',
    stickers: [
      { id: 'ev1',  emoji: '🎉',            label: 'おめでとう' },
      { id: 'ev2',  emoji: '🎊',            label: 'やったー！' },
      { id: 'ev3',  emoji: '🎂',            label: 'おたんじょうびおめでとう' },
      { id: 'ev4',  emoji: '🎁',            label: 'プレゼント' },
      { id: 'ev5',  emoji: '🥂',            label: 'かんぱい' },
      { id: 'ev6',  emoji: '🌸',            label: 'さくら' },
      { id: 'ev7',  emoji: '🎆',            label: 'はなび' },
      { id: 'ev8',  emoji: '🌟',            label: 'スター' },
      { id: 'ev9',  emoji: '❤️',            label: 'あいしてる' },
      { id: 'ev10', emoji: '🔥',            label: 'もえる' },
      { id: 'ev11', emoji: '✨',            label: 'きらきら' },
      { id: 'ev12', emoji: '💯',            label: 'まんてん' },
    ],
  },
];

interface StickerPickerProps {
  onSelect: (sticker: Sticker) => void;
}

export function StickerPicker({ onSelect }: StickerPickerProps) {
  const [activePack, setActivePack] = useState(0);

  return (
    <View style={styles.container}>
      <View style={styles.packBar}>
        {STICKER_PACKS.map((pack, i) => (
          <TouchableOpacity
            key={i}
            style={[styles.packBtn, activePack === i && styles.packBtnActive]}
            onPress={() => setActivePack(i)}
          >
            <Text style={styles.packIcon}>{pack.icon}</Text>
            {activePack === i && (
              <Text style={styles.packName}>{pack.name}</Text>
            )}
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        key={`sticker-${activePack}`}
        data={STICKER_PACKS[activePack].stickers}
        keyExtractor={(item) => item.id}
        numColumns={4}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.stickerBtn} onPress={() => onSelect(item)}>
            <Text style={styles.stickerEmoji}>{item.emoji}</Text>
            <Text style={styles.stickerLabel}>{item.label}</Text>
          </TouchableOpacity>
        )}
        contentContainerStyle={styles.grid}
        showsVerticalScrollIndicator={false}
        style={styles.list}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 260,
    backgroundColor: '#FAFAFA',
    borderTopWidth: 1,
    borderTopColor: Colors.separator,
  },
  packBar: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.separator,
    paddingHorizontal: 8,
    paddingVertical: 6,
    gap: 4,
  },
  packBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  packBtnActive: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  packIcon: { fontSize: 20 },
  packName: { fontSize: 12, color: Colors.primary, fontWeight: '600' },
  list: { flex: 1 },
  grid: { paddingHorizontal: 8, paddingVertical: 8 },
  stickerBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    margin: 4,
    borderRadius: 14,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 4,
  },
  stickerEmoji: { fontSize: 44 },
  stickerLabel: { fontSize: 9, color: Colors.textMuted, textAlign: 'center' },
});
