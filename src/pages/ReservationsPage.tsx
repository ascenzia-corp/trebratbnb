import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/layout/Layout';
import { PageHeader } from '../components/layout/PageHeader';
import { FilterChips } from '../components/ui/FilterChips';
import { FAB } from '../components/ui/FAB';
import { EmptyState } from '../components/ui/EmptyState';
import { ReservationCard } from '../components/reservations/ReservationCard';
import { useReservationStore } from '../stores/reservationStore';
import { computeStatutSejour } from '../utils/dateUtils';

type FilterValue = 'a_venir' | 'en_cours' | 'termine' | 'tous';

const filterChips: { value: FilterValue; label: string }[] = [
  { value: 'a_venir', label: 'À venir' },
  { value: 'en_cours', label: 'En cours' },
  { value: 'termine', label: 'Terminées' },
  { value: 'tous', label: 'Tous' },
];

export function ReservationsPage() {
  const navigate = useNavigate();
  const { reservations, loading, fetchReservations, subscribeToChanges } = useReservationStore();
  const [filter, setFilter] = useState<FilterValue>('a_venir');

  useEffect(() => {
    fetchReservations();
    const unsub = subscribeToChanges();
    return unsub;
  }, [fetchReservations, subscribeToChanges]);

  const filtered = reservations
    .filter((r) => {
      if (filter === 'tous') return true;
      const statut = computeStatutSejour(r.date_checkin, r.date_checkout, r.statut_sejour);
      return statut === filter;
    })
    // Terminées: show most recent first; others keep chronological (soonest first)
    .sort((a, b) =>
      filter === 'termine'
        ? b.date_checkin.localeCompare(a.date_checkin)
        : a.date_checkin.localeCompare(b.date_checkin)
    );

  return (
    <Layout>
      <PageHeader title="📅 Réservations" />
      <FilterChips chips={filterChips} selected={filter} onChange={setFilter} />

      <div className="px-4 space-y-3 mt-2">
        {loading && !reservations.length ? (
          <div className="text-center text-gray-400 py-8">Chargement...</div>
        ) : filtered.length === 0 ? (
          <EmptyState emoji="📅" title="Aucune réservation" subtitle="Appuyez sur + pour en créer une" />
        ) : (
          filtered.map((r) => <ReservationCard key={r.id} reservation={r} />)
        )}
      </div>

      <FAB onClick={() => navigate('/reservations/new')} />
    </Layout>
  );
}
