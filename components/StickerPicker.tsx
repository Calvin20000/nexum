import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { Colors } from '@/lib/colors';

export type Sticker = { id: string; emoji: string; label: string };

const CATEGORIES: { name: string; icon: string; stickers: Sticker[] }[] = [
  {
    name: '挨拶',
    icon: '👋',
    stickers: [
      '👋','🤝','🙏','😊','🥰',
      '😄','🤗','👍','✌️','🤞',
      '💪','🙌','👏','🎉','🎊',
      '🌟','⭐','💫','✨','🌈',
    ].map((e, i) => ({ id: `greeting-${i}`, emoji: e, label: e })),
  },
  {
    name: '気持ち',
    icon: '❤️',
    stickers: [
      '❤️','💕','💖','💗','💓',
      '😍','🥹','😭','😂','🤣',
      '😅','😆','😎','🤔','😴',
      '😪','🤒','😷','🥺','😤',
    ].map((e, i) => ({ id: `feelings-${i}`, emoji: e, label: e })),
  },
  {
    name: '食べ物',
    icon: '🍜',
    stickers: [
      '🍜','🍣','🍱','🍛','🍙',
      '🍚','🍤','🍗','🥩','🍔',
      '🍕','🌮','🥗','🍰','🎂',
      '🍩','🍪','🍫','☕','🧋',
    ].map((e, i) => ({ id: `food-${i}`, emoji: e, label: e })),
  },
  {
    name: '動物',
    icon: '🐶',
    stickers: [
      '🐶','🐱','🐰','🐹','🐻',
      '🐼','🐨','🦊','🐯','🦁',
      '🐸','🐧','🐦','🕊️','🦋',
      '🐬','🐳','🦈','🦅','🐉',
    ].map((e, i) => ({ id: `animals-${i}`, emoji: e, label: e })),
  },
  {
    name: '天気',
    icon: '☀️',
    stickers: [
      '☀️','🌤️','⛅','🌥️','☁️',
      '🌦️','🌧️','⛈️','🌩️','❄️',
      '🌈','🌊','🌸','🌺','🌻',
      '🍀','🌿','🍁','🌙','⭐',
    ].map((e, i) => ({ id: `weather-${i}`, emoji: e, label: e })),
  },
];

interface StickerPickerProps {
  onSelect: (sticker: Sticker) => void;
}

export function StickerPicker({ onSelect }: StickerPickerProps) {
  const [activeCategory, setActiveCategory] = useState(0);

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabBar}
        contentContainerStyle={styles.tabBarContent}
      >
        {CATEGORIES.map((cat, i) => (
          <TouchableOpacity
            key={i}
            onPress={() => setActiveCategory(i)}
            style={[styles.tab, activeCategory === i && styles.tabActive]}
          >
            <Text style={styles.tabIcon}>{cat.icon}</Text>
            <Text style={[styles.tabText, activeCategory === i && styles.tabTextActive]}>
              {cat.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <FlatList
        key={`cat-${activeCategory}`}
        data={CATEGORIES[activeCategory].stickers}
        keyExtractor={(item) => item.id}
        numColumns={5}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.stickerBtn}
            onPress={() => onSelect(item)}
            activeOpacity={0.7}
          >
            <Text style={styles.stickerEmoji}>{item.emoji}</Text>
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
    height: 280,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    borderTopColor: Colors.separator,
  },
  tabBar: {
    borderBottomWidth: 1,
    borderBottomColor: '#E3F2FD',
    maxHeight: 52,
  },
  tabBarContent: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    alignItems: 'center',
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    gap: 4,
  },
  tabActive: {
    backgroundColor: '#1976D2',
  },
  tabIcon: { fontSize: 14 },
  tabText: {
    fontSize: 12,
    color: '#757575',
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  list: { flex: 1 },
  grid: { paddingHorizontal: 4, paddingVertical: 8 },
  stickerBtn: {
    flex: 1,
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
    margin: 2,
    backgroundColor: '#FAFAFA',
  },
  stickerEmoji: { fontSize: 32 },
});
