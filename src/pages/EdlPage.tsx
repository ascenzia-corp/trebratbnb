import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Layout } from '../components/layout/Layout';
import { PageHeader } from '../components/layout/PageHeader';
import { EmptyState } from '../components/ui/EmptyState';
import { EdlPieceItem } from '../components/edl/EdlPieceItem';
import { useEdlStore } from '../stores/edlStore';
import { useReservationStore } from '../stores/reservationStore';
import { useAuthStore } from '../stores/authStore';
import { PIECES_ORDERED, STATUT_SEJOUR_LABELS } from '../utils/labels';
import { computeStatutSejour } from '../utils/dateUtils';
import type { Reservation, EtatDesLieux } from '../types';

type EdlAgent = 'manu' | 'alienor';

export function EdlPage() {
  const { edls, loading, fetchEdls, updateEdl, subscribeToChanges } = useEdlStore();
  const { reservations, fetchReservations } = useReservationStore();
  const { profile } = useAuthStore();
  const [searchParams] = useSearchParams();
  // A reservation can be pre-selected via ?reservation=<id> (e.g. coming from a
  // reservation detail page). Otherwise we auto-select the current/next one.
  const [selectedReservation, setSelectedReservation] = useState<string>(
    searchParams.get('reservation') ?? ''
  );
  // Who is currently performing the walkthrough. Each room is then marked
  // "réalisé" individually and attributed to this agent.
  const [activeAgent, setActiveAgent] = useState<EdlAgent | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    fetchReservations();
    const unsub = subscribeToChanges();
    return unsub;
  }, [fetchReservations, subscribeToChanges]);

  useEffect(() => {
    // Default the active agent to the logged-in field agent, if any.
    if (!activeAgent && (profile?.agent_key === 'manu' || profile?.agent_key === 'alienor')) {
      setActiveAgent(profile.agent_key);
    }
  }, [profile, activeAgent]);

  useEffect(() => {
    // Auto-select the current or next upcoming reservation
    if (reservations.length && !selectedReservation) {
      const statutOf = (r: Reservation) =>
        computeStatutSejour(r.date_checkin, r.date_checkout, r.statut_sejour);
      const active = reservations.find((r) => statutOf(r) === 'en_cours')
        ?? reservations.find((r) => statutOf(r) === 'a_venir');
      if (active) {
        setSelectedReservation(active.id);
      }
    }
  }, [reservations, selectedReservation]);

  useEffect(() => {
    if (selectedReservation) {
      fetchEdls(selectedReservation);
    }
  }, [selectedReservation, fetchEdls]);

  // Sort EDLs by PIECES_ORDERED
  const sortedEdls = [...edls].sort((a, b) => {
    return PIECES_ORDERED.indexOf(a.piece) - PIECES_ORDERED.indexOf(b.piece);
  });

  const doneCount = sortedEdls.filter((e) => e.realise_par !== null).length;

  // Toggle a single room's "réalisé" state, attributing it to the active agent.
  const handleToggleRealise = async (edl: EtatDesLieux) => {
    if (savingId) return;
    const markingDone = edl.realise_par === null;
    if (markingDone && !activeAgent) return; // an agent must be selected first
    setSavingId(edl.id);
    const today = new Date().toISOString().split('T')[0];
    await updateEdl(
      edl.id,
      markingDone
        ? { realise_par: activeAgent, date_constat: today }
        : { realise_par: null, date_constat: null }
    );
    setSavingId(null);
  };

  const inputClass = 'w-full bg-white rounded-xl px-4 py-3 text-gray-900 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#007AFF]/30';

  return (
    <Layout>
      <PageHeader title="🏡 État des lieux" />

      <div className="px-4 mb-3">
        <select
          value={selectedReservation}
          onChange={(e) => setSelectedReservation(e.target.value)}
          className={inputClass}
        >
          <option value="">Sélectionner une réservation</option>
          {reservations.map((r: Reservation) => (
            <option key={r.id} value={r.id}>
              {r.voyageur} ({STATUT_SEJOUR_LABELS[computeStatutSejour(r.date_checkin, r.date_checkout, r.statut_sejour)].label})
            </option>
          ))}
        </select>
      </div>

      {/* Réalisé par — qui effectue l'état des lieux */}
      {sortedEdls.length > 0 && (
        <div className="px-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-gray-500">Réalisé par</label>
            <span className="text-sm font-medium text-gray-500">{doneCount}/{sortedEdls.length} réalisés</span>
          </div>
          <div className="flex gap-2">
            {(['manu', 'alienor'] as const).map((agent) => (
              <button
                key={agent}
                onClick={() => setActiveAgent(agent)}
                className={`flex-1 py-3 rounded-xl text-sm font-medium border-2 transition-colors ${
                  activeAgent === agent
                    ? agent === 'manu' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-purple-50 border-purple-500 text-purple-700'
                    : 'bg-white border-gray-200 text-gray-500'
                }`}
              >
                {agent === 'manu' ? 'Manu' : 'Aliénor'}
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-2">
            {activeAgent
              ? 'Cochez chaque pièce au fur et à mesure de l\'inspection.'
              : 'Sélectionnez qui réalise l\'état des lieux, puis cochez chaque pièce.'}
          </p>
        </div>
      )}

      <div className="px-4 space-y-2">
        {loading ? (
          <div className="text-center text-gray-400 py-8">Chargement...</div>
        ) : sortedEdls.length === 0 ? (
          <EmptyState emoji="🏡" title="Aucun état des lieux" subtitle="Sélectionnez une réservation" />
        ) : (
          sortedEdls.map((edl) => (
            <EdlPieceItem
              key={edl.id}
              edl={edl}
              onToggleRealise={handleToggleRealise}
              saving={savingId === edl.id}
            />
          ))
        )}
      </div>
    </Layout>
  );
}
