/**
 * Sync engine: keeps the queue of pending changes and sends them to Supabase
 * whenever the network allows (on reconnection, when the app comes back to the
 * foreground, and periodically while something is pending).
 *
 * Changes are sent one at a time, in order. Consecutive edits of the same item
 * are merged while waiting (typing a comment, toggling a status twice…) so the
 * queue stays short and the last value wins.
 */
import { create } from 'zustand';
import { supabase } from '../services/supabase';
import { OPS_STORE, idbAdd, idbDelete, idbGetAll, idbPut } from '../services/offline/idb';
import {
  describeError,
  executeOp,
  isRetryable,
  releasePreview,
  type StoredOp,
  type SyncOp,
} from '../services/offline/syncOps';

const RETRY_DELAY_MS = 10_000;
const POLL_INTERVAL_MS = 20_000;

export interface FailedOp {
  op: StoredOp;
  message: string;
}

type AppliedListener = (op: StoredOp, result: unknown) => void;

interface SyncState {
  ready: boolean;
  ops: StoredOp[];
  failed: FailedOp[];
  syncing: boolean;
  /** true when the last attempt failed for network reasons */
  networkIssue: boolean;
  online: boolean;
  init: () => void;
  enqueue: (op: SyncOp) => Promise<void>;
  flush: () => Promise<void>;
  dismissFailed: (seq: number) => void;
}

const appliedListeners = new Set<AppliedListener>();

/** Be told when a queued change has been saved on the server. */
export function onOpApplied(listener: AppliedListener): () => void {
  appliedListeners.add(listener);
  return () => appliedListeners.delete(listener);
}

let inFlightSeq: number | null = null;
let flushAgain = false;
let retryTimer: ReturnType<typeof setTimeout> | null = null;
let initialized = false;
// Serialises queue mutations so coalescing never races with itself.
let queueLock: Promise<unknown> = Promise.resolve();

function withQueueLock<T>(fn: () => Promise<T>): Promise<T> {
  const next = queueLock.then(fn, fn);
  queueLock = next.catch(() => undefined);
  return next;
}

