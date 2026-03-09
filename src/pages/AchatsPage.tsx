import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/layout/Layout';
import { PageHeader } from '../components/layout/PageHeader';
import { FilterChips } from '../components/ui/FilterChips';
import { FAB } from '../components/ui/FAB';
import { EmptyState } from '../components/ui/EmptyState';
import { AchatCard } from '../components/achats/AchatCard';
import { useAchatStore } from '../stores/achatStore';

type FilterValue = 'a_acheter' | 'achete' | 'tous';

const filterChips: { value: FilterValue; label: string }[] = [
  { value: 'a_acheter', label: 'À acheter' },
  { value: 'achete', label: 'Achetés' },
  { value: 'tous', label: 'Tous' },
];

export function AchatsPage() {
  const navigate = useNavigate();
  const { achats, loading, fetchAchats, subscribeToChanges } = useAchatStore();
  const [filter, setFilter] = useState<FilterValue>('a_acheter');

  useEffect(() => {
    fetchAchats();
    const unsub = subscribeToChanges();
    return unsub;
  }, [fetchAchats, subscribeToChanges]);

  const filtered = achats.filter((a) => {
    if (filter === 'tous') return true;
    return a.statut === filter;
  });

  return (
    <Layout>
      <PageHeader title="🛒 Achats" />
      <FilterChips chips={filterChips} selected={filter} onChange={setFilter} />

      <div className="px-4 space-y-3 mt-2">
        {loading && !achats.length ? (
          <div className="text-center text-gray-400 py-8">Chargement...</div>
        ) : filtered.length === 0 ? (
          <EmptyState emoji="🛒" title="Aucun achat" subtitle="Appuyez sur + pour en ajouter" />
        ) : (
          filtered.map((a) => <AchatCard key={a.id} achat={a} />)
        )}
      </div>

      <FAB onClick={() => navigate('/achats/new')} />
    </Layout>
  );
}
