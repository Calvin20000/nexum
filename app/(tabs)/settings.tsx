import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Bell, Lock, Info, ChevronRight, LogOut } from 'lucide-react-native';
import { Colors } from '@/lib/colors';
import { useAuthStore } from '@/stores/authStore';

export default function SettingsScreen() {
  const { profile, signOut } = useAuthStore();
  const [notifications, setNotifications] = React.useState(true);
  const [messagePreview, setMessagePreview] = React.useState(true);

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
                <Bell size={18} color={Colors.primary} />
              </View>
              <Text style={styles.rowLabel}>プッシュ通知</Text>
            </View>
            <Switch
              value={notifications}
              onValueChange={setNotifications}
              trackColor={{ false: Colors.separator, true: Colors.accent }}
              thumbColor={Colors.white}
            />
          </View>
          <View style={styles.divider} />
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <View style={[styles.iconBox, { backgroundColor: '#E3F2FD' }]}>
                <Bell size={18} color={Colors.primary} />
              </View>
              <Text style={styles.rowLabel}>メッセージプレビュー</Text>
            </View>
            <Switch
              value={messagePreview}
              onValueChange={setMessagePreview}
              trackColor={{ false: Colors.separator, true: Colors.accent }}
              thumbColor={Colors.white}
            />
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
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBox: {
    width: 34,
    height: 34,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabel: { fontSize: 15, color: Colors.textPrimary, fontWeight: '500' },
  rowValue: { fontSize: 14, color: Colors.textMuted },
  divider: { height: 1, backgroundColor: Colors.separator, marginLeft: 62 },
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
