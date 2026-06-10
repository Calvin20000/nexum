-- Make the chats storage bucket public so getPublicUrl works correctly
-- Also add webp to allowed mime types for modern mobile devices
UPDATE storage.buckets
SET
  public = true,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
WHERE id = 'chats';
