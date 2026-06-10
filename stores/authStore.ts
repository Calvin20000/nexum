import { create } from 'zustand';
import { Session } from '@supabase/supabase-js';
import { UserProfile } from '@/types/database';
import { supabase } from '@/lib/supabase';

interface AuthState {
  session: Session | null;
  profile: UserProfile | null;
  loading: boolean;
  setSession: (session: Session | null) => void;
  setProfile: (profile: UserProfile | null) => void;
  setLoading: (loading: boolean) => void;
  fetchProfile: (userId: string) => Promise<void>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  profile: null,
  loading: true,
  setSession: (session) => set({ session }),
  setProfile: (profile) => set({ profile }),
  setLoading: (loading) => set({ loading }),
  fetchProfile: async (userId: string) => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    if (!error && data) {
      set({ profile: data });
    }
  },
  signOut: async () => {
    await supabase
      .from('users')
      .update({ is_online: false, last_seen_at: new Date().toISOString() })
      .eq('id', (await supabase.auth.getUser()).data.user?.id ?? '');
    await supabase.auth.signOut();
    set({ session: null, profile: null });
  },
}));
