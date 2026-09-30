import { supabase } from './supabase';
import { PIECES_ORDERED } from '../utils/labels';
import type { EtatDesLieux, MomentEdl, Piece } from '../types';
import type { EdlSheetData } from './offline/syncOps';

export const MOMENTS: MomentEdl[] = ['entree', 'sortie'];

const MISSING_TABLE_CODES = new Set(['42P01', 'PGRST205']);

export interface EdlSheetLoad {
  data: EdlSheetData;
  /** false until migration 002 has been run (edl_notes table missing) */
  notesAvailable: boolean;
}

/**
 * Loads everything the état des lieux page needs for one reservation, and
 * creates any missing room rows (older reservations only had the entrée).
 */
export function fetchEdlSheet(reservationId: string): Promise<EdlSheetLoad> {
  // Overlapping loads (a refresh during the first load…) would each see the
  // same rooms missing and create them twice: share the one in progress.
  let pending = inFlight.get(reservationId);
  if (!pending) {
    pending = loadEdlSheet(reservationId).finally(() => inFlight.delete(reservationId));
    inFlight.set(reservationId, pending);
  }
  return pending;
}

const inFlight = new Map<string, Promise<EdlSheetLoad>>();

async function loadEdlSheet(reservationId: string): Promise<EdlSheetLoad> {
  const [resResult, edlResult, notesResult, tachesResult] = await Promise.all([
    supabase.from('reservations').select('*').eq('id', reservationId).single(),
    supabase
      .from('etats_des_lieux')
      .select('*, photos:etats_des_lieux_photos(*)')
      .eq('reservation_id', reservationId)
      .order('created_at', { ascending: true }),
    supabase.from('edl_notes').select('*').eq('reservation_id', reservationId),
    supabase
      .from('taches')
      .select('*')
      .eq('reservation_id', reservationId)
      .eq('type_tache', 'autre')
      .order('created_at', { ascending: true }),
  ]);

  if (resResult.error) throw resResult.error;
  if (edlResult.error) throw edlResult.error;
  if (tachesResult.error) throw tachesResult.error;

  let notesAvailable = true;
  if (notesResult.error) {
    if (MISSING_TABLE_CODES.has(notesResult.error.code)) notesAvailable = false;
    else throw notesResult.error;
  }

  let edls = (edlResult.data ?? []) as EtatDesLieux[];

  const missing: { reservation_id: string; piece: Piece; moment: MomentEdl; etat: 'ras'; probleme_signale: false }[] = [];
  for (const moment of MOMENTS) {
    for (const piece of PIECES_ORDERED) {
      if (!edls.some((e) => e.piece === piece && e.moment === moment)) {
        missing.push({ reservation_id: reservationId, piece, moment, etat: 'ras', probleme_signale: false });
      }
    }
  }
  if (missing.length) {
    const select = '*, photos:etats_des_lieux_photos(*)';
    // Another phone may create the same rooms at the same moment: the unique
    // index (migration 002) makes the second attempt a no-op.
    let { data: created, error } = await supabase
      .from('etats_des_lieux')
      .upsert(missing, { onConflict: 'reservation_id,piece,moment', ignoreDuplicates: true })
      .select(select);
    if (error?.code === '42P10') {
      // Unique index not there yet (migration 002 not run): plain insert.
      ({ data: created, error } = await supabase.from('etats_des_lieux').insert(missing).select(select));
    }
    if (error) console.error('Could not create missing EDL rooms:', error);
    else edls = [...edls, ...((created ?? []) as EtatDesLieux[])];
  }

  return {
    data: {
      reservation: resResult.data,
      edls,
      notes: notesResult.error ? [] : notesResult.data ?? [],
      taches: tachesResult.data ?? [],
    },
    notesAvailable,
  };
}

/**
 * The room row to show for a piece and moment. Duplicates can exist (two
 * people opening a brand new sheet at once): prefer the one already filled in.
 */
export function roomRow(edls: EtatDesLieux[], piece: Piece, moment: MomentEdl): EtatDesLieux | undefined {
  const rows = edls.filter((e) => e.piece === piece && e.moment === moment);
  if (rows.length <= 1) return rows[0];
  return [...rows].sort((a, b) => {
    if (!!a.realise_par !== !!b.realise_par) return a.realise_par ? -1 : 1;
    return (b.updated_at ?? '').localeCompare(a.updated_at ?? '');
  })[0];
}
