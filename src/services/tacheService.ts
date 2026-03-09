import { supabase } from './supabase';
import type { Tache, TacheFilters } from '../types';

export async function fetchTaches(filters?: TacheFilters): Promise<Tache[]> {
  let query = supabase
    .from('taches')
    .select('*, reservation:reservations(*)')
    .order('date_echeance', { ascending: true });

  if (filters?.assignee_a && filters.assignee_a !== 'toutes') {
    query = query.eq('assignee_a', filters.assignee_a);
  }
  if (filters?.moment && filters.moment !== 'tous') {
    query = query.eq('moment', filters.moment);
  }
  if (filters?.a_faire !== undefined) {
    query = query.eq('a_faire', filters.a_faire);
  }
  if (filters?.statut) {
    query = query.eq('statut', filters.statut);
  }
  if (filters?.reservation_id) {
    query = query.eq('reservation_id', filters.reservation_id);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function updateTache(id: string, data: Partial<Tache>): Promise<Tache> {
  const updateData: Record<string, unknown> = { ...data };
  if (data.statut === 'fait') {
    updateData.date_realisation = new Date().toISOString();
  }
  delete updateData.reservation;

  const { data: updated, error } = await supabase
    .from('taches')
    .update(updateData)
    .eq('id', id)
    .select('*, reservation:reservations(*)')
    .single();

  if (error) throw error;
  return updated;
}

export async function getCountMenages(): Promise<{ manu: number; alienor: number }> {
  const { data, error } = await supabase
    .from('taches')
    .select('assignee_a')
    .eq('type_tache', 'menage')
    .eq('statut', 'fait');

  if (error) throw error;

  const counts = { manu: 0, alienor: 0 };
  (data ?? []).forEach((t) => {
    if (t.assignee_a === 'manu') counts.manu++;
    if (t.assignee_a === 'alienor') counts.alienor++;
  });
  return counts;
}
