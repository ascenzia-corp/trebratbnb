import { supabase } from './supabase';
import type { EtatDesLieux } from '../types';

export async function fetchEdls(reservationId?: string): Promise<EtatDesLieux[]> {
  let query = supabase
    .from('etats_des_lieux')
    .select('*, reservation:reservations(*), photos:etats_des_lieux_photos(*)')
    .order('created_at', { ascending: true });

  if (reservationId) {
    query = query.eq('reservation_id', reservationId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}
