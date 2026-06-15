import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Bell, Lock, Info, ChevronRight, LogOut, Volume2, MessageSquare, Palette } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '@/lib/colors';
import { useAuthStore } from '@/stores/authStore';
import { useTheme, THEME_COLORS } from '@/lib/theme';

export const SOUND_ENABLED_KEY = 'sound_enabled';
export const MESSAGE_PREVIEW_KEY = 'message_preview_enabled';

export default function SettingsScreen() {
  const { profile, signOut } = useAuthStore();
  const { primaryColor, setPrimaryColor } = useTheme();
  const [notifications, setNotifications] = React.useState(true);
  const [messagePreview, setMessagePreview] = React.useState(true);
  const [soundEnabled, setSoundEnabled] = React.useState(true);

  useEffect(() => {
    AsyncStorage.getItem(SOUND_ENABLED_KEY).then((val) => {
      if (val !== null) setSoundEnabled(val === 'true');
    });
    AsyncStorage.getItem(MESSAGE_PREVIEW_KEY).then((val) => {
      if (val !== null) setMessagePreview(val !== 'false');
    });
  }, []);

  const handleSoundToggle = async (value: boolean) => {
    setSoundEnabled(value);
    await AsyncStorage.setItem(SOUND_ENABLED_KEY, value ? 'true' : 'false');
  };

  const handleMessagePreviewToggle = async (value: boolean) => {
    setMessagePreview(value);
    await AsyncStorage.setItem(MESSAGE_PREVIEW_KEY, value ? 'true' : 'false');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>設定</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.section}>通知</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <View style={[styles.iconBox, { backgroundColor: '#E3F2FD' }]}>
                <Bell size={18} color={primaryColor} />
              </View>
              <Text style={styles.rowLabel}>プッシュ通知</Text>
            </View>
            <Switch
              value={notifications}
              onValueChange={setNotifications}
              trackColor={{ false: Colors.separator, true: primaryColor }}
              thumbColor={Colors.white}
            />
          </View>
          <View style={styles.divider} />
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <View style={[styles.iconBox, { backgroundColor: '#E3F2FD' }]}>
                <Volume2 size={18} color={primaryColor} />
              </View>
              <Text style={styles.rowLabel}>着信音</Text>
            </View>
            <Switch
              value={soundEnabled}
              onValueChange={handleSoundToggle}
              trackColor={{ false: Colors.separator, true: primaryColor }}
              thumbColor={Colors.white}
            />
          </View>
          <View style={styles.divider} />
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <View style={[styles.iconBox, { backgroundColor: '#E3F2FD' }]}>
                <MessageSquare size={18} color={primaryColor} />
              </View>
              <View>
                <Text style={styles.rowLabel}>メッセージプレビュー</Text>
                <Text style={styles.rowSub}>チャット一覧にメッセージ内容を表示</Text>
              </View>
            </View>
            <Switch
              value={messagePreview}
              onValueChange={handleMessagePreviewToggle}
              trackColor={{ false: Colors.separator, true: primaryColor }}
              thumbColor={Colors.white}
            />
          </View>
        </View>

        <Text style={styles.section}>テーマ</Text>
        <View style={styles.card}>
          <View style={styles.themeRow}>
            <View style={styles.rowLeft}>
              <View style={[styles.iconBox, { backgroundColor: '#E3F2FD' }]}>
                <Palette size={18} color={primaryColor} />
              </View>
              <Text style={styles.rowLabel}>テーマカラー</Text>
            </View>
            <View style={styles.colorGrid}>
              {THEME_COLORS.map((item) => {
                const isLight = item.color === '#EEEEEE' || item.color === '#F9A825';
                const isSelected = primaryColor === item.color;
                return (
                  <TouchableOpacity
                    key={item.color}
                    onPress={() => setPrimaryColor(item.color)}
                    style={styles.colorItem}
                    activeOpacity={0.8}
                  >
                    <View
                      style={[
                        styles.colorDot,
                        { backgroundColor: item.color },
                        isLight && styles.colorDotLight,
                        isSelected && styles.colorDotSelected,
                      ]}
                    >
                      {isSelected && (
                        <Text style={[styles.checkmark, isLight && styles.checkmarkDark]}>✓</Text>
                      )}
                    </View>
                    <Text style={[styles.colorName, isSelected && styles.colorNameSelected]}>
                      {item.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>

        <Text style={styles.section}>プライバシー</Text>
        <View style={styles.card}>
          <TouchableOpacity style={styles.row}>
            <View style={styles.rowLeft}>
              <View style={[styles.iconBox, { backgroundColor: '#E8F5E9' }]}>
                <Lock size={18} color={Colors.success} />
              </View>
              <Text style={styles.rowLabel}>ブロックリスト</Text>
            </View>
            <ChevronRight size={18} color={Colors.textMuted} />
          </TouchableOpacity>
        </View>

        <Text style={styles.section}>アプリ情報</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <View style={[styles.iconBox, { backgroundColor: '#FFF8E1' }]}>
                <Info size={18} color={Colors.warning} />
              </View>
              <Text style={styles.rowLabel}>バージョン</Text>
            </View>
            <Text style={styles.rowValue}>1.0.0</Text>
          </View>
        </View>

        <View style={styles.profileInfo}>
          <Text style={styles.profileName}>{profile?.display_name || profile?.handle}</Text>
          <Text style={styles.profileHandle}>@{profile?.handle}</Text>
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={signOut}>
          <LogOut size={18} color={Colors.error} />
          <Text style={styles.logoutText}>ログアウト</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.separator,
  },
  headerTitle: { fontSize: 22, fontWeight: '800', color: Colors.primary },
  scroll: { padding: 20, gap: 8 },
  section: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 12,
    marginBottom: 4,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  iconBox: {
    width: 34,
    height: 34,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabel: { fontSize: 15, color: Colors.textPrimary, fontWeight: '500' },
  rowSub: { fontSize: 11, color: Colors.textMuted, marginTop: 1 },
  rowValue: { fontSize: 14, color: Colors.textMuted },
  divider: { height: 1, backgroundColor: Colors.separator, marginLeft: 62 },
  themeRow: {
    paddingHorizontal: 16,
    paddingVertical: 13,
    gap: 12,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginLeft: 46,
  },
  colorItem: {
    alignItems: 'center',
    gap: 4,
    width: 44,
  },
  colorDot: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  colorDotLight: {
    borderWidth: 1,
    borderColor: '#BDBDBD',
  },
  colorDotSelected: {
    borderWidth: 3,
    borderColor: Colors.white,
    shadowOpacity: 0.4,
  },
  checkmark: { color: Colors.white, fontSize: 16, fontWeight: '700' },
  checkmarkDark: { color: '#424242' },
  colorName: { fontSize: 9, color: Colors.textMuted, textAlign: 'center' },
  colorNameSelected: { color: Colors.textPrimary, fontWeight: '700' },
  profileInfo: { alignItems: 'center', marginTop: 24, gap: 4 },
  profileName: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  profileHandle: { fontSize: 13, color: Colors.textMuted },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#FFEBEE',
    borderWidth: 1,
    borderColor: '#FFCDD2',
  },
  logoutText: { color: Colors.error, fontWeight: '600', fontSize: 15 },
});
