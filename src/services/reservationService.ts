import { supabase } from './supabase';
import type { Reservation, CreateReservationInput } from '../types';
import { PIECES_ORDERED } from '../utils/labels';
import { createCalendarEvent } from './googleCalendarService';
import { withTimeout } from '../utils/withTimeout';

// No Supabase call should be able to hang the UI indefinitely.
const STEP_TIMEOUT_MS = 15_000;
// The calendar service already bounds each of its own fetches at 8s.
const CALENDAR_TIMEOUT_MS = 20_000;

export async function fetchReservations(): Promise<Reservation[]> {
  const { data, error } = await supabase
    .from('reservations')
    .select('*')
    .order('date_checkin', { ascending: true });

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
  // Creating the reservation row is the only step that must succeed. Each step
  // is time-bounded and named, so a stalled call surfaces as a readable error
  // instead of an endlessly spinning button.
  const { data: reservation, error } = await withTimeout(
    supabase
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
      .single(),
    STEP_TIMEOUT_MS,
    'enregistrement de la réservation'
  );

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

  // Tasks, EDLs and the calendar event are secondary: if one of them fails or
  // stalls, the reservation still exists and the user still gets through.
  try {
    const { error: tacheError } = await withTimeout(
      supabase.from('taches').insert(taches),
      STEP_TIMEOUT_MS,
      'création des tâches'
    );
    if (tacheError) console.error('Error creating taches:', tacheError);
  } catch (e) {
    console.error('Taches step skipped:', e);
  }

  // Create the 18 rooms for both the entrée and the sortie état des lieux
  const edls = (['entree', 'sortie'] as const).flatMap((moment) =>
    PIECES_ORDERED.map((piece) => ({
      reservation_id: reservation.id,
      piece,
      moment,
      etat: 'ras',
      probleme_signale: false,
    }))
  );

  try {
    const { error: edlError } = await withTimeout(
      supabase.from('etats_des_lieux').insert(edls),
      STEP_TIMEOUT_MS,
      'création des états des lieux'
    );
    if (edlError) console.error('Error creating EDLs:', edlError);
  } catch (e) {
    console.error('EDL step skipped:', e);
  }

  // Create Google Calendar event
  try {
    const calResult = await withTimeout(
      createCalendarEvent({
        voyageur: input.voyageur,
        date_checkin: input.date_checkin,
        date_checkout: input.date_checkout,
        nb_personnes: input.nb_personnes ?? 1,
        telephone: input.telephone,
        commentaires: input.commentaires,
      }),
      CALENDAR_TIMEOUT_MS,
      'synchronisation Google Agenda'
    );

    if (calResult?.eventId) {
      await withTimeout(
        supabase
          .from('reservations')
          .update({ google_event_id: calResult.eventId })
          .eq('id', reservation.id),
        STEP_TIMEOUT_MS,
        'enregistrement du lien Google Agenda'
      );
      reservation.google_event_id = calResult.eventId;
    }
  } catch (e) {
    // The event can still be created later from the reservation detail page.
    console.error('Google Calendar step skipped:', e);
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

  // Sync task dates when reservation dates change
  if (data.date_checkin) {
    const newCheckinDate = data.date_checkin.split('T')[0];
    const { error: errCi } = await supabase
      .from('taches')
      .update({ date_echeance: newCheckinDate })
      .eq('reservation_id', id)
      .eq('moment', 'checkin');
    if (errCi) console.error('Error updating checkin task dates:', errCi);
  }
  if (data.date_checkout) {
    const newCheckoutDate = data.date_checkout.split('T')[0];
    const { error: errCo } = await supabase
      .from('taches')
      .update({ date_echeance: newCheckoutDate })
      .eq('reservation_id', id)
      .eq('moment', 'checkout');
    if (errCo) console.error('Error updating checkout task dates:', errCo);
  }

  return updated;
}

export async function deleteReservation(id: string): Promise<void> {
  const { error } = await supabase.from('reservations').delete().eq('id', id);
  if (error) throw error;
}
