import { create } from 'zustand';
import { supabase } from '../services/supabase';
import type { UserProfile, Assignee, Demandeur } from '../types';
import type { User, Session } from '@supabase/supabase-js';

interface AuthStore {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  loading: boolean;
  initialize: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  getAgentKey: () => Assignee | Demandeur | null;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  session: null,
  profile: null,
  loading: true,

  initialize: async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      const profile = await fetchProfile(session.user);
      set({ user: session.user, session, profile, loading: false });
    } else {
      set({ loading: false });
    }

    supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const profile = await fetchProfile(session.user);
        set({ user: session.user, session, profile });
      } else {
        set({ user: null, session: null, profile: null });
      }
    });
  },

  signIn: async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null, session: null, profile: null });
  },

  getAgentKey: () => {
    const profile = get().profile;
    return profile?.agent_key ?? null;
  },
}));

async function fetchProfile(user: User): Promise<UserProfile> {
  // Try to get profile from profiles table
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (data) {
    return {
      id: data.id,
      email: user.email ?? '',
      display_name: data.display_name ?? user.email ?? '',
      role: data.role ?? 'agent_terrain',
      agent_key: data.agent_key ?? null,
    };
  }

  // Fallback: derive from email
  return {
    id: user.id,
    email: user.email ?? '',
    display_name: user.email?.split('@')[0] ?? 'Utilisateur',
    role: 'agent_terrain',
  };
}
