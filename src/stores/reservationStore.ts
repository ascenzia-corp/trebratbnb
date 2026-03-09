import { create } from 'zustand';
import type { Reservation, CreateReservationInput } from '../types';
import * as service from '../services/reservationService';
import { supabase } from '../services/supabase';

interface ReservationStore {
  reservations: Reservation[];
  loading: boolean;
  error: string | null;
  fetchReservations: () => Promise<void>;
  createReservation: (data: CreateReservationInput) => Promise<void>;
  updateReservation: (id: string, data: Partial<Reservation>) => Promise<void>;
  deleteReservation: (id: string) => Promise<void>;
  subscribeToChanges: () => () => void;
}

export const useReservationStore = create<ReservationStore>((set, get) => ({
  reservations: [],
  loading: false,
  error: null,

  fetchReservations: async () => {
    set({ loading: true, error: null });
    try {
      const reservations = await service.fetchReservations();
      set({ reservations, loading: false });
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
    }
  },

  createReservation: async (data) => {
    await service.createReservation(data);
    await get().fetchReservations();
  },

  updateReservation: async (id, data) => {
    await service.updateReservation(id, data);
    await get().fetchReservations();
  },

  deleteReservation: async (id) => {
    await service.deleteReservation(id);
    await get().fetchReservations();
  },

  subscribeToChanges: () => {
    const channel = supabase
      .channel('reservations-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reservations' }, () => {
        get().fetchReservations();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  },
}));
