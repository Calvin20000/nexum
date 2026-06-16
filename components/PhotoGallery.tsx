import React, { useEffect, useState, useRef } from 'react';
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
  FlatList,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { X, Plus, Trash2, ChevronLeft, ChevronRight } from 'lucide-react-native';
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
  const [uploading, setUploading] = useState(false);
  // Caption flow: shown after image is picked, before upload
  const [pendingUri, setPendingUri] = useState<string | null>(null);
  const [pendingMime, setPendingMime] = useState('image/jpeg');
  const [captionInput, setCaptionInput] = useState('');
  // Slideshow viewer
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [editingCaption, setEditingCaption] = useState(false);
  const [editCaptionText, setEditCaptionText] = useState('');
  const flatListRef = useRef<FlatList<ProfilePhoto>>(null);

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
          const newPhotos = photos.filter((p) => p.id !== photoId);
          setPhotos(newPhotos);
          if (newPhotos.length === 0) {
            setViewerIndex(null);
          } else if (viewerIndex !== null) {
            const newIndex = Math.min(viewerIndex, newPhotos.length - 1);
            setViewerIndex(newIndex);
          }
          setEditingCaption(false);
        },
      },
    ]);
  };

  const saveCaption = async () => {
    if (viewerIndex === null) return;
    const photo = photos[viewerIndex];
    await supabase
      .from('profile_photos')
      .update({ caption: editCaptionText.trim() || null })
      .eq('id', photo.id);
    const updated = { ...photo, caption: editCaptionText.trim() || null };
    setPhotos((prev) => prev.map((p) => (p.id === photo.id ? updated : p)));
    setEditingCaption(false);
  };

  const openViewer = (index: number) => {
    setViewerIndex(index);
    setEditingCaption(false);
    setTimeout(() => {
      flatListRef.current?.scrollToIndex({ index, animated: false });
    }, 50);
  };

  const currentPhoto = viewerIndex !== null ? photos[viewerIndex] : null;

  const renderSlide = ({ item, index }: { item: ProfilePhoto; index: number }) => (
    <View style={styles.slide}>
      <Image source={{ uri: item.photo_url }} style={styles.fullPhoto} resizeMode="contain" />
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>フォト</Text>
      <View style={styles.grid}>
        {photos.map((photo, index) => (
          <TouchableOpacity
            key={photo.id}
            onPress={() => openViewer(index)}
            style={styles.photoItem}
            activeOpacity={0.85}
          >
            <Image source={{ uri: photo.photo_url }} style={styles.photo} resizeMode="cover" />
            {photo.caption ? (
              <Text style={styles.captionBelow} numberOfLines={2}>{photo.caption}</Text>
            ) : isOwner ? (
              <Text style={styles.captionPlaceholder}>＋ コメントを追加</Text>
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

      {/* Slideshow viewer */}
      <Modal
        visible={viewerIndex !== null}
        transparent
        animationType="fade"
        onRequestClose={() => { setViewerIndex(null); setEditingCaption(false); }}
      >
        <View style={styles.modal}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => { setViewerIndex(null); setEditingCaption(false); }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <X size={22} color="#FFFFFF" />
          </TouchableOpacity>

          {/* Photo counter */}
          {photos.length > 1 && viewerIndex !== null && (
            <View style={styles.counter}>
              <Text style={styles.counterText}>{viewerIndex + 1} / {photos.length}</Text>
            </View>
          )}

          {/* Horizontal paging FlatList */}
          <FlatList
            ref={flatListRef}
            data={photos}
            keyExtractor={(p) => p.id}
            renderItem={renderSlide}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(e) => {
              const newIndex = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
              if (newIndex !== viewerIndex) {
                setViewerIndex(newIndex);
                setEditingCaption(false);
              }
            }}
            getItemLayout={(_, index) => ({ length: SCREEN_WIDTH, offset: SCREEN_WIDTH * index, index })}
            initialScrollIndex={viewerIndex ?? 0}
          />

          {/* Prev/Next arrows */}
          {viewerIndex !== null && viewerIndex > 0 && (
            <TouchableOpacity
              style={[styles.arrowBtn, styles.arrowLeft]}
              onPress={() => {
                const newIdx = viewerIndex - 1;
                flatListRef.current?.scrollToIndex({ index: newIdx, animated: true });
                setViewerIndex(newIdx);
                setEditingCaption(false);
              }}
            >
              <ChevronLeft size={24} color="#FFFFFF" />
            </TouchableOpacity>
          )}
          {viewerIndex !== null && viewerIndex < photos.length - 1 && (
            <TouchableOpacity
              style={[styles.arrowBtn, styles.arrowRight]}
              onPress={() => {
                const newIdx = viewerIndex + 1;
                flatListRef.current?.scrollToIndex({ index: newIdx, animated: true });
                setViewerIndex(newIdx);
                setEditingCaption(false);
              }}
            >
              <ChevronRight size={24} color="#FFFFFF" />
            </TouchableOpacity>
          )}

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
                  if (!isOwner || !currentPhoto) return;
                  setEditCaptionText(currentPhoto.caption ?? '');
                  setEditingCaption(true);
                }}
                activeOpacity={isOwner ? 0.7 : 1}
              >
                {currentPhoto?.caption ? (
                  <Text style={styles.captionText}>{currentPhoto.caption}</Text>
                ) : isOwner ? (
                  <Text style={styles.captionPlaceholder}>コメントを追加する</Text>
                ) : null}
              </TouchableOpacity>
            )}
          </View>

          {isOwner && !editingCaption && currentPhoto && (
            <TouchableOpacity
              style={styles.deleteBtn}
              onPress={() => deletePhoto(currentPhoto.id)}
            >
              <Trash2 size={16} color="#FFFFFF" />
              <Text style={styles.deleteBtnText}>削除</Text>
            </TouchableOpacity>
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
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: Colors.surface,
  },
  photo: {
    width: ITEM_SIZE,
    height: ITEM_SIZE,
  },
  captionBelow: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.textPrimary,
    paddingHorizontal: 4,
    paddingTop: 5,
    paddingBottom: 5,
    lineHeight: 18,
    backgroundColor: Colors.surface,
  },
  captionPlaceholder: {
    fontSize: 12,
    color: '#1976D2',
    fontWeight: '500',
    paddingHorizontal: 4,
    paddingTop: 5,
    paddingBottom: 5,
    backgroundColor: Colors.surface,
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
    backgroundColor: 'rgba(0,0,0,0.95)',
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
  counter: {
    position: 'absolute',
    top: 58,
    alignSelf: 'center',
    zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  counterText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  slide: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullPhoto: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH,
  },
  arrowBtn: {
    position: 'absolute',
    top: '50%',
    marginTop: -22,
    zIndex: 10,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowLeft: { left: 12 },
  arrowRight: { right: 12 },
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(211,47,47,0.9)',
    paddingHorizontal: 24,
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
