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
    .upload(fileName, blob, { contentType: 'image/jpeg', upsert: false });

  if (uploadError) {
    // Common issues: bucket doesn't exist, no RLS policy, or bucket is private
    if (uploadError.message?.includes('Bucket not found') || uploadError.message?.includes('not found')) {
      throw new Error('Le bucket "edl-photos" n\'existe pas dans Supabase Storage. Créez-le dans le dashboard Supabase → Storage.');
    }
    if (uploadError.message?.includes('security') || uploadError.message?.includes('policy') || uploadError.message?.includes('row-level')) {
      throw new Error('Pas de permission pour uploader. Vérifiez les RLS policies du bucket "edl-photos" dans Supabase.');
    }
    throw new Error(`Erreur upload : ${uploadError.message}`);
  }

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

  if (insertError) {
    // Cleanup the uploaded file if the DB insert fails
    await supabase.storage.from('edl-photos').remove([fileName]);
    throw new Error(`Erreur enregistrement photo : ${insertError.message}`);
  }
}

export async function deleteEdlPhoto(photoId: string, storagePath: string): Promise<void> {
  await supabase.storage.from('edl-photos').remove([storagePath]);
  await supabase.from('etats_des_lieux_photos').delete().eq('id', photoId);
}
