set role postgres;

CREATE TABLE IF NOT EXISTS public.group_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  owner_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  avatar_url text,
  last_message_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.group_conversations ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.group_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.group_conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  joined_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT unique_group_member UNIQUE (group_id, user_id)
);

ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.group_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.group_conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  message_type text NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'sticker', 'stamp')),
  content text,
  image_url text,
  is_deleted boolean NOT NULL DEFAULT false,
  reply_to_id uuid REFERENCES public.group_messages(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.group_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "group_conv_select" ON public.group_conversations FOR SELECT
TO authenticated USING (
  EXISTS (SELECT 1 FROM public.group_members gm WHERE gm.group_id = id AND gm.user_id = auth.uid())
);

CREATE POLICY "group_conv_insert" ON public.group_conversations FOR INSERT
TO authenticated WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "group_conv_update" ON public.group_conversations FOR UPDATE
TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "group_conv_delete" ON public.group_conversations FOR DELETE
TO authenticated USING (auth.uid() = owner_id);

CREATE POLICY "group_members_select" ON public.group_members FOR SELECT
TO authenticated USING (
  EXISTS (SELECT 1 FROM public.group_members gm WHERE gm.group_id = group_id AND gm.user_id = auth.uid())
);

CREATE POLICY "group_members_insert" ON public.group_members FOR INSERT
TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.group_conversations gc WHERE gc.id = group_id AND gc.owner_id = auth.uid())
);

CREATE POLICY "group_members_delete" ON public.group_members FOR DELETE
TO authenticated USING (
  auth.uid() = user_id OR
  EXISTS (SELECT 1 FROM public.group_conversations gc WHERE gc.id = group_id AND gc.owner_id = auth.uid())
);

CREATE POLICY "group_messages_select" ON public.group_messages FOR SELECT
TO authenticated USING (
  EXISTS (SELECT 1 FROM public.group_members gm WHERE gm.group_id = group_id AND gm.user_id = auth.uid())
);

CREATE POLICY "group_messages_insert" ON public.group_messages FOR INSERT
TO authenticated WITH CHECK (
  sender_id = auth.uid() AND
  EXISTS (SELECT 1 FROM public.group_members gm WHERE gm.group_id = group_id AND gm.user_id = auth.uid())
);

CREATE POLICY "group_messages_update" ON public.group_messages FOR UPDATE
TO authenticated USING (auth.uid() = sender_id) WITH CHECK (auth.uid() = sender_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.group_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.group_conversations;