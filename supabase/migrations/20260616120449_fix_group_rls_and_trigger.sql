-- Helper: check group membership without triggering RLS (SECURITY DEFINER bypasses RLS)
CREATE OR REPLACE FUNCTION public.is_group_member(p_group_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM group_members
    WHERE group_id = p_group_id AND user_id = auth.uid()
  );
$$;

-- Helper: check group ownership without triggering RLS
CREATE OR REPLACE FUNCTION public.is_group_owner(p_group_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM group_conversations
    WHERE id = p_group_id AND owner_id = auth.uid()
  );
$$;

-- Trigger: auto-update last_message_at so any member sending a message updates it
CREATE OR REPLACE FUNCTION public.update_group_last_message_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE group_conversations
  SET last_message_at = NEW.created_at
  WHERE id = NEW.group_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_group_messages_last_message_at ON public.group_messages;
CREATE TRIGGER trg_group_messages_last_message_at
AFTER INSERT ON public.group_messages
FOR EACH ROW EXECUTE FUNCTION public.update_group_last_message_at();

-- Rebuild all group RLS policies to use non-recursive helpers
DROP POLICY IF EXISTS "group_conv_select"    ON public.group_conversations;
DROP POLICY IF EXISTS "group_conv_insert"    ON public.group_conversations;
DROP POLICY IF EXISTS "group_conv_update"    ON public.group_conversations;
DROP POLICY IF EXISTS "group_conv_delete"    ON public.group_conversations;
DROP POLICY IF EXISTS "group_members_select" ON public.group_members;
DROP POLICY IF EXISTS "group_members_insert" ON public.group_members;
DROP POLICY IF EXISTS "group_members_update" ON public.group_members;
DROP POLICY IF EXISTS "group_members_delete" ON public.group_members;
DROP POLICY IF EXISTS "group_messages_select" ON public.group_messages;
DROP POLICY IF EXISTS "group_messages_insert" ON public.group_messages;
DROP POLICY IF EXISTS "group_messages_update" ON public.group_messages;

-- group_conversations
CREATE POLICY "group_conv_select" ON public.group_conversations FOR SELECT
  TO authenticated USING (is_group_member(id));

CREATE POLICY "group_conv_insert" ON public.group_conversations FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = owner_id);

-- All members may update (needed for last_message_at, though trigger now handles it too)
CREATE POLICY "group_conv_update" ON public.group_conversations FOR UPDATE
  TO authenticated USING (is_group_member(id)) WITH CHECK (is_group_member(id));

CREATE POLICY "group_conv_delete" ON public.group_conversations FOR DELETE
  TO authenticated USING (auth.uid() = owner_id);

-- group_members
CREATE POLICY "group_members_select" ON public.group_members FOR SELECT
  TO authenticated USING (is_group_member(group_id));

-- Owner can add members (uses SECURITY DEFINER fn — no RLS loop on group_conversations)
CREATE POLICY "group_members_insert" ON public.group_members FOR INSERT
  TO authenticated WITH CHECK (is_group_owner(group_id));

CREATE POLICY "group_members_update" ON public.group_members FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "group_members_delete" ON public.group_members FOR DELETE
  TO authenticated USING (auth.uid() = user_id OR is_group_owner(group_id));

-- group_messages
CREATE POLICY "group_messages_select" ON public.group_messages FOR SELECT
  TO authenticated USING (is_group_member(group_id));

CREATE POLICY "group_messages_insert" ON public.group_messages FOR INSERT
  TO authenticated WITH CHECK (sender_id = auth.uid() AND is_group_member(group_id));

CREATE POLICY "group_messages_update" ON public.group_messages FOR UPDATE
  TO authenticated USING (auth.uid() = sender_id) WITH CHECK (auth.uid() = sender_id);