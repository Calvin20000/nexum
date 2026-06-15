-- profile_photos テーブル
CREATE TABLE IF NOT EXISTS public.profile_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  photo_url text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profile_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profile_photos_select"
ON public.profile_photos FOR SELECT
TO authenticated USING (true);

CREATE POLICY "profile_photos_insert"
ON public.profile_photos FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "profile_photos_delete"
ON public.profile_photos FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- profiles ストレージバケット
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'profiles',
  'profiles',
  true,
  5242880,
  ARRAY['image/jpeg','image/png','image/webp']
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "profiles_select_all"
ON storage.objects FOR SELECT
USING (bucket_id = 'profiles');

CREATE POLICY "profiles_insert_own"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'profiles'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "profiles_delete_own"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'profiles'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
