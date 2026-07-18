import { create } from 'zustand';
import type { EtatDesLieux } from '../types';
import * as service from '../services/edlService';
import { compressImage } from '../utils/imageCompression';
import { supabase } from '../services/supabase';

interface EdlStore {
  edls: EtatDesLieux[];
  loading: boolean;
  lastReservationId?: string;
  fetchEdls: (reservationId?: string) => Promise<void>;
  updateEdl: (id: string, data: Partial<EtatDesLieux>) => Promise<void>;
  uploadPhoto: (edlId: string, file: File) => Promise<void>;
  deletePhoto: (photoId: string, storagePath: string) => Promise<void>;
  subscribeToChanges: () => () => void;
}

export const useEdlStore = create<EdlStore>((set, get) => ({
  edls: [],
  loading: false,

  fetchEdls: async (reservationId) => {
    set({ loading: true, lastReservationId: reservationId });
    try {
      const edls = await service.fetchEdls(reservationId);
      set({ edls, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  updateEdl: async (id, data) => {
    await service.updateEdl(id, data);
    // Refresh the single EDL in the list
    const edls = get().edls.map((e) => (e.id === id ? { ...e, ...data } : e));
    set({ edls });
  },

  uploadPhoto: async (edlId, file) => {
    const compressed = await compressImage(file);
    await service.uploadEdlPhoto(edlId, compressed);
  },

  deletePhoto: async (photoId, storagePath) => {
    await service.deleteEdlPhoto(photoId, storagePath);
  },

  subscribeToChanges: () => {
    const channel = supabase
      .channel('edl-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'etats_des_lieux' }, () => {
        // Refetch keeping the current reservation filter, otherwise the list
        // would reload EDLs from every reservation at once.
        get().fetchEdls(get().lastReservationId);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  },
}));