export const useSyncStore = create<SyncState>((set, get) => {
  const replaceOps = (ops: StoredOp[]) => set({ ops: [...ops].sort((a, b) => a.seq - b.seq) });

  const scheduleRetry = () => {
    if (retryTimer) return;
    retryTimer = setTimeout(() => {
      retryTimer = null;
      get().flush();
    }, RETRY_DELAY_MS);
  };

  /** Merge `op` into a still-waiting op when possible. Returns true if merged. */
  const coalesce = async (op: SyncOp): Promise<boolean> => {
    const waiting = get().ops.filter((o) => o.seq !== inFlightSeq);

    const mergeInto = async (target: StoredOp, merged: StoredOp) => {
      await idbPut(OPS_STORE, merged);
      replaceOps(get().ops.map((o) => (o.seq === target.seq ? merged : o)));
    };
    const drop = async (targets: StoredOp[]) => {
      for (const t of targets) await idbDelete(OPS_STORE, t.seq);
      const seqs = new Set(targets.map((t) => t.seq));
      replaceOps(get().ops.filter((o) => !seqs.has(o.seq)));
    };

    switch (op.kind) {
      case 'edl_update': {
        const t = waiting.find((o) => o.kind === 'edl_update' && o.id === op.id);
        if (t && t.kind === 'edl_update') {
          await mergeInto(t, { ...t, patch: { ...t.patch, ...op.patch } });
          return true;
        }
        return false;
      }
      case 'notes_upsert': {
        const t = waiting.find(
          (o) => o.kind === 'notes_upsert' && o.reservationId === op.reservationId && o.moment === op.moment
        );
        if (t && t.kind === 'notes_upsert') {
          await mergeInto(t, { ...t, patch: { ...t.patch, ...op.patch } });
          return true;
        }
        return false;
      }
      case 'tache_update': {
        const ins = waiting.find((o) => o.kind === 'tache_insert' && o.row.id === op.id);
        if (ins && ins.kind === 'tache_insert') {
          await mergeInto(ins, { ...ins, row: { ...ins.row, ...op.patch } });
          return true;
        }
        const t = waiting.find((o) => o.kind === 'tache_update' && o.id === op.id);
        if (t && t.kind === 'tache_update') {
          await mergeInto(t, { ...t, patch: { ...t.patch, ...op.patch } });
          return true;
        }
        return false;
      }
      case 'tache_delete': {
        const related = waiting.filter(
          (o) => (o.kind === 'tache_insert' && o.row.id === op.id) || (o.kind === 'tache_update' && o.id === op.id)
        );
        const neverSent = related.some((o) => o.kind === 'tache_insert');
        await drop(related);
        // The task never reached the server: deleting it locally is enough.
        return neverSent;
      }
      case 'photo_delete': {
        const upload = waiting.find((o) => o.kind === 'photo_upload' && o.clientId === op.photoId);
        if (upload) {
          await drop([upload]);
          releasePreview(op.photoId);
          return true;
        }
        return false;
      }
      default:
        return false;
    }
  };

  return {
    ready: false,
    ops: [],
    failed: [],
    syncing: false,
    networkIssue: false,
    online: typeof navigator === 'undefined' ? true : navigator.onLine,

    init: () => {
      if (initialized) return;
      initialized = true;

      idbGetAll<StoredOp>(OPS_STORE)
        .then((ops) => {
          replaceOps(ops);
          set({ ready: true });
          get().flush();
        })
        .catch((e) => {
          console.error('Offline queue unavailable:', e);
          set({ ready: true });
        });

      window.addEventListener('online', () => {
        set({ online: true });
        get().flush();
      });
      window.addEventListener('offline', () => set({ online: false }));
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') get().flush();
      });
      setInterval(() => {
        if (get().ops.length) get().flush();
      }, POLL_INTERVAL_MS);
      // Pending changes wait for the user to be logged in, then go out.
      supabase.auth.onAuthStateChange((_event, session) => {
        if (session) get().flush();
      });
    },

    enqueue: (op) =>
      withQueueLock(async () => {
        if (!(await coalesce(op))) {
          const stored = { ...op, createdAt: Date.now() } as Omit<StoredOp, 'seq'>;
          const seq = await idbAdd(OPS_STORE, stored);
          replaceOps([...get().ops, { ...stored, seq } as StoredOp]);
        }
      }).then(() => {
        get().flush();
      }),

    flush: async () => {
      if (get().syncing) {
        flushAgain = true;
        return;
      }
      if (!get().ops.length) return;

      // Without a session every write would be rejected and wrongly discarded.
      const { data } = await supabase.auth.getSession().catch(() => ({ data: { session: null } }));
      if (!data.session) return;

      set({ syncing: true });
      try {
        for (;;) {
          const op = get().ops[0];
          if (!op) break;
          inFlightSeq = op.seq;
          try {
            const result = await executeOp(op);
            await withQueueLock(async () => {
              await idbDelete(OPS_STORE, op.seq);
              replaceOps(get().ops.filter((o) => o.seq !== op.seq));
            });
            if (op.kind === 'photo_upload') releasePreview(op.clientId);
            set({ networkIssue: false });
            appliedListeners.forEach((l) => l(op, result));
          } catch (error) {
            if (isRetryable(error)) {
              set({ networkIssue: true });
              scheduleRetry();
              break;
            }
            console.error('Change rejected by the server:', op, error);
            await withQueueLock(async () => {
              await idbDelete(OPS_STORE, op.seq);
              replaceOps(get().ops.filter((o) => o.seq !== op.seq));
            });
            if (op.kind === 'photo_upload') releasePreview(op.clientId);
            set({ failed: [...get().failed, { op, message: describeError(error) }] });
          } finally {
            inFlightSeq = null;
          }
        }
      } finally {
        set({ syncing: false });
        if (flushAgain) {
          flushAgain = false;
          if (!get().networkIssue) get().flush();
        }
      }
    },

    dismissFailed: (seq) => set({ failed: get().failed.filter((f) => f.op.seq !== seq) }),
  };
});
