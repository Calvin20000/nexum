import { File, Paths } from 'expo-file-system';
import { Platform } from 'react-native';
import { supabase } from './supabase';

export function getMimeInfo(rawMimeType: string): { mime: string; ext: string } {
  if (rawMimeType.includes('png')) return { mime: 'image/png', ext: 'png' };
  if (rawMimeType.includes('gif')) return { mime: 'image/gif', ext: 'gif' };
  if (rawMimeType.includes('webp')) return { mime: 'image/webp', ext: 'webp' };
  return { mime: 'image/jpeg', ext: 'jpg' };
}

export async function uploadImageToStorage(
  uri: string,
  bucket: string,
  path: string,
  rawMimeType = 'image/jpeg',
): Promise<string> {
  const { mime, ext } = getMimeInfo(rawMimeType);
  let fileData: Uint8Array;

  if (Platform.OS === 'web') {
    const response = await fetch(uri);
    if (!response.ok) throw new Error(`fetch failed: ${response.status} ${response.statusText}`);
    fileData = new Uint8Array(await response.arrayBuffer());
  } else {
    let sourceFile = new File(uri);
    // ph:// (iOS) and content:// (Android) URIs must be copied to file:// first
    if (!uri.startsWith('file://')) {
      const destFile = new File(Paths.cache, `upload_${Date.now()}.${ext}`);
      await sourceFile.copy(destFile);
      sourceFile = destFile;
    }
    fileData = new Uint8Array(await sourceFile.arrayBuffer());
  }

  console.log(`[upload] bucket=${bucket} path=${path} mime=${mime} size=${fileData.byteLength}`);

  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, fileData, { contentType: mime, upsert: true });

  if (error) {
    console.error('[upload] Supabase error:', JSON.stringify(error));
    throw new Error(`Storage upload failed: ${error.message} (${(error as any).statusCode ?? 'no code'})`);
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}
