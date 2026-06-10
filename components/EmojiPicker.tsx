import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Colors } from '@/lib/colors';

const CATEGORIES: { label: string; emojis: string[] }[] = [
  {
    label: '😊',
    emojis: [
      '😀','😁','😂','🤣','😃','😄','😅','😆','😉','😊',
      '😋','😎','😍','🥰','😘','😗','😙','😚','🙂','🤗',
      '🤩','🥳','😏','😒','😞','😔','😟','😕','🙁','☹️',
      '😣','😖','😫','😩','🥺','😢','😭','😤','😠','😡',
    ],
  },
  {
    label: '🎉',
    emojis: [
      '🎉','🎊','🎈','🎀','🎁','🥂','🍾','✨','🌟','⭐',
      '🌈','🔥','💫','💥','🎆','🎇','🎵','🎶','🎸','🎹',
      '🏆','🥇','🎯','🎮','🎲','🧩','🎭','🎨','🖼️','🎬',
    ],
  },
  {
    label: '❤️',
    emojis: [
      '❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔',
      '❣️','💕','💞','💓','💗','💖','💘','💝','💟','♥️',
      '😻','💏','💑','👫','👬','👭','🤝','🫂','🤲','👐',
    ],
  },
  {
    label: '👍',
    emojis: [
      '👍','👎','👊','✊','🤛','🤜','🤞','✌️','🤟','🤘',
      '👌','🤌','🤏','👈','👉','👆','👇','☝️','👋','🤚',
      '🖐️','✋','🖖','🤙','💪','🦾','🙌','👏','🤜','🫶',
    ],
  },
  {
    label: '🐶',
    emojis: [
      '🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🐯',
      '🦁','🐮','🐷','🐸','🐵','🙈','🙉','🙊','🐔','🐧',
      '🐦','🦅','🦆','🦉','🦇','🐺','🐗','🐴','🦄','🐝',
    ],
  },
  {
    label: '🍎',
    emojis: [
      '🍎','🍊','🍋','🍇','🍓','🫐','🍒','🍑','🥭','🍍',
      '🥥','🥝','🍅','🍆','🥑','🥦','🌽','🌶️','🍄','🧅',
      '🍕','🍔','🌮','🍜','🍣','🍩','🎂','🍺','☕','🧋',
    ],
  },
];

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
}

export function EmojiPicker({ onSelect }: EmojiPickerProps) {
  const [activeCategory, setActiveCategory] = useState(0);

  return (
    <View style={styles.container}>
      <View style={styles.categoryBar}>
        {CATEGORIES.map((cat, i) => (
          <TouchableOpacity
            key={i}
            style={[styles.catBtn, activeCategory === i && styles.catBtnActive]}
            onPress={() => setActiveCategory(i)}
          >
            <Text style={styles.catEmoji}>{cat.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        key={`emoji-${activeCategory}`}
        data={CATEGORIES[activeCategory].emojis}
        keyExtractor={(item, idx) => `${idx}-${item}`}
        numColumns={8}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.emojiBtn} onPress={() => onSelect(item)}>
            <Text style={styles.emoji}>{item}</Text>
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
  categoryBar: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.separator,
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  catBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    borderRadius: 8,
  },
  catBtnActive: {
    backgroundColor: Colors.surface,
    borderBottomWidth: 2,
    borderBottomColor: Colors.primary,
  },
  catEmoji: { fontSize: 20 },
  list: { flex: 1 },
  grid: { paddingHorizontal: 4, paddingVertical: 8 },
  emojiBtn: {
    flex: 1,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    margin: 1,
  },
  emoji: { fontSize: 26 },
});
