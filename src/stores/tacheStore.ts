import { create } from 'zustand';
import type { Tache, TacheFilters } from '../types';
import * as service from '../services/tacheService';
import { supabase } from '../services/supabase';

interface TacheStore {
  taches: Tache[];
  loading: boolean;
  lastFilters: TacheFilters | undefined;
  fetchTaches: (filters?: TacheFilters) => Promise<void>;
  updateTache: (id: string, data: Partial<Tache>) => Promise<void>;
  getCountMenages: () => Promise<{ manu: number; alienor: number }>;
  subscribeToChanges: () => () => void;
}

export const useTacheStore = create<TacheStore>((set, get) => ({
  taches: [],
  loading: false,
  lastFilters: undefined,

  fetchTaches: async (filters) => {
    set({ loading: true, lastFilters: filters });
    try {
      const taches = await service.fetchTaches(filters);
      set({ taches, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  updateTache: async (id, data) => {
    const updated = await service.updateTache(id, data);
    // Update the local array without refetching (avoids overwriting filtered views)
    set((state) => ({
      taches: state.taches.map((t) => (t.id === id ? updated : t)),
    }));
  },

  getCountMenages: () => service.getCountMenages(),

  subscribeToChanges: () => {
    const channel = supabase
      .channel('taches-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'taches' }, () => {
        // Re-fetch with the same filters that were last used
        get().fetchTaches(get().lastFilters);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  },
}));
