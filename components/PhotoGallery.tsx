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
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { X, Plus } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { uploadImageToStorage } from '@/lib/imageUpload';
import { Colors } from '@/lib/colors';
import { ProfilePhoto } from '@/types/database';

interface Props {
  userId: string;
  isOwner: boolean;
}

const SCREEN_WIDTH = Dimensions.get('window').width;

export function PhotoGallery({ userId, isOwner }: Props) {
  const [photos, setPhotos] = useState<ProfilePhoto[]>([]);
  const [selectedPhoto, setSelectedPhoto] = useState<ProfilePhoto | null>(null);
  const [uploading, setUploading] = useState(false);

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

  const addPhoto = async () => {
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

    setUploading(true);
    try {
      const asset = result.assets[0];
      const photoId = Date.now().toString();
      const path = `${userId}/${photoId}.jpg`;
      const url = await uploadImageToStorage(asset.uri, 'profiles', path, asset.mimeType ?? 'image/jpeg');

      const { error } = await supabase
        .from('profile_photos')
        .insert({ user_id: userId, photo_url: url });

      if (!error) fetchPhotos();
    } catch (e) {
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
          </TouchableOpacity>
        ))}

        {isOwner && photos.length < 6 && (
          <TouchableOpacity onPress={addPhoto} style={styles.addButton} disabled={uploading} activeOpacity={0.7}>
            {uploading ? (
              <ActivityIndicator size="small" color={Colors.primary} />
            ) : (
              <Plus size={28} color={Colors.primary} strokeWidth={2} />
            )}
          </TouchableOpacity>
        )}
      </View>

      <Modal
        visible={!!selectedPhoto}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedPhoto(null)}
      >
        <View style={styles.modal}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setSelectedPhoto(null)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <X size={22} color="#FFFFFF" />
          </TouchableOpacity>

          {selectedPhoto && (
            <Image
              source={{ uri: selectedPhoto.photo_url }}
              style={styles.fullPhoto}
              resizeMode="contain"
            />
          )}

          {isOwner && selectedPhoto && (
            <TouchableOpacity
              style={styles.deleteBtn}
              onPress={() => deletePhoto(selectedPhoto.id)}
            >
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
    height: ITEM_SIZE,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: Colors.surface,
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  addButton: {
    width: ITEM_SIZE,
    height: ITEM_SIZE,
    borderRadius: 10,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.primary,
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
});
