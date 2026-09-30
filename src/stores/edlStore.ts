import { create } from 'zustand';
import type { EtatDesLieux } from '../types';
import * as service from '../services/edlService';
import { supabase } from '../services/supabase';

/**
 * Read-only EDL data for summaries (reservation detail, dashboard). Editing an
 * état des lieux goes through useEdlSheet, which works offline.
 */
interface EdlStore {
  edls: EtatDesLieux[];
  loading: boolean;
  lastReservationId?: string;
  fetchEdls: (reservationId?: string) => Promise<void>;
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
