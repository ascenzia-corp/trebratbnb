import { useEffect, useState } from 'react';
import { Layout } from '../components/layout/Layout';
import { PageHeader } from '../components/layout/PageHeader';
import { FilterChips } from '../components/ui/FilterChips';
import { EmptyState } from '../components/ui/EmptyState';
import { TacheGroup } from '../components/taches/TacheGroup';
import { TacheItem } from '../components/taches/TacheItem';
import { useTacheStore } from '../stores/tacheStore';
import { useAuthStore } from '../stores/authStore';
import type { Assignee, MomentTache, Tache } from '../types';

type AssigneeFilter = 'mes_taches' | 'non_assignees' | 'toutes';
type MomentFilter = 'checkin' | 'checkout' | 'tous';

export function TachesPage() {
  const { taches, loading, fetchTaches, updateTache, subscribeToChanges } = useTacheStore();
  const agentKey = useAuthStore((s) => s.getAgentKey());
  const [assigneeFilter, setAssigneeFilter] = useState<AssigneeFilter>('toutes');
  const [momentFilter, setMomentFilter] = useState<MomentFilter>('tous');

  useEffect(() => {
    fetchTaches({ a_faire: true, statut: 'a_faire' });
    const unsub = subscribeToChanges();
    return unsub;
  }, [fetchTaches, subscribeToChanges]);

  const handleToggle = async (id: string) => {
    const t = taches.find((t) => t.id === id);
    if (!t) return;
    await updateTache(id, { statut: t.statut === 'fait' ? 'a_faire' : 'fait' });
    fetchTaches({ a_faire: true, statut: 'a_faire' });
  };

  const handleAssign = async (id: string, assignee: Assignee) => {
    await updateTache(id, { assignee_a: assignee });
    fetchTaches({ a_faire: true, statut: 'a_faire' });
  };

  let filtered = taches.filter((t) => t.a_faire && t.statut === 'a_faire');

  if (assigneeFilter === 'non_assignees') {
    filtered = filtered.filter((t) => t.assignee_a === 'non_assignee');
  } else if (assigneeFilter === 'mes_taches') {
    filtered = filtered.filter((t) => agentKey && t.assignee_a === agentKey);
  }

  // Two kinds of tasks: Marie's missions for a stay, grouped by reservation,
  // and maintenance jobs for the house (spotted during an EDL), listed apart.
  const entretien = filtered.filter((t) => t.type_tache === 'autre');
  let missions = filtered.filter((t) => t.type_tache !== 'autre');

  // Check-in / check-out only means something for missions.
  if (momentFilter !== 'tous') {
    missions = missions.filter((t) => t.moment === (momentFilter as MomentTache));
  }

  // Group by reservation, sorted chronologically by earliest task date
  const groupMap = new Map<string, { voyageur: string; taches: Tache[]; earliestDate: string }>();
  for (const t of missions) {
    const key = t.reservation_id;
    const voyageur = t.reservation?.voyageur ?? 'Sans réservation';
    if (!groupMap.has(key)) groupMap.set(key, { voyageur, taches: [], earliestDate: t.date_echeance ?? '9999-12-31' });
    const group = groupMap.get(key)!;
    group.taches.push(t);
    if (t.date_echeance && t.date_echeance < group.earliestDate) {
      group.earliestDate = t.date_echeance;
    }
  }
  const groups = new Map(
    [...groupMap.entries()].sort(([, a], [, b]) => a.earliestDate.localeCompare(b.earliestDate))
  );

  return (
    <Layout>
      <PageHeader title="✅ Tâches" />
      <FilterChips
        chips={[
          { value: 'toutes' as AssigneeFilter, label: 'Toutes' },
          { value: 'mes_taches' as AssigneeFilter, label: 'Mes tâches' },
          { value: 'non_assignees' as AssigneeFilter, label: 'Non assignées' },
        ]}
        selected={assigneeFilter}
        onChange={setAssigneeFilter}
      />
      <FilterChips
        chips={[
          { value: 'tous' as MomentFilter, label: 'Tous' },
          { value: 'checkin' as MomentFilter, label: 'Check-in' },
          { value: 'checkout' as MomentFilter, label: 'Check-out' },
        ]}
        selected={momentFilter}
        onChange={setMomentFilter}
      />

      <div className="px-4 space-y-6 mt-2">
        {loading && !taches.length ? (
          <div className="text-center text-gray-400 py-8">Chargement...</div>
        ) : groups.size === 0 && entretien.length === 0 ? (
          <EmptyState emoji="✅" title="Aucune tâche" subtitle="Toutes les tâches sont faites !" />
        ) : (
          <>
            {Array.from(groups.entries()).map(([key, group]) => (
              <TacheGroup
                key={key}
                voyageur={group.voyageur}
                taches={group.taches}
                onToggleDone={handleToggle}
                onAssign={handleAssign}
              />
            ))}
            {entretien.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide px-1">
                  🔧 Entretien &amp; retours locataires
                </h3>
                {entretien.map((t) => (
                  <TacheItem key={t.id} tache={t} onToggleDone={handleToggle} onAssign={handleAssign} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}
