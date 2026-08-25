import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { Bell, Lock, Info, ChevronRight, LogOut, Volume2, Vibrate, MessageSquare, Palette, X, Check } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setLanguage } from '@/lib/i18n/useTranslation';
import { Colors } from '@/lib/colors';
import { useAuthStore } from '@/stores/authStore';
import { useTheme, THEME_COLORS, useColors } from '@/lib/theme';
import { useTranslation } from '@/lib/i18n/useTranslation';

export const SOUND_ENABLED_KEY = 'sound_enabled';
export const VIBRATE_ENABLED_KEY = 'vibrate_enabled';
export const MESSAGE_PREVIEW_KEY = 'message_preview_enabled';
export const SELECTED_SOUND_KEY = 'selected_sound';

const LANGUAGE_OPTIONS = [
  { id: 'ja', label: '日本語' },
  { id: 'en', label: 'English' },
  { id: 'zh-Hans', label: '简体中文' },
  { id: 'zh-Hant', label: '繁體中文' },
] as const;
type LanguageId = typeof LANGUAGE_OPTIONS[number]['id'];
export const SELECTED_LANGUAGE_KEY = 'selected_language';

const SOUND_OPTIONS = [
  { id: 'default', label: 'デフォルト' },
  { id: 'chime', label: 'チャイム' },
  { id: 'pop', label: 'ポップ' },
  { id: 'bubble', label: 'バブル' },
  { id: 'crystal', label: 'クリスタル' },
  { id: 'silent', label: 'サイレント' },
] as const;

type SoundId = typeof SOUND_OPTIONS[number]['id'];

