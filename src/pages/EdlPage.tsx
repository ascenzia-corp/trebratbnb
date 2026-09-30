import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Layout } from '../components/layout/Layout';
import { PageHeader } from '../components/layout/PageHeader';
import { EmptyState } from '../components/ui/EmptyState';
import { AutoSaveTextarea } from '../components/ui/AutoSaveTextarea';
import { EdlRoomRow } from '../components/edl/EdlRoomRow';
import { EdlTasksSection } from '../components/edl/EdlTasksSection';
import { SyncStatus } from '../components/edl/SyncStatus';
import { useEdlSheet } from '../hooks/useEdlSheet';
import { useReservationStore } from '../stores/reservationStore';
import { useAuthStore } from '../stores/authStore';
import { useSyncStore } from '../stores/syncStore';
import { roomRow } from '../services/edlSheetService';
import { DEMANDEUR_LABELS, PIECES_ORDERED } from '../utils/labels';
import { computeStatutSejour, formatDateRange } from '../utils/dateUtils';
import type { EdlAgent, EtatDesLieux, MomentEdl, Reservation } from '../types';

const AGENTS: EdlAgent[] = ['manu', 'alienor'];
const AGENT_STORAGE_KEY = 'edl-agent';

function isAgent(v: unknown): v is EdlAgent {
  return v === 'manu' || v === 'alienor';
}

function readStoredAgent(): EdlAgent | null {
  try {
    const v = localStorage.getItem(AGENT_STORAGE_KEY);
    return isAgent(v) ? v : null;
  } catch {
    return null;
  }
}

/** Current stay, else the next one, else the most recent one. */
function defaultReservation(reservations: Reservation[]): Reservation | undefined {
  const statut = (r: Reservation) => computeStatutSejour(r.date_checkin, r.date_checkout, r.statut_sejour);
  return (
    reservations.find((r) => statut(r) === 'en_cours') ??
    reservations.find((r) => statut(r) === 'a_venir') ??
    [...reservations].reverse().find((r) => statut(r) === 'termine')
  );
}

/** From check-out day on, the sortie is what's due; before, the entrée. */
function defaultMoment(reservation: Reservation | null | undefined): MomentEdl {
  if (!reservation) return 'entree';
  const checkoutDay = new Date(reservation.date_checkout);
  checkoutDay.setHours(0, 0, 0, 0);
  return Date.now() >= checkoutDay.getTime() ? 'sortie' : 'entree';
}

