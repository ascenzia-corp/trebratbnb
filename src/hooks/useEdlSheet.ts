import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../services/supabase';
import { cacheGet, cacheSet } from '../services/offline/idb';
import { applyOp, type EdlSheetData, type SheetPhoto } from '../services/offline/syncOps';
import { fetchEdlSheet, type EdlSheetLoad } from '../services/edlSheetService';
import { onOpApplied, useSyncStore } from '../stores/syncStore';
import { compressImage } from '../utils/imageCompression';
import type { EdlAgent, EtatDesLieux, EtatEdl, MomentEdl, Tache } from '../types';

const REALTIME_DEBOUNCE_MS = 2_000;

const cacheKey = (reservationId: string) => `edl-sheet:${reservationId}`;

function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * State and actions of the état des lieux page for one reservation.
 *
 * What is displayed is always `last server data + changes still waiting to be
 * sent`, so every action shows up instantly, with or without network.
 */
export function useEdlSheet(reservationId: string | null) {
  const [snapshot, setSnapshot] = useState<EdlSheetData | null>(null);
  const [notesAvailable, setNotesAvailable] = useState(true);
  const [loading, setLoading] = useState(false);
  const [fromCache, setFromCache] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const enqueue = useSyncStore((s) => s.enqueue);
  const allOps = useSyncStore((s) => s.ops);
  const currentId = useRef(reservationId);
  currentId.current = reservationId;

  const persist = useCallback((id: string, load: EdlSheetLoad) => {
    cacheSet(cacheKey(id), load);
  }, []);

  const load = useCallback(
    async (silent = false) => {
      const id = reservationId;
      if (!id) return;
      if (!silent) setLoading(true);
      try {
        const result = await fetchEdlSheet(id);
        if (currentId.current !== id) return;
        setSnapshot(result.data);
        setNotesAvailable(result.notesAvailable);
        setFromCache(false);
        setLoadError(null);
        persist(id, result);
      } catch (e) {
        if (currentId.current !== id) return;
        if (silent) return; // keep what is on screen
        const cached = await cacheGet<EdlSheetLoad>(cacheKey(id));
        if (cached) {
          setSnapshot(cached.data);
          setNotesAvailable(cached.notesAvailable);
          setFromCache(true);
          setLoadError(null);
        } else {
          setLoadError((e as Error)?.message ?? 'Chargement impossible');
        }
      } finally {
        if (currentId.current === id && !silent) setLoading(false);
      }
    },
    [reservationId, persist]
  );

  // Initial load: show the phone's copy at once, then refresh from the server.
  useEffect(() => {
    setSnapshot(null);
    setFromCache(false);
    setLoadError(null);
    if (!reservationId) return;
    let cancelled = false;
    cacheGet<EdlSheetLoad>(cacheKey(reservationId)).then((cached) => {
      if (!cancelled && cached) {
        setSnapshot((s) => s ?? cached.data);
        setNotesAvailable(cached.notesAvailable);
      }
    });
    load();
    return () => {
      cancelled = true;
    };
  }, [reservationId, load]);

  // Once the server confirmed a change, bake it into the snapshot.
  useEffect(
    () =>
      onOpApplied((op, result) => {
        if (op.reservationId !== currentId.current) return;
        setSnapshot((s) => {
          if (!s) return s;
          const next = applyOp(s, op, result);
          persist(op.reservationId, { data: next, notesAvailable });
          return next;
        });
      }),
    [persist, notesAvailable]
  );

  // Changes made by someone else (another phone) refresh the page.
  useEffect(() => {
    if (!reservationId) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const refresh = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => load(true), REALTIME_DEBOUNCE_MS);
    };
    const filter = `reservation_id=eq.${reservationId}`;
    const channel = supabase
      .channel(`edl-sheet-${reservationId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'etats_des_lieux', filter }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'edl_notes', filter }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'taches', filter }, refresh)
      .subscribe();
    return () => {
      if (timer) clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, [reservationId, load]);

  // Showing the phone's copy because the network was down: as soon as it is
  // back, fetch fresh data (and keep retrying quietly until it works).
  const networkIssue = useSyncStore((s) => s.networkIssue);
  useEffect(() => {
    if (!fromCache || !reservationId) return;
    const retry = () => load(true);
    window.addEventListener('online', retry);
    const timer = setInterval(retry, 15_000);
    if (!networkIssue) retry();
    return () => {
      window.removeEventListener('online', retry);
      clearInterval(timer);
    };
  }, [fromCache, networkIssue, reservationId, load]);

  const pendingOps = useMemo(
    () => allOps.filter((o) => o.reservationId === reservationId),
    [allOps, reservationId]
  );

  const view = useMemo(
    () => (snapshot ? pendingOps.reduce((data, op) => applyOp(data, op), snapshot) : null),
    [snapshot, pendingOps]
  );

  // ------------------------------------------------------------------ actions

  const setEtat = useCallback(
    (edl: EtatDesLieux, etat: EtatEdl | null, agent: EdlAgent) => {
      if (!reservationId) return;
      enqueue({
        kind: 'edl_update',
        reservationId,
        id: edl.id,
        patch: etat
          ? { etat, probleme_signale: etat !== 'ras', realise_par: agent, date_constat: new Date().toISOString() }
          : { etat: 'ras', probleme_signale: false, realise_par: null, date_constat: null },
      });
    },
    [enqueue, reservationId]
  );

  const setComment = useCallback(
    (edl: EtatDesLieux, commentaire: string) => {
      if (!reservationId) return;
      enqueue({ kind: 'edl_update', reservationId, id: edl.id, patch: { commentaire: commentaire || null } });
    },
    [enqueue, reservationId]
  );

  const markRemainingRas = useCallback(
    (rows: EtatDesLieux[], agent: EdlAgent) => {
      rows.filter((r) => !r.realise_par).forEach((r) => setEtat(r, 'ras', agent));
    },
    [setEtat]
  );

  const setNotes = useCallback(
    (moment: MomentEdl, field: 'retours_locataires' | 'remarques', value: string) => {
      if (!reservationId) return;
      enqueue({ kind: 'notes_upsert', reservationId, moment, patch: { [field]: value || null } });
    },
    [enqueue, reservationId]
  );

  const addTask = useCallback(
    (titre: string, moment: MomentEdl) => {
      if (!reservationId || !titre.trim()) return;
      enqueue({
        kind: 'tache_insert',
        reservationId,
        row: {
          id: crypto.randomUUID(),
          reservation_id: reservationId,
          titre: titre.trim(),
          type_tache: 'autre',
          moment: moment === 'entree' ? 'checkin' : 'checkout',
          a_faire: true,
          statut: 'a_faire',
          assignee_a: 'non_assignee',
          date_echeance: today(),
          commentaire: null,
        },
      });
    },
    [enqueue, reservationId]
  );

  const toggleTask = useCallback(
    (tache: Tache) => {
      if (!reservationId) return;
      enqueue({
        kind: 'tache_update',
        reservationId,
        id: tache.id,
        patch: { statut: tache.statut === 'fait' ? 'a_faire' : 'fait' },
      });
    },
    [enqueue, reservationId]
  );

  const deleteTask = useCallback(
    (tache: Tache) => {
      if (!reservationId) return;
      enqueue({ kind: 'tache_delete', reservationId, id: tache.id });
    },
    [enqueue, reservationId]
  );

  const addPhoto = useCallback(
    async (edl: EtatDesLieux, file: File) => {
      if (!reservationId) return;
      const blob = await compressImage(file);
      await enqueue({ kind: 'photo_upload', reservationId, edlId: edl.id, clientId: crypto.randomUUID(), blob });
    },
    [enqueue, reservationId]
  );

  const deletePhoto = useCallback(
    (edl: EtatDesLieux, photo: SheetPhoto) => {
      if (!reservationId) return;
      enqueue({
        kind: 'photo_delete',
        reservationId,
        edlId: edl.id,
        photoId: photo.id,
        storagePath: photo.storage_path || `${edl.id}/${photo.id}.jpg`,
      });
    },
    [enqueue, reservationId]
  );

  return {
    data: view,
    loading,
    fromCache,
    loadError,
    notesAvailable,
    pendingCount: pendingOps.length,
    reload: () => load(),
    setEtat,
    setComment,
    markRemainingRas,
    setNotes,
    addTask,
    toggleTask,
    deleteTask,
    addPhoto,
    deletePhoto,
  };
}
