/**
 * Offline-first changes for the état des lieux screen.
 *
 * Every edit is recorded as a SyncOp, stored on the phone, and sent to Supabase
 * when the network allows. The UI always shows `server data + pending ops`, so
 * an edit made without signal is visible immediately and survives a reload.
 *
 * `applyOp` is the single source of truth for what an op does to local data: it
 * is used both to overlay pending ops and to commit an op once the server
 * confirmed it (so the screen never flickers back to the old value).
 */
import { supabase } from '../supabase';
import { withTimeout, TimeoutError } from '../../utils/withTimeout';
import type { EdlNotes, EdlPhoto, EtatDesLieux, MomentEdl, Reservation, Tache } from '../../types';

export interface EdlSheetData {
  reservation: Reservation | null;
  edls: EtatDesLieux[];
  notes: EdlNotes[];
  taches: Tache[];
}

type NotesPatch = Partial<Pick<EdlNotes, 'retours_locataires' | 'remarques'>>;
type EdlPatch = Partial<Pick<EtatDesLieux, 'etat' | 'probleme_signale' | 'commentaire' | 'realise_par' | 'date_constat'>>;
type TachePatch = Partial<Pick<Tache, 'statut' | 'titre' | 'assignee_a'>>;

export type TacheInsertRow = Pick<
  Tache,
  'id' | 'reservation_id' | 'titre' | 'type_tache' | 'moment' | 'a_faire' | 'statut' | 'assignee_a' | 'date_echeance'
> & { commentaire: string | null };

export type SyncOp =
  | { kind: 'edl_update'; reservationId: string; id: string; patch: EdlPatch }
  | { kind: 'notes_upsert'; reservationId: string; moment: MomentEdl; patch: NotesPatch }
  | { kind: 'tache_insert'; reservationId: string; row: TacheInsertRow }
  | { kind: 'tache_update'; reservationId: string; id: string; patch: TachePatch }
  | { kind: 'tache_delete'; reservationId: string; id: string }
  | { kind: 'photo_upload'; reservationId: string; edlId: string; clientId: string; blob: Blob }
  | { kind: 'photo_delete'; reservationId: string; edlId: string; photoId: string; storagePath: string };

export type StoredOp = SyncOp & { seq: number; createdAt: number };

/** A photo shown on screen: either stored on the server or still on the phone. */
export type SheetPhoto = EdlPhoto & { pending?: boolean };

// ---------------------------------------------------------------------------
// Local previews for photos that are not uploaded yet
// ---------------------------------------------------------------------------

const previewUrls = new Map<string, string>();

export function previewUrlFor(clientId: string, blob: Blob): string {
  let url = previewUrls.get(clientId);
  if (!url) {
    url = URL.createObjectURL(blob);
    previewUrls.set(clientId, url);
  }
  return url;
}

export function releasePreview(clientId: string) {
  const url = previewUrls.get(clientId);
  if (url) {
    URL.revokeObjectURL(url);
    previewUrls.delete(clientId);
  }
}

// ---------------------------------------------------------------------------
// Applying an op to local data (pure)
// ---------------------------------------------------------------------------

function tacheFromRow(row: TacheInsertRow, now: string): Tache {
  return { ...row, date_realisation: null, created_at: now, updated_at: now };
}

/**
 * @param result for a committed photo_upload, the photo row saved on the server;
 *               absent while the op is still pending (a local preview is shown).
 */
export function applyOp(data: EdlSheetData, op: SyncOp, result?: unknown): EdlSheetData {
  switch (op.kind) {
    case 'edl_update':
      return { ...data, edls: data.edls.map((e) => (e.id === op.id ? { ...e, ...op.patch } : e)) };

    case 'notes_upsert': {
      const exists = data.notes.some((n) => n.moment === op.moment);
      const notes = exists
        ? data.notes.map((n) => (n.moment === op.moment ? { ...n, ...op.patch } : n))
        : [
            ...data.notes,
            {
              reservation_id: op.reservationId,
              moment: op.moment,
              retours_locataires: null,
              remarques: null,
              ...op.patch,
            },
          ];
      return { ...data, notes };
    }

    case 'tache_insert':
      if (data.taches.some((t) => t.id === op.row.id)) return data;
      return { ...data, taches: [...data.taches, tacheFromRow(op.row, new Date().toISOString())] };

    case 'tache_update':
      return { ...data, taches: data.taches.map((t) => (t.id === op.id ? { ...t, ...op.patch } : t)) };

    case 'tache_delete':
      return { ...data, taches: data.taches.filter((t) => t.id !== op.id) };

    case 'photo_upload': {
      const committed = result as EdlPhoto | undefined;
      const photo: SheetPhoto = committed ?? {
        id: op.clientId,
        edl_id: op.edlId,
        photo_url: previewUrlFor(op.clientId, op.blob),
        storage_path: '',
        created_at: new Date().toISOString(),
        pending: true,
      };
      return {
        ...data,
        edls: data.edls.map((e) =>
          e.id === op.edlId && !(e.photos ?? []).some((p) => p.id === photo.id)
            ? { ...e, photos: [...(e.photos ?? []), photo] }
            : e
        ),
      };
    }

    case 'photo_delete':
      return {
        ...data,
        edls: data.edls.map((e) =>
          e.id === op.edlId ? { ...e, photos: (e.photos ?? []).filter((p) => p.id !== op.photoId) } : e
        ),
      };
  }
}

