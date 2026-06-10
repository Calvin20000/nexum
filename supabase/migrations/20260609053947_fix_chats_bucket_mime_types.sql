
-- Remove MIME type restriction on chats bucket so HEIC/HEIF and other
-- camera formats from mobile devices are accepted without error.
UPDATE storage.buckets
SET allowed_mime_types = NULL
WHERE id = 'chats';
