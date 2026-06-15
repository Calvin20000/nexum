import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Share,
  Clipboard,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Edit2, LogOut, QrCode, X, Share2, Copy, Check } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import QRCode from 'react-native-qrcode-svg';
import { useAuthStore } from '@/stores/authStore';
import { Avatar } from '@/components/Avatar';
import { Colors } from '@/lib/colors';
import { PhotoGallery } from '@/components/PhotoGallery';
import { useTheme } from '@/lib/theme';

export default function ProfileScreen() {
  const { profile, session, signOut, fetchProfile } = useAuthStore();
  const { primaryColor } = useTheme();
  const [showQR, setShowQR] = useState(false);
  const [copied, setCopied] = useState(false);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (session?.user && !profile) {
      fetchProfile(session.user.id);
    }
  }, [session]);

  const handleSignOut = async () => {
    await signOut();
  };

  const handleShare = async () => {
    if (!profile) return;
    try {
      await Share.share({
        message: `NEXUMで友達になりましょう！ @${profile.handle} で検索してください`,
        title: 'NEXUMフレンド追加',
      });
    } catch {
      // user cancelled
    }
  };

  const handleCopyHandle = () => {
    if (!profile) return;
    if (Platform.OS === 'web') {
      navigator.clipboard?.writeText(`@${profile.handle}`);
    } else {
      Clipboard.setString(`@${profile.handle}`);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!profile) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Text style={styles.loadingText}>読み込み中...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const qrValue = `nexum://add/${profile.handle}`;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <LinearGradient
          colors={[primaryColor, Colors.secondary]}
          style={styles.coverGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Text style={styles.nexumLogo}>NEXUM</Text>
        </LinearGradient>

        <View style={styles.profileSection}>
          <View style={styles.avatarContainer}>
            <Avatar
              key={profile.avatar_url ?? 'no-avatar'}
              uri={profile.avatar_url}
              name={profile.display_name || profile.handle}
              size={88}
            />
            <TouchableOpacity
              style={styles.editAvatarBtn}
              onPress={() => router.push('/profile/edit')}
            >
              <Edit2 size={14} color={Colors.white} />
            </TouchableOpacity>
          </View>

          <Text style={styles.displayName}>{profile.display_name || profile.handle}</Text>
          <Text style={styles.handle}>@{profile.handle}</Text>

          {profile.bio ? (
            <Text style={styles.bio}>{profile.bio}</Text>
          ) : (
            <TouchableOpacity onPress={() => router.push('/profile/edit')}>
              <Text style={styles.bioPlaceholder}>自己紹介を追加する</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.editBtn}
            onPress={() => router.push('/profile/edit')}
          >
            <Edit2 size={18} color={Colors.white} />
            <Text style={styles.editBtnText}>プロフィールを編集</Text>
          </TouchableOpacity>
        </View>

        <PhotoGallery userId={profile.id} isOwner={true} />

        {/* QR Code Card */}
        <View style={styles.qrSection}>
          <Text style={styles.sectionTitle}>フレンド追加</Text>
          <TouchableOpacity
            style={styles.qrCard}
            onPress={() => setShowQR(true)}
            activeOpacity={0.88}
          >
            <View style={styles.qrCardLeft}>
              <View style={styles.qrThumb}>
                <QRCode
                  value={qrValue}
                  size={72}
                  color={Colors.primary}
                  backgroundColor="white"
                />
              </View>
            </View>
            <View style={styles.qrCardBody}>
              <Text style={styles.qrCardTitle}>マイQRコード</Text>
              <Text style={styles.qrCardHandle}>@{profile.handle}</Text>
              <View style={styles.qrCardBadge}>
                <QrCode size={11} color={Colors.secondary} />
                <Text style={styles.qrCardBadgeText}>タップして拡大</Text>
              </View>
            </View>
            <View style={styles.qrCardChevron}>
              <View style={styles.qrCardChevronDot} />
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.statsSection}>
          <StatBlock
            label="参加日"
            value={new Date(profile.created_at).toLocaleDateString('ja-JP', {
              year: 'numeric',
              month: 'long',
            })}
          />
        </View>

        <View style={styles.menuSection}>
          <Text style={styles.sectionTitle}>アカウント</Text>
          <View style={styles.menuCard}>
            <MenuItem
              icon={<Edit2 size={18} color={Colors.primary} />}
              label="プロフィール編集"
              onPress={() => router.push('/profile/edit')}
            />
            <View style={styles.menuDivider} />
            <MenuItem
              icon={<LogOut size={18} color={Colors.error} />}
              label="ログアウト"
              labelColor={Colors.error}
              onPress={handleSignOut}
            />
          </View>
        </View>
      </ScrollView>

      {/* ── Full-screen QR Modal ── */}
      <Modal
        visible={showQR}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setShowQR(false)}
        statusBarTranslucent
      >
        <View style={[styles.qrScreen, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
          {/* Header */}
          <View style={styles.qrScreenHeader}>
            <TouchableOpacity
              style={styles.qrCloseBtn}
              onPress={() => setShowQR(false)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <X size={22} color={Colors.textSecondary} />
            </TouchableOpacity>
            <Text style={styles.qrScreenTitle}>マイQRコード</Text>
            <TouchableOpacity
              style={styles.qrShareBtn}
              onPress={handleShare}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Share2 size={20} color={Colors.primary} />
            </TouchableOpacity>
          </View>

          {/* Card */}
          <View style={styles.qrCardFull}>
            {/* Top accent */}
            <View style={styles.qrCardAccent} />

            {/* Avatar + name */}
            <View style={styles.qrCardProfile}>
              <Avatar
                key={profile.avatar_url ?? 'no-avatar'}
                uri={profile.avatar_url}
                name={profile.display_name || profile.handle}
                size={72}
              />
              <Text style={styles.qrCardName}>
                {profile.display_name || profile.handle}
              </Text>
              <View style={styles.qrCardHandleRow}>
                <Text style={styles.qrCardHandleText}>@{profile.handle}</Text>
                <TouchableOpacity
                  style={[styles.copyBtn, copied && styles.copyBtnDone]}
                  onPress={handleCopyHandle}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                >
                  {copied
                    ? <Check size={13} color={Colors.success} />
                    : <Copy size={13} color={Colors.textMuted} />}
                  <Text style={[styles.copyBtnText, copied && styles.copyBtnTextDone]}>
                    {copied ? 'コピー済み' : 'コピー'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* QR code */}
            <View style={styles.qrCodeFrame}>
              <View style={styles.qrCodeInner}>
                <QRCode
                  value={qrValue}
                  size={220}
                  color={Colors.primary}
                  backgroundColor="white"
                  logo={require('@/assets/images/icon.png')}
                  logoSize={44}
                  logoBackgroundColor="white"
                  logoMargin={4}
                  logoBorderRadius={10}
                  quietZone={8}
                />
              </View>
              {/* Corner decorations */}
              <View style={[styles.corner, styles.cornerTL]} />
              <View style={[styles.corner, styles.cornerTR]} />
              <View style={[styles.corner, styles.cornerBL]} />
              <View style={[styles.corner, styles.cornerBR]} />
            </View>

            <Text style={styles.qrHint}>
              このQRコードをスキャンして{'\n'}フレンド申請を送れます
            </Text>
          </View>

          {/* Bottom action */}
          <TouchableOpacity style={styles.qrShareFullBtn} onPress={handleShare} activeOpacity={0.85}>
            <Share2 size={18} color={Colors.white} />
            <Text style={styles.qrShareFullText}>ハンドルをシェア</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function StatBlock({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statBlock}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function MenuItem({
  icon,
  label,
  labelColor,
  onPress,
}: {
  icon: React.ReactNode;
  label: string;
  labelColor?: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.menuItemIcon}>{icon}</View>
      <Text style={[styles.menuItemLabel, labelColor && { color: labelColor }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const CORNER_SIZE = 22;
const CORNER_THICK = 3;

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: Colors.textSecondary },
  coverGradient: {
    height: 120,
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  nexumLogo: {
    fontSize: 20,
    fontWeight: '900',
    color: 'rgba(255,255,255,0.9)',
    letterSpacing: 4,
  },
  profileSection: {
    alignItems: 'center',
    marginTop: -44,
    paddingBottom: 20,
    paddingHorizontal: 24,
    gap: 6,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 4,
  },
  editAvatarBtn: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.white,
  },
  displayName: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  handle: {
    fontSize: 14,
    color: Colors.textMuted,
  },
  bio: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 4,
    maxWidth: 280,
  },
  bioPlaceholder: {
    fontSize: 14,
    color: Colors.accent,
    marginTop: 4,
  },
  actions: {
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 13,
  },
  editBtnText: { color: Colors.white, fontWeight: '600', fontSize: 15 },

  // QR card (compact)
  qrSection: { paddingHorizontal: 24, marginBottom: 16 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textMuted,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  qrCard: {
    backgroundColor: Colors.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    shadowColor: Colors.primary,
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  qrCardLeft: {},
  qrThumb: {
    width: 84,
    height: 84,
    borderRadius: 12,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 6,
  },
  qrCardBody: { flex: 1, gap: 3 },
  qrCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  qrCardHandle: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.secondary,
  },
  qrCardBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  qrCardBadgeText: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  qrCardChevron: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrCardChevronDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
  },

  statsSection: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    marginBottom: 24,
    gap: 12,
  },
  statBlock: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statValue: { fontSize: 14, fontWeight: '700', color: Colors.primary },
  statLabel: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  menuSection: { paddingHorizontal: 24, marginBottom: 32 },
  menuCard: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  menuItemIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuItemLabel: { fontSize: 15, color: Colors.textPrimary, fontWeight: '500' },
  menuDivider: { height: 1, backgroundColor: Colors.separator, marginLeft: 60 },

  // ── Full-screen QR screen ──
  qrScreen: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingHorizontal: 24,
  },
  qrScreenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
  },
  qrCloseBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrScreenTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  qrShareBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Card
  qrCardFull: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: Colors.primary,
    shadowOpacity: 0.1,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  qrCardAccent: {
    width: '100%',
    height: 6,
    backgroundColor: Colors.primary,
  },
  qrCardProfile: {
    alignItems: 'center',
    gap: 6,
    paddingTop: 28,
    paddingBottom: 24,
  },
  qrCardName: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginTop: 10,
  },
  qrCardHandleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  qrCardHandleText: {
    fontSize: 15,
    color: Colors.textMuted,
    fontWeight: '500',
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: Colors.surface,
  },
  copyBtnDone: {
    backgroundColor: '#E8F5E9',
  },
  copyBtnText: {
    fontSize: 11,
    color: Colors.textMuted,
    fontWeight: '600',
  },
  copyBtnTextDone: {
    color: Colors.success,
  },

  // QR code frame with corner decorations
  qrCodeFrame: {
    position: 'relative',
    padding: 20,
    marginBottom: 8,
  },
  qrCodeInner: {
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: Colors.white,
  },
  corner: {
    position: 'absolute',
    width: CORNER_SIZE,
    height: CORNER_SIZE,
  },
  cornerTL: {
    top: 8,
    left: 8,
    borderTopWidth: CORNER_THICK,
    borderLeftWidth: CORNER_THICK,
    borderColor: Colors.primary,
    borderTopLeftRadius: 6,
  },
  cornerTR: {
    top: 8,
    right: 8,
    borderTopWidth: CORNER_THICK,
    borderRightWidth: CORNER_THICK,
    borderColor: Colors.primary,
    borderTopRightRadius: 6,
  },
  cornerBL: {
    bottom: 8,
    left: 8,
    borderBottomWidth: CORNER_THICK,
    borderLeftWidth: CORNER_THICK,
    borderColor: Colors.primary,
    borderBottomLeftRadius: 6,
  },
  cornerBR: {
    bottom: 8,
    right: 8,
    borderBottomWidth: CORNER_THICK,
    borderRightWidth: CORNER_THICK,
    borderColor: Colors.primary,
    borderBottomRightRadius: 6,
  },

  qrHint: {
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    paddingBottom: 28,
    paddingHorizontal: 16,
  },

  qrShareFullBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: Colors.primary,
    borderRadius: 16,
    paddingVertical: 16,
    marginBottom: 8,
    shadowColor: Colors.primary,
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  qrShareFullText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
});
