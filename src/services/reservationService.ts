import { supabase } from './supabase';
import type { Reservation, CreateReservationInput } from '../types';
import { PIECES_ORDERED } from '../utils/labels';
import { createCalendarEvent } from './googleCalendarService';

export async function fetchReservations(): Promise<Reservation[]> {
  const { data, error } = await supabase
    .from('reservations')
    .select('*')
    .order('date_checkin', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function fetchReservation(id: string): Promise<Reservation> {
  const { data, error } = await supabase
    .from('reservations')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

export async function createReservation(input: CreateReservationInput): Promise<Reservation> {
  const { data: reservation, error } = await supabase
    .from('reservations')
    .insert({
      voyageur: input.voyageur,
      telephone: input.telephone ?? null,
      nb_personnes: input.nb_personnes ?? 1,
      date_checkin: input.date_checkin,
      date_checkout: input.date_checkout,
      commentaires: input.commentaires ?? null,
    })
    .select()
    .single();

  if (error) throw error;

  // Create 6 tasks automatically
  const taches = [
    { titre: `Lits à faire — ${input.voyageur}`, type_tache: 'lits_a_faire', moment: 'checkin', date_echeance: input.date_checkin.split('T')[0] },
    { titre: `Ménage check-in — ${input.voyageur}`, type_tache: 'menage', moment: 'checkin', date_echeance: input.date_checkin.split('T')[0] },
    { titre: `État des lieux entrée — ${input.voyageur}`, type_tache: 'edl_entree', moment: 'checkin', date_echeance: input.date_checkin.split('T')[0] },
    { titre: `Lits à défaire — ${input.voyageur}`, type_tache: 'lits_a_defaire', moment: 'checkout', date_echeance: input.date_checkout.split('T')[0] },
    { titre: `Ménage check-out — ${input.voyageur}`, type_tache: 'menage', moment: 'checkout', date_echeance: input.date_checkout.split('T')[0] },
    { titre: `État des lieux sortie — ${input.voyageur}`, type_tache: 'edl_sortie', moment: 'checkout', date_echeance: input.date_checkout.split('T')[0] },
  ].map((t) => ({
    ...t,
    reservation_id: reservation.id,
    a_faire: true,
    statut: 'a_faire',
    assignee_a: 'non_assignee',
  }));

  const { error: tacheError } = await supabase.from('taches').insert(taches);
  if (tacheError) console.error('Error creating taches:', tacheError);

  // Create 18 EDL entries automatically
  const edls = PIECES_ORDERED.map((piece) => ({
    reservation_id: reservation.id,
    piece,
    moment: 'entree',
    etat: 'ras',
    probleme_signale: false,
  }));

  const { error: edlError } = await supabase.from('etats_des_lieux').insert(edls);
  if (edlError) console.error('Error creating EDLs:', edlError);

  // Create Google Calendar event
  const calResult = await createCalendarEvent({
    voyageur: input.voyageur,
    date_checkin: input.date_checkin,
    date_checkout: input.date_checkout,
    nb_personnes: input.nb_personnes ?? 1,
    telephone: input.telephone,
    commentaires: input.commentaires,
  });

  if (calResult?.eventId) {
    await supabase
      .from('reservations')
      .update({ google_event_id: calResult.eventId })
      .eq('id', reservation.id);
    reservation.google_event_id = calResult.eventId;
  }

  return reservation;
}

export async function updateReservation(id: string, data: Partial<Reservation>): Promise<Reservation> {
  const { data: updated, error } = await supabase
    .from('reservations')
    .update(data)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return updated;
}

export async function deleteReservation(id: string): Promise<void> {
  const { error } = await supabase.from('reservations').delete().eq('id', id);
  if (error) throw error;
}