// ---------------------------------------------------------------------------
// Sending an op to Supabase
// ---------------------------------------------------------------------------

const OP_TIMEOUT_MS = 20_000;
const PHOTO_TIMEOUT_MS = 60_000; // uploads are slow on a weak connection

/** Throws on failure; see `isRetryable` to decide whether to try again later. */
export async function executeOp(op: SyncOp): Promise<unknown> {
  switch (op.kind) {
    case 'edl_update': {
      const { error } = await withTimeout(
        supabase.from('etats_des_lieux').update(op.patch).eq('id', op.id),
        OP_TIMEOUT_MS,
        'état des lieux'
      );
      if (error) throw error;
      return null;
    }

    case 'notes_upsert': {
      const { error } = await withTimeout(
        supabase
          .from('edl_notes')
          .upsert({ reservation_id: op.reservationId, moment: op.moment, ...op.patch }, { onConflict: 'reservation_id,moment' }),
        OP_TIMEOUT_MS,
        'notes'
      );
      if (error) throw error;
      return null;
    }

    case 'tache_insert': {
      const { error } = await withTimeout(supabase.from('taches').insert(op.row), OP_TIMEOUT_MS, 'tâche');
      // 23505 = already inserted by a previous attempt whose response was lost.
      if (error && error.code !== '23505') throw error;
      return null;
    }

    case 'tache_update': {
      const patch: Record<string, unknown> = { ...op.patch };
      if (op.patch.statut === 'fait') patch.date_realisation = new Date().toISOString();
      if (op.patch.statut === 'a_faire') patch.date_realisation = null;
      const { error } = await withTimeout(
        supabase.from('taches').update(patch).eq('id', op.id),
        OP_TIMEOUT_MS,
        'tâche'
      );
      if (error) throw error;
      return null;
    }

    case 'tache_delete': {
      const { error } = await withTimeout(supabase.from('taches').delete().eq('id', op.id), OP_TIMEOUT_MS, 'tâche');
      if (error) throw error;
      return null;
    }

    case 'photo_upload': {
      // Path and row id derive from clientId, so a retry after a lost response
      // overwrites the same file and hits a duplicate key instead of doubling.
      const path = `${op.edlId}/${op.clientId}.jpg`;
      const { error: uploadError } = await withTimeout(
        supabase.storage.from('edl-photos').upload(path, op.blob, { contentType: 'image/jpeg', upsert: true }),
        PHOTO_TIMEOUT_MS,
        'photo'
      );
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('edl-photos').getPublicUrl(path);
      const row = { id: op.clientId, edl_id: op.edlId, photo_url: publicUrl, storage_path: path };
      const { error: insertError } = await withTimeout(
        supabase.from('etats_des_lieux_photos').insert(row),
        OP_TIMEOUT_MS,
        'photo'
      );
      if (insertError && insertError.code !== '23505') throw insertError;
      return { ...row, created_at: new Date().toISOString() } satisfies EdlPhoto;
    }

    case 'photo_delete': {
      if (op.storagePath) {
        await withTimeout(supabase.storage.from('edl-photos').remove([op.storagePath]), OP_TIMEOUT_MS, 'photo');
      }
      const { error } = await withTimeout(
        supabase.from('etats_des_lieux_photos').delete().eq('id', op.photoId),
        OP_TIMEOUT_MS,
        'photo'
      );
      if (error) throw error;
      return null;
    }
  }
}

// ---------------------------------------------------------------------------
// Error handling
// ---------------------------------------------------------------------------

interface ErrorLike {
  code?: unknown;
  message?: unknown;
  status?: unknown;
  statusCode?: unknown;
  name?: unknown;
}

/** Postgres error codes look like '23514' or '42P01'. */
function pgCode(err: ErrorLike): string | null {
  return typeof err.code === 'string' && /^[0-9A-Z]{5}$/.test(err.code) ? err.code : null;
}

/**
 * Network trouble (no signal, timeout, server briefly down) is retried later.
 * A real rejection by the database (invalid value, missing table…) is not:
 * retrying it forever would block every change queued behind it.
 */
export function isRetryable(error: unknown): boolean {
  if (error instanceof TimeoutError || error instanceof TypeError) return true;
  const err = (error ?? {}) as ErrorLike;
  if (err.name === 'AbortError') return true;
  const status = Number(err.status ?? err.statusCode);
  if (status >= 500 || status === 401 || status === 408 || status === 429) return true;
  const message = String(err.message ?? '');
  if (/fetch|load failed|network|abort|timeout|jwt/i.test(message)) return true;
  if (pgCode(err) || String(err.code ?? '').startsWith('PGRST')) return false;
  return status > 0 && status < 500 ? false : true;
}

const MIGRATION_CODES = new Set(['23514', '42P01', '42703', 'PGRST204', 'PGRST205']);

export function describeError(error: unknown): string {
  const err = (error ?? {}) as ErrorLike;
  if (MIGRATION_CODES.has(String(err.code ?? ''))) {
    return 'La base de données doit être mise à jour (migration 002) pour enregistrer cette modification.';
  }
  return String(err.message ?? error ?? 'Erreur inconnue');
}
