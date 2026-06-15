ALTER TABLE public.messages
ADD COLUMN IF NOT EXISTS reply_to_id uuid REFERENCES public.messages(id);
