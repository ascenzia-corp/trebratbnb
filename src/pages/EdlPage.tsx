import { useEffect, useState } from 'react';
import { Layout } from '../components/layout/Layout';
import { PageHeader } from '../components/layout/PageHeader';
import { EmptyState } from '../components/ui/EmptyState';
import { EdlPieceItem } from '../components/edl/EdlPieceItem';
import { useEdlStore } from '../stores/edlStore';
import { useReservationStore } from '../stores/reservationStore';
import { PIECES_ORDERED } from '../utils/labels';
import type { Reservation } from '../types';

export function EdlPage() {
  const { edls, loading, fetchEdls, subscribeToChanges } = useEdlStore();
  const { reservations, fetchReservations } = useReservationStore();
  const [selectedReservation, setSelectedReservation] = useState<string>('');

  useEffect(() => {
    fetchReservations();
    const unsub = subscribeToChanges();
    return unsub;
  }, [fetchReservations, subscribeToChanges]);

  useEffect(() => {
    // Auto-select the current or next upcoming reservation
    if (reservations.length && !selectedReservation) {
      const active = reservations.find((r) => r.statut_sejour === 'en_cours')
        ?? reservations.find((r) => r.statut_sejour === 'a_venir');
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
              {r.voyageur} ({r.statut_sejour === 'en_cours' ? 'En cours' : r.statut_sejour === 'a_venir' ? 'À venir' : r.statut_sejour})
            </option>
          ))}
        </select>
      </div>

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
