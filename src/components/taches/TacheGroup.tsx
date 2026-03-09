import { TacheItem } from './TacheItem';
import type { Tache, Assignee } from '../../types';

interface Props {
  voyageur: string;
  taches: Tache[];
  onToggleDone: (id: string) => void;
  onAssign: (id: string, assignee: Assignee) => void;
}

export function TacheGroup({ voyageur, taches, onToggleDone, onAssign }: Props) {
  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide px-1">
        🏠 {voyageur}
      </h3>
      {taches.map((tache) => (
        <TacheItem
          key={tache.id}
          tache={tache}
          onToggleDone={onToggleDone}
          onAssign={onAssign}
        />
      ))}
    </div>
  );
}
