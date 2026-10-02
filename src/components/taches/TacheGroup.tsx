import { TacheItem } from './TacheItem';
import type { Tache, Assignee } from '../../types';

interface Props {
  voyageur: string;
  taches: Tache[];
  onToggleDone: (id: string) => void;
  onAssign: (id: string, assignee: Assignee) => void;
}

export function TacheGroup({ voyageur, taches, onToggleDone, onAssign }: Props) {
  const checkinTaches = taches.filter((t) => t.moment === 'checkin');
  const checkoutTaches = taches.filter((t) => t.moment === 'checkout');

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide px-1">
        🏠 {voyageur}
      </h3>
      {checkinTaches.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-green-600 px-1">▸ Check-in</p>
          {checkinTaches.map((tache) => (
            <TacheItem key={tache.id} tache={tache} onToggleDone={onToggleDone} onAssign={onAssign} />
          ))}
        </div>
      )}
      {checkinTaches.length > 0 && checkoutTaches.length > 0 && <div className="h-3" />}
      {checkoutTaches.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-orange-500 px-1">▸ Check-out</p>
          {checkoutTaches.map((tache) => (
            <TacheItem key={tache.id} tache={tache} onToggleDone={onToggleDone} onAssign={onAssign} />
          ))}
        </div>
      )}
    </div>
  );
}
