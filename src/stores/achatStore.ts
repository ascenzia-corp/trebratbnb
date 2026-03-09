import { create } from 'zustand';
import type { Achat, CreateAchatInput, AchatFilters } from '../types';
import * as service from '../services/achatService';
import { compressImage } from '../utils/imageCompression';
import { supabase } from '../services/supabase';

interface AchatStore {
  achats: Achat[];
  loading: boolean;
  fetchAchats: (filters?: AchatFilters) => Promise<void>;
  createAchat: (data: CreateAchatInput) => Promise<void>;
  updateAchat: (id: string, data: Partial<Achat>) => Promise<void>;
  uploadJustificatif: (achatId: string, file: File) => Promise<void>;
  subscribeToChanges: () => () => void;
}

export const useAchatStore = create<AchatStore>((set, get) => ({
  achats: [],
  loading: false,

  fetchAchats: async (filters) => {
    set({ loading: true });
    try {
      const achats = await service.fetchAchats(filters);
      set({ achats, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  createAchat: async (data) => {
    await service.createAchat(data);
    await get().fetchAchats();
  },

  updateAchat: async (id, data) => {
    await service.updateAchat(id, data);
    await get().fetchAchats();
  },

  uploadJustificatif: async (achatId, file) => {
    const compressed = await compressImage(file);
    await service.uploadJustificatif(achatId, compressed);
  },

  subscribeToChanges: () => {
    const channel = supabase
      .channel('achats-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'achats' }, () => {
        get().fetchAchats();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  },
}));
