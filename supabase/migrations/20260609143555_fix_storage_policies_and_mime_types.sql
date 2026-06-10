-- Drop all existing storage object policies
DROP POLICY IF EXISTS "avatars_select"    ON storage.objects;
DROP POLICY IF EXISTS "avatars_insert"    ON storage.objects;
DROP POLICY IF EXISTS "avatars_update"    ON storage.objects;
DROP POLICY IF EXISTS "avatars_delete"    ON storage.objects;
DROP POLICY IF EXISTS "chats_select"      ON storage.objects;
DROP POLICY IF EXISTS "chats_insert"      ON storage.objects;
DROP POLICY IF EXISTS "chats_update"      ON storage.objects;
DROP POLICY IF EXISTS "chats_delete"      ON storage.objects;
-- Also drop any alternative names
DROP POLICY IF EXISTS "avatars_select_all"          ON storage.objects;
DROP POLICY IF EXISTS "avatars_insert_own"          ON storage.objects;
DROP POLICY IF EXISTS "avatars_update_own"          ON storage.objects;
DROP POLICY IF EXISTS "chats_insert_authenticated"  ON storage.objects;
DROP POLICY IF EXISTS "chats_select_authenticated"  ON storage.objects;
DROP POLICY IF EXISTS "chats_update_authenticated"  ON storage.objects;

-- avatars: anyone can view (public bucket)
CREATE POLICY "avatars_select"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

-- avatars: authenticated users can upload to their own folder
CREATE POLICY "avatars_insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- avatars: authenticated users can update their own files
CREATE POLICY "avatars_update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- avatars: authenticated users can delete their own files
CREATE POLICY "avatars_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- chats: authenticated users can view
CREATE POLICY "chats_select"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'chats');

-- chats: authenticated users can upload
CREATE POLICY "chats_insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'chats');

-- chats: authenticated users can update (needed for upsert)
CREATE POLICY "chats_update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'chats')
  WITH CHECK (bucket_id = 'chats');

-- chats: authenticated users can delete their own uploads
CREATE POLICY "chats_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'chats');

-- Remove MIME type restriction from avatars so all image types are accepted
UPDATE storage.buckets
SET allowed_mime_types = NULL
WHERE id = 'avatars';
