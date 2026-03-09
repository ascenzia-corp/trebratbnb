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

export async function fetchEdl(id: string): Promise<EtatDesLieux> {
  const { data, error } = await supabase
    .from('etats_des_lieux')
    .select('*, reservation:reservations(*), photos:etats_des_lieux_photos(*)')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

export async function updateEdl(id: string, data: Partial<EtatDesLieux>): Promise<EtatDesLieux> {
  const updateData: Record<string, unknown> = { ...data };
  delete updateData.reservation;
  delete updateData.photos;

  const { data: updated, error } = await supabase
    .from('etats_des_lieux')
    .update(updateData)
    .eq('id', id)
    .select('*, reservation:reservations(*), photos:etats_des_lieux_photos(*)')
    .single();

  if (error) throw error;
  return updated;
}

export async function uploadEdlPhoto(edlId: string, blob: Blob): Promise<void> {
  const fileName = `${edlId}/${Date.now()}.jpg`;

  const { error: uploadError } = await supabase.storage
    .from('edl-photos')
    .upload(fileName, blob, { contentType: 'image/jpeg' });

  if (uploadError) throw uploadError;

  const { data: { publicUrl } } = supabase.storage
    .from('edl-photos')
    .getPublicUrl(fileName);

  const { error: insertError } = await supabase
    .from('etats_des_lieux_photos')
    .insert({
      edl_id: edlId,
      photo_url: publicUrl,
      storage_path: fileName,
    });

  if (insertError) throw insertError;
}

export async function deleteEdlPhoto(photoId: string, storagePath: string): Promise<void> {
  await supabase.storage.from('edl-photos').remove([storagePath]);
  await supabase.from('etats_des_lieux_photos').delete().eq('id', photoId);
}
