import { supabase } from './supabase';
import type { Achat, CreateAchatInput, AchatFilters } from '../types';

export async function fetchAchats(filters?: AchatFilters): Promise<Achat[]> {
  let query = supabase
    .from('achats')
    .select('*, reservation:reservations(*), justificatifs:achats_justificatifs(*)')
    .order('created_at', { ascending: false });

  if (filters?.statut && filters.statut !== 'tous') {
    query = query.eq('statut', filters.statut);
  }
  if (filters?.reservation_id) {
    query = query.eq('reservation_id', filters.reservation_id);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function fetchAchat(id: string): Promise<Achat> {
  const { data, error } = await supabase
    .from('achats')
    .select('*, reservation:reservations(*), justificatifs:achats_justificatifs(*)')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

export async function createAchat(input: CreateAchatInput): Promise<Achat> {
  const { data, error } = await supabase
    .from('achats')
    .insert({
      article: input.article,
      reservation_id: input.reservation_id ?? null,
      prix: input.prix ?? null,
      demande_par: input.demande_par ?? null,
      commentaire: input.commentaire ?? null,
    })
    .select('*, reservation:reservations(*), justificatifs:achats_justificatifs(*)')
    .single();

  if (error) throw error;
  return data;
}

export async function updateAchat(id: string, data: Partial<Achat>): Promise<Achat> {
  const updateData: Record<string, unknown> = { ...data };
  delete updateData.reservation;
  delete updateData.justificatifs;

  const { data: updated, error } = await supabase
    .from('achats')
    .update(updateData)
    .eq('id', id)
    .select('*, reservation:reservations(*), justificatifs:achats_justificatifs(*)')
    .single();

  if (error) throw error;
  return updated;
}

export async function uploadJustificatif(achatId: string, blob: Blob): Promise<void> {
  const fileName = `${achatId}/${Date.now()}.jpg`;

  const { error: uploadError } = await supabase.storage
    .from('achats-justificatifs')
    .upload(fileName, blob, { contentType: 'image/jpeg' });

  if (uploadError) throw uploadError;

  const { data: { publicUrl } } = supabase.storage
    .from('achats-justificatifs')
    .getPublicUrl(fileName);

  const { error: insertError } = await supabase
    .from('achats_justificatifs')
    .insert({
      achat_id: achatId,
      photo_url: publicUrl,
      storage_path: fileName,
    });

  if (insertError) throw insertError;
}
