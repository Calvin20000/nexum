/*
# Add sticker message type

Alters the messages.message_type CHECK constraint to include 'sticker' as a valid value,
enabling sticker messages alongside existing text and image types.
*/

ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_message_type_check;
ALTER TABLE messages ADD CONSTRAINT messages_message_type_check
  CHECK (message_type IN ('text', 'image', 'sticker'));
