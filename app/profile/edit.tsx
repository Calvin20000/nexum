import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Modal,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { X, Camera, Image as ImageIcon } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Linking from 'expo-linking';
import { uploadImageToStorage, getMimeInfo } from '@/lib/imageUpload';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { Avatar } from '@/components/Avatar';
import { Colors } from '@/lib/colors';

export default function EditProfileScreen() {
  const { profile, setProfile, session } = useAuthStore();
  const [displayName, setDisplayName] = useState(profile?.display_name ?? '');
  const [handle, setHandle] = useState(profile?.handle ?? '');
  const [bio, setBio] = useState(profile?.bio ?? '');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [avatarUri, setAvatarUri] = useState(profile?.avatar_url ?? '');
  const [showPickerSheet, setShowPickerSheet] = useState(false);

  // Toast state
  const [toast, setToast] = useState('');
  const toastOpacity = useRef(new Animated.Value(0)).current;
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const userId = session?.user?.id;

  const showToast = (msg: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(msg);
    Animated.sequence([
      Animated.timing(toastOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.delay(1800),
      Animated.timing(toastOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start(() => setToast(''));
    toastTimer.current = setTimeout(() => setToast(''), 2500);
  };

  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  const showPermissionAlert = (title: string) => {
    // Use Alert-like pattern without importing Alert (already imported via Modal)
    // Use Linking to open settings
    setError(`${title}: 設定でアクセスを許可してください`);
    setTimeout(() => Linking.openSettings(), 1500);
  };

  const uploadAvatar = async (uri: string, rawMimeType = 'image/jpeg'): Promise<string | null> => {
    if (!userId) return null;
    const { ext } = getMimeInfo(rawMimeType);
    const fileName = `${userId}/profile.${ext}`;
    try {
      return await uploadImageToStorage(uri, 'avatars', fileName, rawMimeType);
    } catch (e: any) {
      console.error('[Avatar] Storage upload error:', e);
      throw e;
    }
  };

  const handleAvatarPress = () => {
    if (Platform.OS === 'web') {
      launchLibraryPicker();
    } else {
      setShowPickerSheet(true);
    }
  };

  const launchCameraPicker = async () => {
    setShowPickerSheet(false);
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      showPermissionAlert('カメラへのアクセスが必要です');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (!result.canceled && result.assets[0]) {
      await processAndUpload(result.assets[0].uri, result.assets[0].mimeType ?? 'image/jpeg');
    }
  };

  const launchLibraryPicker = async () => {
    setShowPickerSheet(false);
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        showPermissionAlert('写真へのアクセスが必要です');
        return;
      }
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (!result.canceled && result.assets[0]) {
      await processAndUpload(result.assets[0].uri, result.assets[0].mimeType ?? 'image/jpeg');
    }
  };

  const processAndUpload = async (uri: string, rawMimeType = 'image/jpeg') => {
    if (!userId) return;
    setError('');
    setUploading(true);

    let publicUrl: string;
    try {
      publicUrl = await uploadAvatar(uri, rawMimeType) as string;
    } catch (e: any) {
      setUploading(false);
      setError(e.message ?? '画像のアップロードに失敗しました。もう一度お試しください');
      return;
    }
    // Storing with ?t=timestamp ensures CDN always serves the latest file
    // even after app restarts (different URL string = no stale cache).
    const displayUrl = `${publicUrl}?t=${Date.now()}`;
    setAvatarUri(displayUrl);

    // Persist to DB immediately (with the timestamped URL) so profile tab reflects the change
    const { data: updated, error: dbError } = await supabase
      .from('users')
      .update({ avatar_url: displayUrl, updated_at: new Date().toISOString() })
      .eq('id', userId)
      .select()
      .single();

    setUploading(false);

    if (!dbError && updated) {
      // Store already has displayUrl via setAvatarUri; sync full profile object too
      setProfile({ ...updated, avatar_url: displayUrl });
      showToast('プロフィール画像を更新しました');
    } else {
      console.error('[Avatar] DB update error:', dbError);
      setError('DBの更新に失敗しました。もう一度お試しください');
    }
  };

  const save = async () => {
    if (!userId) return;
    if (!displayName.trim()) {
      setError('表示名を入力してください');
      return;
    }
    if (!handle.trim() || !/^[a-z0-9_]+$/.test(handle)) {
      setError('@IDは英小文字・数字・_のみ使用できます');
      return;
    }

    setLoading(true);
    setError('');

    if (handle !== profile?.handle) {
      const { data: existing } = await supabase
        .from('users')
        .select('id')
        .eq('handle', handle.trim())
        .neq('id', userId)
        .maybeSingle();
      if (existing) {
        setError('このIDは既に使用されています');
        setLoading(false);
        return;
      }
    }

    const { data, error: updateError } = await supabase
      .from('users')
      .update({
        display_name: displayName.trim(),
        handle: handle.trim(),
        bio: bio.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select()
      .single();

    setLoading(false);

    if (updateError) {
      setError('保存に失敗しました。もう一度お試しください');
      return;
    }

    if (data) {
      // Preserve the cache-busted avatar URL already shown in this session
      setProfile({ ...data, avatar_url: avatarUri || data.avatar_url });
    }
    router.back();
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.kav}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.cancelBtn}>
            <X size={22} color={Colors.textSecondary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>プロフィール編集</Text>
          <TouchableOpacity
            style={[styles.saveBtn, loading && styles.saveBtnDisabled]}
            onPress={save}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator size="small" color={Colors.white} />
              : <Text style={styles.saveBtnText}>保存</Text>}
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.avatarSection}>
            <TouchableOpacity
              style={styles.avatarWrapper}
              onPress={handleAvatarPress}
              disabled={uploading}
              activeOpacity={0.8}
            >
              <Avatar
                uri={avatarUri || null}
                name={displayName || handle}
                size={96}
              />
              {/* Upload spinner overlay */}
              {uploading && (
                <View style={styles.avatarUploadOverlay}>
                  <ActivityIndicator size="large" color={Colors.white} />
                </View>
              )}
              {/* Camera badge */}
              {!uploading && (
                <View style={styles.cameraBtn}>
                  <Camera size={16} color={Colors.white} />
                </View>
              )}
            </TouchableOpacity>
            <Text style={styles.changePhotoText}>
              {uploading ? 'アップロード中...' : '写真を変更'}
            </Text>
          </View>

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.form}>
            <View style={styles.field}>
              <Text style={styles.label}>表示名</Text>
              <TextInput
                style={styles.input}
                value={displayName}
                onChangeText={setDisplayName}
                placeholder="表示名"
                placeholderTextColor={Colors.textMuted}
                maxLength={50}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>@ID</Text>
              <View style={styles.handleWrapper}>
                <Text style={styles.atSign}>@</Text>
                <TextInput
                  style={styles.handleInput}
                  value={handle}
                  onChangeText={(t) => setHandle(t.toLowerCase())}
                  placeholder="your_id"
                  placeholderTextColor={Colors.textMuted}
                  autoCapitalize="none"
                  autoCorrect={false}
                  maxLength={30}
                />
              </View>
              <Text style={styles.hint}>英小文字・数字・_のみ使用可能</Text>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>自己紹介</Text>
              <TextInput
                style={[styles.input, styles.bioInput]}
                value={bio}
                onChangeText={setBio}
                placeholder="自分について教えてください"
                placeholderTextColor={Colors.textMuted}
                multiline
                maxLength={200}
                textAlignVertical="top"
              />
              <Text style={styles.charCount}>{bio.length}/200</Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Toast notification */}
      {!!toast && (
        <Animated.View style={[styles.toast, { opacity: toastOpacity }]}>
          <Text style={styles.toastText}>{toast}</Text>
        </Animated.View>
      )}

      {/* Action Sheet: camera or library */}
      <Modal
        visible={showPickerSheet}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPickerSheet(false)}
      >
        <TouchableOpacity
          style={styles.sheetOverlay}
          activeOpacity={1}
          onPress={() => setShowPickerSheet(false)}
        >
          <View style={styles.sheetContainer}>
            <Text style={styles.sheetTitle}>プロフィール画像を変更</Text>
            <TouchableOpacity style={styles.sheetOption} onPress={launchCameraPicker}>
              <View style={styles.sheetIconWrap}>
                <Camera size={22} color={Colors.primary} />
              </View>
              <Text style={styles.sheetOptionText}>カメラで撮影</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.sheetOption} onPress={launchLibraryPicker}>
              <View style={styles.sheetIconWrap}>
                <ImageIcon size={22} color={Colors.primary} />
              </View>
              <Text style={styles.sheetOptionText}>ライブラリから選択</Text>
            </TouchableOpacity>
            <View style={styles.sheetDivider} />
            <TouchableOpacity
              style={styles.sheetOption}
              onPress={() => setShowPickerSheet(false)}
            >
              <Text style={styles.sheetCancelText}>キャンセル</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.white },
  kav: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.separator,
  },
  cancelBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: Colors.textPrimary },
  saveBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
    minWidth: 56,
    alignItems: 'center',
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: Colors.white, fontWeight: '700', fontSize: 14 },
  scroll: { padding: 24, gap: 24 },
  avatarSection: { alignItems: 'center', gap: 10 },
  avatarWrapper: { position: 'relative' },
  avatarUploadOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    borderRadius: 48,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraBtn: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.white,
  },
  changePhotoText: { fontSize: 14, color: Colors.secondary, fontWeight: '500' },
  errorBox: {
    backgroundColor: '#FFEBEE',
    borderRadius: 10,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: Colors.error,
  },
  errorText: { color: Colors.error, fontSize: 13 },
  form: { gap: 20 },
  field: { gap: 8 },
  label: { fontSize: 13, fontWeight: '600', color: Colors.textPrimary },
  input: {
    backgroundColor: Colors.inputBackground,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  handleWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.inputBackground,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    height: 50,
  },
  atSign: { fontSize: 15, color: Colors.textMuted, marginRight: 2 },
  handleInput: { flex: 1, fontSize: 15, color: Colors.textPrimary },
  hint: { fontSize: 11, color: Colors.textMuted },
  bioInput: { height: 100, paddingTop: 12 },
  charCount: { fontSize: 11, color: Colors.textMuted, textAlign: 'right' },

  // Toast
  toast: {
    position: 'absolute',
    bottom: 40,
    left: 24,
    right: 24,
    backgroundColor: '#1C1C1E',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  toastText: { color: Colors.white, fontSize: 14, fontWeight: '600' },

  // Action Sheet
  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 32,
    paddingTop: 8,
    paddingHorizontal: 16,
  },
  sheetTitle: {
    textAlign: 'center',
    fontSize: 13,
    color: Colors.textMuted,
    paddingVertical: 12,
    fontWeight: '500',
  },
  sheetOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 8,
  },
  sheetIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetOptionText: {
    fontSize: 17,
    color: Colors.textPrimary,
    fontWeight: '500',
  },
  sheetDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 4,
  },
  sheetCancelText: {
    fontSize: 17,
    color: Colors.error,
    fontWeight: '600',
    textAlign: 'center',
    flex: 1,
  },
});
