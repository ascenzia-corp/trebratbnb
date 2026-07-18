import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Layout } from '../components/layout/Layout';
import { PageHeader } from '../components/layout/PageHeader';
import { EmptyState } from '../components/ui/EmptyState';
import { EdlPieceItem } from '../components/edl/EdlPieceItem';
import { useEdlStore } from '../stores/edlStore';
import { useReservationStore } from '../stores/reservationStore';
import { PIECES_ORDERED, STATUT_SEJOUR_LABELS } from '../utils/labels';
import { computeStatutSejour } from '../utils/dateUtils';
import type { Reservation } from '../types';

export function EdlPage() {
  const { edls, loading, fetchEdls, updateEdl, subscribeToChanges } = useEdlStore();
  const { reservations, fetchReservations } = useReservationStore();
  const [searchParams] = useSearchParams();
  // A reservation can be pre-selected via ?reservation=<id> (e.g. coming from a
  // reservation detail page). Otherwise we auto-select the current/next one.
  const [selectedReservation, setSelectedReservation] = useState<string>(
    searchParams.get('reservation') ?? ''
  );
  const [updatingAgent, setUpdatingAgent] = useState(false);

  useEffect(() => {
    fetchReservations();
    const unsub = subscribeToChanges();
    return unsub;
  }, [fetchReservations, subscribeToChanges]);

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

  // Determine current "réalisé par" from EDLs (majority or first set)
  const currentAgent = edls.length > 0
    ? edls.find((e) => e.realise_par !== null)?.realise_par ?? null
    : null;

  const handleAgentChange = async (agent: 'manu' | 'alienor') => {
    if (updatingAgent) return;
    setUpdatingAgent(true);
    const today = new Date().toISOString().split('T')[0];
    await Promise.all(
      edls.map((e) => updateEdl(e.id, { realise_par: agent, date_constat: e.date_constat ?? today }))
    );
    if (selectedReservation) {
      await fetchEdls(selectedReservation);
    }
    setUpdatingAgent(false);
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

      {/* Réalisé par — global pour toutes les pièces */}
      {sortedEdls.length > 0 && (
        <div className="px-4 mb-4">
          <label className="block text-sm font-medium text-gray-500 mb-2">Réalisé par</label>
          <div className="flex gap-2">
            {(['manu', 'alienor'] as const).map((agent) => (
              <button
                key={agent}
                onClick={() => handleAgentChange(agent)}
                disabled={updatingAgent}
                className={`flex-1 py-3 rounded-xl text-sm font-medium border-2 transition-colors ${
                  currentAgent === agent
                    ? agent === 'manu' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-purple-50 border-purple-500 text-purple-700'
                    : 'bg-white border-gray-200 text-gray-500'
                } ${updatingAgent ? 'opacity-50' : ''}`}
              >
                {agent === 'manu' ? 'Manu' : 'Aliénor'}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="px-4 space-y-2">
        {loading ? (
          <div className="text-center text-gray-400 py-8">Chargement...</div>
        ) : sortedEdls.length === 0 ? (
          <EmptyState emoji="🏡" title="Aucun état des lieux" subtitle="Sélectionnez une réservation" />
        ) : (
          sortedEdls.map((edl) => <EdlPieceItem key={edl.id} edl={edl} />)
        )}
      </div>
    </Layout>
  );
}
