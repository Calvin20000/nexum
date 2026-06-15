CREATE TABLE public.friend_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.friend_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "groups_own"
ON public.friend_groups FOR ALL
TO authenticated
USING (auth.uid() = owner_id)
WITH CHECK (auth.uid() = owner_id);

CREATE TABLE public.friend_group_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.friend_groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT unique_member UNIQUE (group_id, user_id)
);

ALTER TABLE public.friend_group_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "group_members_own"
ON public.friend_group_members FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.friend_groups g
    WHERE g.id = group_id AND g.owner_id = auth.uid()
  )
);
