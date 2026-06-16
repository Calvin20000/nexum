import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { ChevronLeft, QrCode } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { Colors } from '@/lib/colors';
import { useColors } from '@/lib/theme';

const SCAN_PREFIX = 'nexum://add/';

export default function QRScanScreen() {
  const C = useColors();
  const { session } = useAuthStore();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [processing, setProcessing] = useState(false);

  const handleBarcode = useCallback(
    async ({ data }: { data: string }) => {
      if (scanned || processing) return;
      if (!data.startsWith(SCAN_PREFIX)) return;

      const handle = data.slice(SCAN_PREFIX.length).trim();
      if (!handle) return;

      setScanned(true);
      setProcessing(true);

      const userId = session?.user?.id;
      if (!userId) {
        setProcessing(false);
        return;
      }

      const { data: target } = await supabase
        .from('users')
        .select('*')
        .ilike('handle', handle)
        .maybeSingle() as any;

      if (!target) {
        Alert.alert('見つかりません', `@${handle} というユーザーは存在しません。`, [
          { text: 'OK', onPress: () => { setScanned(false); setProcessing(false); } },
        ]);
        return;
      }

      if (target.id === userId) {
        Alert.alert('エラー', '自分自身にフレンド申請はできません。', [
          { text: 'OK', onPress: () => { setScanned(false); setProcessing(false); } },
        ]);
        return;
      }

      const { data: existing } = await supabase
        .from('friendships')
        .select('status')
        .or(
          `and(requester_id.eq.${userId},addressee_id.eq.${target.id}),and(requester_id.eq.${target.id},addressee_id.eq.${userId})`
        )
        .maybeSingle() as any;

      if (existing?.status === 'accepted') {
        Alert.alert('すでにフレンドです', `@${handle} はすでにフレンドです。`, [
          { text: 'OK', onPress: () => router.back() },
        ]);
        return;
      }

      if (existing?.status === 'pending') {
        Alert.alert('申請済み', `@${handle} へのフレンド申請はすでに送られています。`, [
          { text: 'OK', onPress: () => router.back() },
        ]);
        return;
      }

      const { error } = await (supabase.from('friendships') as any).insert({
        requester_id: userId,
        addressee_id: target.id,
      });

      setProcessing(false);

      if (error) {
        Alert.alert('エラー', 'フレンド申請に失敗しました。', [
          { text: 'OK', onPress: () => { setScanned(false); } },
        ]);
      } else {
        Alert.alert(
          'フレンド申請を送りました',
          `@${handle} にフレンド申請を送りました。`,
          [{ text: 'OK', onPress: () => router.back() }]
        );
      }
    },
    [scanned, processing, session]
  );

  if (Platform.OS === 'web') {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <ChevronLeft size={24} color={C.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>QRコードをスキャン</Text>
          <View style={styles.headerRight} />
        </View>
        <View style={styles.center}>
          <QrCode size={48} color={Colors.textMuted} />
          <Text style={styles.webNote}>QRスキャンはモバイルアプリのみ対応しています。</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!permission) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator color={C.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <ChevronLeft size={24} color={C.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>QRコードをスキャン</Text>
          <View style={styles.headerRight} />
        </View>
        <View style={styles.center}>
          <QrCode size={52} color={Colors.textMuted} />
          <Text style={styles.permissionTitle}>カメラへのアクセスが必要です</Text>
          <Text style={styles.permissionSub}>QRコードをスキャンするためにカメラを使用します。</Text>
          <TouchableOpacity
            style={[styles.permissionBtn, { backgroundColor: C.primary }]}
            onPress={requestPermission}
          >
            <Text style={styles.permissionBtnText}>許可する</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.fullscreen}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={scanned ? undefined : handleBarcode}
      />

      {/* Dark overlay with cutout effect using 4 rectangles */}
      <View style={styles.overlayTop} />
      <View style={styles.overlayMiddle}>
        <View style={styles.overlaySide} />
        <View style={styles.scanWindow}>
          <View style={[styles.scanCorner, styles.scanCornerTL, { borderColor: C.primary }]} />
          <View style={[styles.scanCorner, styles.scanCornerTR, { borderColor: C.primary }]} />
          <View style={[styles.scanCorner, styles.scanCornerBL, { borderColor: C.primary }]} />
          <View style={[styles.scanCorner, styles.scanCornerBR, { borderColor: C.primary }]} />
          {processing && (
            <View style={styles.processingOverlay}>
              <ActivityIndicator size="large" color="#FFFFFF" />
            </View>
          )}
        </View>
        <View style={styles.overlaySide} />
      </View>
      <View style={styles.overlayBottom}>
        <Text style={styles.scanHint}>QRコードをフレーム内に合わせてください</Text>
      </View>

      {/* Header */}
      <SafeAreaView style={styles.headerAbsolute} pointerEvents="box-none">
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backBtnDark}
            onPress={() => router.back()}
          >
            <ChevronLeft size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitleDark}>QRコードをスキャン</Text>
          <View style={styles.headerRight} />
        </View>
      </SafeAreaView>
    </View>
  );
}

const WINDOW_SIZE = 260;
const CORNER_SIZE = 28;
const CORNER_THICK = 4;

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  fullscreen: { flex: 1, backgroundColor: '#000' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 4,
  },
  headerAbsolute: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  backBtnDark: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '700', color: Colors.textPrimary },
  headerTitleDark: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '700', color: '#FFFFFF' },
  headerRight: { width: 40 },

  // Overlay pieces
  overlayTop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.62)',
  },
  overlayMiddle: {
    flexDirection: 'row',
    height: WINDOW_SIZE,
  },
  overlaySide: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.62)',
  },
  scanWindow: {
    width: WINDOW_SIZE,
    height: WINDOW_SIZE,
    position: 'relative',
  },
  overlayBottom: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.62)',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 28,
    paddingHorizontal: 32,
  },
  scanHint: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },

  // Corner decorations
  scanCorner: {
    position: 'absolute',
    width: CORNER_SIZE,
    height: CORNER_SIZE,
  },
  scanCornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: CORNER_THICK,
    borderLeftWidth: CORNER_THICK,
    borderTopLeftRadius: 6,
  },
  scanCornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: CORNER_THICK,
    borderRightWidth: CORNER_THICK,
    borderTopRightRadius: 6,
  },
  scanCornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: CORNER_THICK,
    borderLeftWidth: CORNER_THICK,
    borderBottomLeftRadius: 6,
  },
  scanCornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: CORNER_THICK,
    borderRightWidth: CORNER_THICK,
    borderBottomRightRadius: 6,
  },
  processingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 4,
  },

  // Permission / web screens
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, paddingHorizontal: 32 },
  permissionTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary, textAlign: 'center' },
  permissionSub: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20 },
  permissionBtn: {
    borderRadius: 14,
    paddingHorizontal: 32,
    paddingVertical: 14,
    marginTop: 8,
  },
  permissionBtnText: { color: Colors.white, fontWeight: '700', fontSize: 15 },
  webNote: { fontSize: 15, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22 },
});