export default function SettingsScreen() {
  const { profile, signOut } = useAuthStore();
  const { primaryColor, setPrimaryColor, setIsDark } = useTheme();
  const C = useColors();
  const { t } = useTranslation();
  const [notifications, setNotifications] = React.useState(true);
  const [messagePreview, setMessagePreview] = React.useState(true);
  const [soundEnabled, setSoundEnabled] = React.useState(true);
  const [vibrateEnabled, setVibrateEnabled] = React.useState(true);
  const [selectedSound, setSelectedSound] = React.useState<SoundId>('default');
  const [showSoundModal, setShowSoundModal] = React.useState(false);
  const [selectedLanguage, setSelectedLanguage] = React.useState<LanguageId>('ja');
  const [showLanguageModal, setShowLanguageModal] = React.useState(false);
  useFocusEffect(
    useCallback(() => {
      AsyncStorage.getItem(SELECTED_LANGUAGE_KEY).then((val) => {
        if (val !== null) setSelectedLanguage(val as LanguageId);
      });
    }, [])
  );
  const [isDarkMode, setIsDarkMode] = React.useState(false);

  useEffect(() => {
    AsyncStorage.getItem(SOUND_ENABLED_KEY).then((val) => {
      if (val !== null) setSoundEnabled(val === 'true');
    });
    AsyncStorage.getItem(VIBRATE_ENABLED_KEY).then((val) => {
      if (val !== null) setVibrateEnabled(val !== 'false');
    });
    AsyncStorage.getItem(SELECTED_LANGUAGE_KEY).then((val) => {
      if (val !== null) setSelectedLanguage(val as LanguageId);
    });
    AsyncStorage.getItem('dark_mode').then((val) => {
      if (val !== null) setIsDarkMode(val === 'true');
    });
    AsyncStorage.getItem(MESSAGE_PREVIEW_KEY).then((val) => {
      if (val !== null) setMessagePreview(val !== 'false');
    });
    AsyncStorage.getItem(SELECTED_SOUND_KEY).then((val) => {
      if (val) setSelectedSound(val as SoundId);
    });
  }, []);

  const handleSoundToggle = async (value: boolean) => {
    setSoundEnabled(value);
    await AsyncStorage.setItem(SOUND_ENABLED_KEY, value ? 'true' : 'false');
  };

  const handleVibrateToggle = async (value: boolean) => {
    setVibrateEnabled(value);
    await AsyncStorage.setItem(VIBRATE_ENABLED_KEY, value ? 'true' : 'false');
  };

  const handleMessagePreviewToggle = async (value: boolean) => {
    setMessagePreview(value);
    await AsyncStorage.setItem(MESSAGE_PREVIEW_KEY, value ? 'true' : 'false');
  };

  const handleSelectSound = async (id: SoundId) => {
    setSelectedSound(id);
    await AsyncStorage.setItem(SELECTED_SOUND_KEY, id);
    setShowSoundModal(false);
  };

  const soundLabel = SOUND_OPTIONS.find((o) => o.id === selectedSound)?.label ?? 'デフォルト';

  return (
    <SafeAreaView edges={["top","left","right"]} style={[styles.safe, { backgroundColor: C.background }]}>
      <View style={[styles.header, { backgroundColor: C.white, borderBottomColor: C.separator }]}>
        <Text style={[styles.headerTitle, { color: C.textPrimary }]}>{t('settings')}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.section}>{t('notifications')}</Text>
        <View style={[styles.card, { backgroundColor: C.white }]}>
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <View style={[styles.iconBox, { backgroundColor: '#E3F2FD' }]}>
                <Bell size={18} color={primaryColor} />
              </View>
              <Text style={[styles.rowLabel, { color: C.textPrimary }]}>プッシュ通知</Text>
            </View>
            <Switch
              value={notifications}
              onValueChange={setNotifications}
              trackColor={{ false: Colors.separator, true: primaryColor }}
              thumbColor={Colors.white}
            />
          </View>
          <View style={styles.divider} />
          <TouchableOpacity style={styles.row} onPress={() => setShowSoundModal(true)}>
            <View style={styles.rowLeft}>
              <View style={[styles.iconBox, { backgroundColor: '#E3F2FD' }]}>
                <Volume2 size={18} color={primaryColor} />
              </View>
              <View>
                <Text style={[styles.rowLabel, { color: C.textPrimary }]}>着信音</Text>
                <Text style={styles.rowSub}>{soundLabel}</Text>
              </View>
            </View>
            <ChevronRight size={18} color={Colors.textMuted} />
          </TouchableOpacity>
          <View style={styles.divider} />
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <View style={[styles.iconBox, { backgroundColor: '#E3F2FD' }]}>
                <Vibrate size={18} color={primaryColor} />
              </View>
              <Text style={[styles.rowLabel, { color: C.textPrimary }]}>バイブレーション</Text>
            </View>
            <Switch
              value={vibrateEnabled}
              onValueChange={handleVibrateToggle}
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
                <Text style={[styles.rowLabel, { color: C.textPrimary }]}>メッセージプレビュー</Text>
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

        <Text style={styles.section}>{t('language')}</Text>
        <View style={[styles.card, { backgroundColor: C.white }]}>
          <TouchableOpacity style={styles.row} onPress={() => router.push('/settings/language' as any)}>
            <View style={styles.rowLeft}>
              <View style={[styles.iconBox, { backgroundColor: '#E3F2FD' }]}>
                <ChevronRight size={18} color='#1976D2' />
              </View>
              <Text style={[styles.rowLabel, { color: C.textPrimary }]}>使用言語</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={{ color: '#757575', fontSize: 14 }}>
                {LANGUAGE_OPTIONS.find(l => l.id === selectedLanguage)?.label}
              </Text>
              <ChevronRight size={16} color='#9E9E9E' />
            </View>
          </TouchableOpacity>
        </View>
        <Text style={styles.section}>{t('appearance')}</Text>
        <View style={[styles.card, { backgroundColor: C.white }]}>
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <View style={[styles.iconBox, { backgroundColor: '#212121' }]}>
                <Palette size={18} color='#FFFFFF' />
              </View>
              <Text style={[styles.rowLabel, { color: C.textPrimary }]}>{t('darkMode')}</Text>
            </View>
            <Switch
              value={isDarkMode}
              onValueChange={(val) => {
                setIsDarkMode(val);
                setIsDark(val);
              }}
              trackColor={{ false: '#E0E0E0', true: '#1976D2' }}
              thumbColor='#FFFFFF'
            />
          </View>
        </View>
        <Text style={styles.section}>{t('theme')}</Text>
        <View style={[styles.card, { backgroundColor: C.white }]}>
          <View style={styles.themeRow}>
            <View style={styles.rowLeft}>
              <View style={[styles.iconBox, { backgroundColor: '#E3F2FD' }]}>
                <Palette size={18} color={primaryColor} />
              </View>
              <Text style={[styles.rowLabel, { color: C.textPrimary }]}>{t('themeColor')}</Text>
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
        <View style={[styles.card, { backgroundColor: C.white }]}>
          <TouchableOpacity style={styles.row}>
            <View style={styles.rowLeft}>
              <View style={[styles.iconBox, { backgroundColor: '#E8F5E9' }]}>
                <Lock size={18} color={Colors.success} />
              </View>
              <Text style={[styles.rowLabel, { color: C.textPrimary }]}>ブロックリスト</Text>
            </View>
            <ChevronRight size={18} color={Colors.textMuted} />
          </TouchableOpacity>
        </View>

        <Text style={styles.section}>アプリ情報</Text>
        <View style={[styles.card, { backgroundColor: C.white }]}>
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <View style={[styles.iconBox, { backgroundColor: '#FFF8E1' }]}>
                <Info size={18} color={Colors.warning} />
              </View>
              <Text style={[styles.rowLabel, { color: C.textPrimary }]}>{t('version')}</Text>
            </View>
            <Text style={styles.rowValue}>1.0.0</Text>
          </View>
        </View>

        <View style={styles.profileInfo}>
          <Text style={styles.profileName}>{profile?.display_name || profile?.handle}</Text>
          <Text style={styles.profileHandle}>@{profile?.handle}</Text>
        </View>

        <Text style={styles.section}>{t('about')}</Text>
        <View style={[styles.card, { backgroundColor: C.white }]}>
          <TouchableOpacity style={styles.row}
            onPress={()=>require('expo-linking').openURL('https://calvin20000.github.io/nexum/privacy.html')}>
            <View style={styles.rowLeft}>
              <View style={[styles.iconBox,{backgroundColor:'#E3F2FD'}]}>
                <Lock size={18} color='#1976D2' />
              </View>
              <Text style={[styles.rowLabel, { color: C.textPrimary }]}>{t('privacy')}</Text>
            </View>
            <ChevronRight size={16} color='#9E9E9E' />
          </TouchableOpacity>
          <View style={styles.separator} />
          <TouchableOpacity style={styles.row}
            onPress={()=>require('expo-linking').openURL('https://calvin20000.github.io/nexum/terms.html')}>
            <View style={styles.rowLeft}>
              <View style={[styles.iconBox,{backgroundColor:'#E3F2FD'}]}>
                <Info size={18} color='#1976D2' />
              </View>
              <Text style={[styles.rowLabel, { color: C.textPrimary }]}>{t('terms')}</Text>
            </View>
            <ChevronRight size={16} color='#9E9E9E' />
          </TouchableOpacity>
          <View style={styles.separator} />
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <View style={[styles.iconBox,{backgroundColor:'#E3F2FD'}]}>
                <Info size={18} color='#1976D2' />
              </View>
              <Text style={[styles.rowLabel, { color: C.textPrimary }]}>{t('version')}</Text>
            </View>
            <Text style={{color:'#9E9E9E',fontSize:14}}>1.0.0</Text>
          </View>
        </View>
        <View style={{backgroundColor:'#E3F2FD',borderRadius:12,padding:16,marginBottom:16}}>
          <Text style={{color:'#1976D2',fontWeight:'700',fontSize:14,marginBottom:4}}>
            プライバシーへの取り組み
          </Text>
          <Text style={{color:'#424242',fontSize:13,lineHeight:20}}>
            NEXUMは広告なし・データ収集なし・トラッキングなしで運営しています。
            あなたのデータは認証とチャット提供のみに使用され、
            第三者に提供されることは一切ありません。
          </Text>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={signOut}>
          <LogOut size={18} color={Colors.error} />
          <Text style={styles.logoutText}>{t('logout')}</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* 着信音選択モーダル */}
      <Modal visible={showSoundModal} transparent animationType="slide" onRequestClose={() => setShowSoundModal(false)}>
        <View style={styles.soundModalOverlay}>
          <View style={styles.soundModalBox}>
            <View style={styles.soundModalHeader}>
              <Text style={styles.soundModalTitle}>着信音を選択</Text>
              <TouchableOpacity onPress={() => setShowSoundModal(false)}>
                <X size={22} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>
            {SOUND_OPTIONS.map((option, index) => {
              const isSelected = selectedSound === option.id;
              return (
                <React.Fragment key={option.id}>
                  {index > 0 && <View style={styles.soundDivider} />}
                  <TouchableOpacity
                    style={styles.soundOption}
                    onPress={() => handleSelectSound(option.id)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.soundOptionLabel, isSelected && { color: primaryColor, fontWeight: '700' }]}>
                      {option.label}
                    </Text>
                    {isSelected && <Check size={18} color={primaryColor} />}
                  </TouchableOpacity>
                </React.Fragment>
              );
            })}
          </View>
        </View>
      </Modal>
      <Modal visible={showLanguageModal} transparent animationType='slide' onRequestClose={() => setShowLanguageModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>言語を選択</Text>
              <TouchableOpacity onPress={() => setShowLanguageModal(false)}>
                <X size={22} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>
            {LANGUAGE_OPTIONS.map((lang) => (
              <TouchableOpacity
                key={lang.id}
                style={styles.soundOption}
                onPress={() => {
                  setSelectedLanguage(lang.id);
                  setLanguage(lang.id);
                  setShowLanguageModal(false);
                }}
              >
                <Text style={styles.soundOptionText}>{lang.label}</Text>
                {selectedLanguage === lang.id && <Check size={18} color='#1976D2' />}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>
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
  soundModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  soundModalBox: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  soundModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  soundModalTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  soundOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  soundOptionLabel: { fontSize: 16, color: Colors.textPrimary },
  soundDivider: { height: 1, backgroundColor: Colors.separator },
});
