import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Alert,
  ActivityIndicator,
  Dimensions,
  TextInput,
  ScrollView,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { X, Plus } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { uploadImageToStorage } from '@/lib/imageUpload';
import { Colors } from '@/lib/colors';
import { useColors } from '@/lib/theme';
import { ProfilePhoto } from '@/types/database';

interface Props {
  userId: string;
  isOwner: boolean;
}

const SCREEN_WIDTH = Dimensions.get('window').width;

export function PhotoGallery({ userId, isOwner }: Props) {
  const C = useColors();
  const [photos, setPhotos] = useState<ProfilePhoto[]>([]);
  const [selectedPhoto, setSelectedPhoto] = useState<ProfilePhoto | null>(null);
  const [uploading, setUploading] = useState(false);
  // Caption flow: shown after image is picked, before upload
  const [pendingUri, setPendingUri] = useState<string | null>(null);
  const [pendingMime, setPendingMime] = useState('image/jpeg');
  const [captionInput, setCaptionInput] = useState('');
  // Editing caption on existing photo
  const [editingCaption, setEditingCaption] = useState(false);
  const [editCaptionText, setEditCaptionText] = useState('');

  const fetchPhotos = async () => {
    const { data } = await supabase
      .from('profile_photos')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(6);
    setPhotos(data || []);
  };

  useEffect(() => {
    fetchPhotos();
  }, [userId]);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('権限が必要です', '写真ライブラリへのアクセスを許可してください。');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (result.canceled || !result.assets[0]) return;
    setPendingUri(result.assets[0].uri);
    setPendingMime(result.assets[0].mimeType ?? 'image/jpeg');
    setCaptionInput('');
  };

  const confirmUpload = async () => {
    if (!pendingUri) return;
    setUploading(true);
    try {
      const photoId = Date.now().toString();
      const path = `${userId}/${photoId}.jpg`;
      const url = await uploadImageToStorage(pendingUri, 'profiles', path, pendingMime);

      const { error } = await supabase
        .from('profile_photos')
        .insert({
          user_id: userId,
          photo_url: url,
          caption: captionInput.trim() || null,
        });

      if (!error) {
        fetchPhotos();
        setPendingUri(null);
        setCaptionInput('');
      }
    } catch {
      Alert.alert('エラー', '写真のアップロードに失敗しました。');
    } finally {
      setUploading(false);
    }
  };

  const deletePhoto = (photoId: string) => {
    Alert.alert('写真を削除', 'この写真を削除しますか？', [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: '削除',
        style: 'destructive',
        onPress: async () => {
          await supabase.from('profile_photos').delete().eq('id', photoId);
          setSelectedPhoto(null);
          fetchPhotos();
        },
      },
    ]);
  };

  const saveCaption = async () => {
    if (!selectedPhoto) return;
    await supabase
      .from('profile_photos')
      .update({ caption: editCaptionText.trim() || null })
      .eq('id', selectedPhoto.id);
    setSelectedPhoto((p) => p ? { ...p, caption: editCaptionText.trim() || null } : p);
    setPhotos((prev) =>
      prev.map((ph) =>
        ph.id === selectedPhoto.id ? { ...ph, caption: editCaptionText.trim() || null } : ph
      )
    );
    setEditingCaption(false);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>フォト</Text>
      <View style={styles.grid}>
        {photos.map((photo) => (
          <TouchableOpacity
            key={photo.id}
            onPress={() => setSelectedPhoto(photo)}
            onLongPress={() => isOwner && deletePhoto(photo.id)}
            style={styles.photoItem}
            activeOpacity={0.85}
          >
            <Image source={{ uri: photo.photo_url }} style={styles.photo} resizeMode="cover" />
            {photo.caption ? (
              <View style={styles.captionOverlay}>
                <Text style={styles.captionOverlayText} numberOfLines={2}>{photo.caption}</Text>
              </View>
            ) : null}
          </TouchableOpacity>
        ))}

        {isOwner && photos.length < 6 && (
          <TouchableOpacity
            onPress={pickImage}
            style={[styles.addButton, { borderColor: C.primary }]}
            disabled={uploading}
            activeOpacity={0.7}
          >
            {uploading ? (
              <ActivityIndicator size="small" color={C.primary} />
            ) : (
              <Plus size={28} color={C.primary} strokeWidth={2} />
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* Caption input modal after image pick */}
      <Modal visible={!!pendingUri} transparent animationType="slide" onRequestClose={() => setPendingUri(null)}>
        <View style={styles.captionModal}>
          <View style={styles.captionModalBox}>
            <View style={styles.captionModalHeader}>
              <Text style={styles.captionModalTitle}>写真を追加</Text>
              <TouchableOpacity onPress={() => setPendingUri(null)}>
                <X size={22} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>
            {pendingUri && (
              <Image source={{ uri: pendingUri }} style={styles.captionPreviewImg} resizeMode="cover" />
            )}
            <TextInput
              style={styles.captionTextInput}
              placeholder="コメントを追加（任意）"
              placeholderTextColor={Colors.textMuted}
              value={captionInput}
              onChangeText={setCaptionInput}
              maxLength={100}
              multiline
            />
            <TouchableOpacity
              style={[styles.captionSubmitBtn, { backgroundColor: C.primary }, uploading && { opacity: 0.5 }]}
              onPress={confirmUpload}
              disabled={uploading}
            >
              {uploading
                ? <ActivityIndicator size="small" color={Colors.white} />
                : <Text style={styles.captionSubmitText}>追加する</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Fullscreen photo viewer */}
      <Modal
        visible={!!selectedPhoto}
        transparent
        animationType="fade"
        onRequestClose={() => { setSelectedPhoto(null); setEditingCaption(false); }}
      >
        <View style={styles.modal}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => { setSelectedPhoto(null); setEditingCaption(false); }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <X size={22} color="#FFFFFF" />
          </TouchableOpacity>

          {selectedPhoto && (
            <>
              <Image
                source={{ uri: selectedPhoto.photo_url }}
                style={styles.fullPhoto}
                resizeMode="contain"
              />

              {/* Caption display / edit */}
              <View style={styles.captionArea}>
                {editingCaption ? (
                  <View style={styles.captionEditRow}>
                    <TextInput
                      style={styles.captionEditInput}
                      value={editCaptionText}
                      onChangeText={setEditCaptionText}
                      placeholder="コメントを入力"
                      placeholderTextColor="rgba(255,255,255,0.5)"
                      maxLength={100}
                      multiline
                      autoFocus
                    />
                    <TouchableOpacity
                      style={[styles.captionSaveBtn, { backgroundColor: C.primary }]}
                      onPress={saveCaption}
                    >
                      <Text style={styles.captionSaveBtnText}>保存</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    onPress={() => {
                      if (!isOwner) return;
                      setEditCaptionText(selectedPhoto.caption ?? '');
                      setEditingCaption(true);
                    }}
                    activeOpacity={isOwner ? 0.7 : 1}
                  >
                    {selectedPhoto.caption ? (
                      <Text style={styles.captionText}>{selectedPhoto.caption}</Text>
                    ) : isOwner ? (
                      <Text style={styles.captionPlaceholder}>コメントを追加する</Text>
                    ) : null}
                  </TouchableOpacity>
                )}
              </View>

              {isOwner && !editingCaption && (
                <TouchableOpacity
                  style={styles.deleteBtn}
                  onPress={() => deletePhoto(selectedPhoto.id)}
                >
                  <Text style={styles.deleteBtnText}>削除</Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
      </Modal>
    </View>
  );
}

const ITEM_SIZE = (SCREEN_WIDTH - 48 - 8) / 3;

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    marginBottom: 8,
  },
  title: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textMuted,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  photoItem: {
    width: ITEM_SIZE,
    height: ITEM_SIZE,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: Colors.surface,
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  captionOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 5,
    paddingVertical: 4,
  },
  captionOverlayText: {
    fontSize: 10,
    color: '#FFFFFF',
    lineHeight: 13,
  },
  addButton: {
    width: ITEM_SIZE,
    height: ITEM_SIZE,
    borderRadius: 10,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderStyle: 'dashed',
  },
  modal: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 52,
    right: 20,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullPhoto: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH,
  },
  captionArea: {
    paddingHorizontal: 24,
    paddingTop: 12,
    width: '100%',
  },
  captionText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    lineHeight: 20,
  },
  captionPlaceholder: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.4)',
    textAlign: 'center',
  },
  captionEditRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  captionEditInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.4)',
    paddingVertical: 6,
    maxHeight: 70,
  },
  captionSaveBtn: {
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  captionSaveBtnText: {
    color: Colors.white,
    fontWeight: '600',
    fontSize: 13,
  },
  deleteBtn: {
    position: 'absolute',
    bottom: 60,
    backgroundColor: 'rgba(211,47,47,0.9)',
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 12,
  },
  deleteBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  // Caption input modal
  captionModal: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  captionModalBox: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 16,
  },
  captionModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  captionModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  captionPreviewImg: {
    width: '100%',
    height: 200,
    borderRadius: 14,
    backgroundColor: Colors.surface,
  },
  captionTextInput: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.border,
    minHeight: 52,
  },
  captionSubmitBtn: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  captionSubmitText: {
    color: Colors.white,
    fontSize: 15,
    fontWeight: '700',
  },
});