export function EdlPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { reservations, fetchReservations } = useReservationStore();
  const profile = useAuthStore((s) => s.profile);
  const { failed, dismissFailed } = useSyncStore();

  const reservationParam = searchParams.get('reservation');
  const momentParam = searchParams.get('moment');

  const [agent, setAgent] = useState<EdlAgent | null>(readStoredAgent);
  const [agentWarning, setAgentWarning] = useState(false);

  useEffect(() => {
    fetchReservations();
    // The list may have failed to load without signal: reload it on reconnection.
    window.addEventListener('online', fetchReservations);
    return () => window.removeEventListener('online', fetchReservations);
  }, [fetchReservations]);

  useEffect(() => {
    if (!agent && isAgent(profile?.agent_key)) chooseAgent(profile.agent_key);
  }, [agent, profile]);

  // Pick a reservation automatically when none is given.
  useEffect(() => {
    if (reservationParam || !reservations.length) return;
    const r = defaultReservation(reservations);
    if (r) setSearchParams({ reservation: r.id }, { replace: true });
  }, [reservationParam, reservations, setSearchParams]);

  const sheet = useEdlSheet(reservationParam);
  const reservation =
    sheet.data?.reservation ?? reservations.find((r) => r.id === reservationParam) ?? null;
  const moment: MomentEdl =
    momentParam === 'entree' || momentParam === 'sortie' ? momentParam : defaultMoment(reservation);

  const setParam = (changes: Record<string, string>) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(changes).forEach(([k, v]) => next.set(k, v));
    setSearchParams(next, { replace: true });
  };

  const chooseAgent = (a: EdlAgent) => {
    setAgent(a);
    setAgentWarning(false);
    try {
      localStorage.setItem(AGENT_STORAGE_KEY, a);
    } catch {
      /* private mode: the choice just won't be remembered */
    }
  };

  const requireAgent = (): EdlAgent | null => {
    if (agent) return agent;
    setAgentWarning(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return null;
  };

  const rowsFor = (m: MomentEdl) =>
    PIECES_ORDERED.map((p) => (sheet.data ? roomRow(sheet.data.edls, p, m) : undefined)).filter(
      (r): r is EtatDesLieux => !!r
    );
  const rows = rowsFor(moment);
  const entryRows = useMemo(
    () => new Map(rowsFor('entree').map((r) => [r.piece, r])),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sheet.data]
  );
  const progress = (m: MomentEdl) => {
    const list = rowsFor(m);
    return { done: list.filter((r) => r.realise_par).length, total: list.length || PIECES_ORDERED.length };
  };
  const remaining = rows.filter((r) => !r.realise_par);
  const notes = sheet.data?.notes.find((n) => n.moment === moment);
  const taches = sheet.data?.taches ?? [];
  const openTasks = taches.filter((t) => t.statut !== 'fait').length;

  const handleMarkRemaining = () => {
    const a = requireAgent();
    if (!a) return;
    const n = remaining.length;
    if (window.confirm(`Marquer ${n > 1 ? `les ${n} pièces restantes` : 'la pièce restante'} « RAS » ?`)) {
      sheet.markRemainingRas(remaining, a);
    }
  };

  const jump = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  return (
    <Layout>
      <PageHeader title="🏡 État des lieux" rightAction={<SyncStatus />} />

      <div className="px-4 space-y-3">
        <select
          value={reservationParam ?? ''}
          onChange={(e) => setSearchParams({ reservation: e.target.value }, { replace: true })}
          className="w-full bg-white rounded-xl px-3 py-3 text-[15px] text-gray-900 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#007AFF]/30"
        >
          <option value="" disabled>
            Choisir une réservation
          </option>
          {reservations.map((r) => (
            <option key={r.id} value={r.id}>
              {r.voyageur} · {formatDateRange(r.date_checkin, r.date_checkout)}
            </option>
          ))}
          {reservation && !reservations.some((r) => r.id === reservation.id) && (
            <option value={reservation.id}>
              {reservation.voyageur} · {formatDateRange(reservation.date_checkin, reservation.date_checkout)}
            </option>
          )}
        </select>

        {failed.map((f) => (
          <div key={f.op.seq} className="flex items-start gap-2 bg-red-50 text-red-700 text-sm rounded-xl px-3 py-2.5">
            <p className="flex-1">⚠️ Une modification n'a pas pu être enregistrée : {f.message}</p>
            <button onClick={() => dismissFailed(f.op.seq)} className="text-red-400 font-medium shrink-0">
              OK
            </button>
          </div>
        ))}

        {!sheet.notesAvailable && (
          <p className="bg-amber-50 text-amber-700 text-sm rounded-xl px-3 py-2.5">
            ⚙️ La base de données doit être mise à jour (migration 002) pour enregistrer les retours des locataires et
            les tâches. Les pièces fonctionnent déjà.
          </p>
        )}

        {sheet.fromCache && (
          <p className="bg-orange-50 text-orange-700 text-sm rounded-xl px-3 py-2.5">
            📴 Pas de réseau : affichage des dernières données enregistrées sur ce téléphone. Vos modifications seront
            envoyées dès le retour du réseau.
          </p>
        )}
      </div>

      {!reservationParam ? (
        <EmptyState emoji="🏡" title="Aucune réservation" subtitle="Choisissez une réservation ci-dessus" />
      ) : !sheet.data ? (
        <div className="text-center text-gray-400 py-10 px-6">
          {sheet.loadError ? (
            <>
              <p className="text-sm">Impossible de charger l'état des lieux.</p>
              <p className="text-xs mt-1">{sheet.loadError}</p>
              <button onClick={sheet.reload} className="mt-3 text-[#007AFF] font-medium">
                Réessayer
              </button>
            </>
          ) : (
            'Chargement...'
          )}
        </div>
      ) : (
        <>
          {/* Entrée / Sortie */}
          <div className="px-4 mt-4">
            <div className="grid grid-cols-2 gap-1 bg-gray-200/70 rounded-xl p-1">
              {(['entree', 'sortie'] as MomentEdl[]).map((m) => {
                const { done, total } = progress(m);
                const active = m === moment;
                return (
                  <button
                    key={m}
                    onClick={() => setParam({ moment: m })}
                    className={`py-2 rounded-lg text-sm font-semibold transition-colors ${
                      active ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
                    }`}
                  >
                    {m === 'entree' ? 'Entrée' : 'Sortie'}
                    <span className={`ml-1.5 text-xs font-medium ${done === total ? 'text-green-600' : 'text-gray-400'}`}>
                      {done}/{total}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Réalisé par */}
          <div className="px-4 mt-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500 shrink-0">Réalisé par</span>
              <div className="flex gap-1.5 flex-1">
                {AGENTS.map((a) => (
                  <button
                    key={a}
                    onClick={() => chooseAgent(a)}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium border-2 transition-colors ${
                      agent === a ? 'border-[#007AFF] bg-blue-50 text-[#007AFF]' : 'border-transparent bg-white text-gray-500'
                    }`}
                  >
                    {DEMANDEUR_LABELS[a].label}
                  </button>
                ))}
              </div>
            </div>
            {agentWarning && (
              <p className="text-sm text-red-500 mt-2">Choisissez d'abord qui réalise l'état des lieux.</p>
            )}
          </div>

          {/* Raccourcis */}
          <div className="px-4 mt-3 flex gap-2 overflow-x-auto scrollbar-hide text-xs">
            <button onClick={() => jump('edl-pieces')} className="px-3 py-1.5 rounded-full bg-white text-gray-600 shadow-sm whitespace-nowrap">
              🏠 Pièces
            </button>
            <button onClick={() => jump('edl-notes')} className="px-3 py-1.5 rounded-full bg-white text-gray-600 shadow-sm whitespace-nowrap">
              💬 Retours & remarques
            </button>
            <button onClick={() => jump('edl-taches')} className="px-3 py-1.5 rounded-full bg-white text-gray-600 shadow-sm whitespace-nowrap">
              🔧 Tâches{openTasks ? ` (${openTasks})` : ''}
            </button>
          </div>

          {/* Pièces */}
          <section id="edl-pieces" className="px-4 mt-4 space-y-2 scroll-mt-24">
            <p className="text-[11px] text-gray-400 px-1">
              ✓ RAS · ⚠ À signaler · ✕ Problème — toucher à nouveau pour annuler
            </p>
            {rows.map((row) => (
              <EdlRoomRow
                key={row.id}
                row={row}
                entryRow={moment === 'sortie' ? entryRows.get(row.piece) : undefined}
                onSetEtat={(etat) => {
                  if (etat === null) return sheet.clearEtat(row);
                  const a = requireAgent();
                  if (a) sheet.setEtat(row, etat, a);
                }}
                onComment={(text) => sheet.setComment(row, text)}
                onAddPhoto={(file) => sheet.addPhoto(row, file)}
                onDeletePhoto={(photo) => sheet.deletePhoto(row, photo)}
              />
            ))}

            {remaining.length > 0 && remaining.length < rows.length && (
              <button
                onClick={handleMarkRemaining}
                className="w-full py-3 rounded-xl bg-green-50 text-green-700 font-medium text-sm active:bg-green-100"
              >
                ✓ Tout le reste en RAS ({remaining.length} pièce{remaining.length > 1 ? 's' : ''})
              </button>
            )}
            {remaining.length === rows.length && (
              <button
                onClick={handleMarkRemaining}
                className="w-full py-3 rounded-xl bg-white text-green-700 font-medium text-sm shadow-sm active:bg-green-50"
              >
                ✓ Tout est en ordre : tout marquer RAS
              </button>
            )}
          </section>

          {/* Retours & remarques */}
          <section id="edl-notes" className="px-4 mt-6 space-y-4 scroll-mt-24">
            <div>
              <h2 className="text-base font-bold text-gray-900 mb-1.5">💬 Retours des locataires</h2>
              <AutoSaveTextarea
                key={`retours-${moment}`}
                value={notes?.retours_locataires ?? ''}
                onSave={(v) => sheet.setNotes(moment, 'retours_locataires', v)}
                rows={3}
                placeholder="Ce que les locataires ont signalé ou demandé…"
              />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900 mb-1.5">📝 Remarques générales</h2>
              <AutoSaveTextarea
                key={`remarques-${moment}`}
                value={notes?.remarques ?? ''}
                onSave={(v) => sheet.setNotes(moment, 'remarques', v)}
                rows={3}
                placeholder="Observations sur l'ensemble de la maison…"
              />
            </div>
          </section>

          {/* Tâches */}
          <section id="edl-taches" className="px-4 mt-6 mb-6 scroll-mt-24">
            <h2 className="text-base font-bold text-gray-900 mb-1.5">🔧 Tâches à prévoir</h2>
            <EdlTasksSection
              taches={taches}
              onAdd={(titre) => sheet.addTask(titre, moment)}
              onToggle={sheet.toggleTask}
              onDelete={sheet.deleteTask}
            />
          </section>
        </>
      )}
    </Layout>
  );
}
