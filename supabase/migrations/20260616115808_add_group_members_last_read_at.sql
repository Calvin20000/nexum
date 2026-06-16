ALTER TABLE public.group_members
  ADD COLUMN IF NOT EXISTS last_read_at timestamptz;

CREATE POLICY "group_members_update" ON public.group_members FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);