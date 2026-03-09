import { create } from 'zustand';
import type { Tache, TacheFilters } from '../types';
import * as service from '../services/tacheService';
import { supabase } from '../services/supabase';

interface TacheStore {
  taches: Tache[];
  loading: boolean;
  fetchTaches: (filters?: TacheFilters) => Promise<void>;
  updateTache: (id: string, data: Partial<Tache>) => Promise<void>;
  getCountMenages: () => Promise<{ manu: number; alienor: number }>;
  subscribeToChanges: () => () => void;
}

export const useTacheStore = create<TacheStore>((set, get) => ({
  taches: [],
  loading: false,

  fetchTaches: async (filters) => {
    set({ loading: true });
    try {
      const taches = await service.fetchTaches(filters);
      set({ taches, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  updateTache: async (id, data) => {
    await service.updateTache(id, data);
    await get().fetchTaches();
  },

  getCountMenages: () => service.getCountMenages(),

  subscribeToChanges: () => {
    const channel = supabase
      .channel('taches-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'taches' }, () => {
        get().fetchTaches();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  },
}));
