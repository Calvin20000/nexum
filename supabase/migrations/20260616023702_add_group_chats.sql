-- Members table first (no self-reference needed)
CREATE TABLE public.group_chat_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_chat_id uuid NOT NULL,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  joined_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT group_chat_members_unique UNIQUE (group_chat_id, user_id)
);

-- Group chats table
CREATE TABLE public.group_chats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_by uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  last_message_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Add FK after both tables exist
ALTER TABLE public.group_chat_members
  ADD CONSTRAINT group_chat_members_group_fk
  FOREIGN KEY (group_chat_id) REFERENCES public.group_chats(id) ON DELETE CASCADE;

-- Messages table
CREATE TABLE public.group_chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_chat_id uuid NOT NULL REFERENCES public.group_chats(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  content text,
  message_type text NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'sticker')),
  image_url text,
  is_deleted boolean NOT NULL DEFAULT false,
  reply_to_id uuid REFERENCES public.group_chat_messages(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.group_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_chat_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "group_chats_select" ON public.group_chats FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.group_chat_members m WHERE m.group_chat_id = id AND m.user_id = auth.uid())
  );

CREATE POLICY "group_chats_insert" ON public.group_chats FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "group_chats_update" ON public.group_chats FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "group_chats_delete" ON public.group_chats FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by);

CREATE POLICY "group_chat_members_select" ON public.group_chat_members FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    EXISTS (SELECT 1 FROM public.group_chat_members m2 WHERE m2.group_chat_id = group_chat_id AND m2.user_id = auth.uid())
  );

CREATE POLICY "group_chat_members_insert" ON public.group_chat_members FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.group_chats g WHERE g.id = group_chat_id AND g.created_by = auth.uid())
    OR user_id = auth.uid()
  );

CREATE POLICY "group_chat_members_delete" ON public.group_chat_members FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid() OR
    EXISTS (SELECT 1 FROM public.group_chats g WHERE g.id = group_chat_id AND g.created_by = auth.uid())
  );

CREATE POLICY "group_chat_messages_select" ON public.group_chat_messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.group_chat_members m WHERE m.group_chat_id = group_chat_id AND m.user_id = auth.uid())
  );

CREATE POLICY "group_chat_messages_insert" ON public.group_chat_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS (SELECT 1 FROM public.group_chat_members m WHERE m.group_chat_id = group_chat_id AND m.user_id = auth.uid())
  );

CREATE POLICY "group_chat_messages_update" ON public.group_chat_messages FOR UPDATE
  TO authenticated
  USING (sender_id = auth.uid())
  WITH CHECK (sender_id = auth.uid());

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.group_chats;
ALTER PUBLICATION supabase_realtime ADD TABLE public.group_chat_messages;
