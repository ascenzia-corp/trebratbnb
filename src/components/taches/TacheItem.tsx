import { Badge } from '../ui/Badge';
import { TYPE_TACHE_LABELS, MOMENT_TACHE_LABELS, ASSIGNEE_LABELS } from '../../utils/labels';
import { formatDateShort } from '../../utils/dateUtils';
import type { Tache, Assignee } from '../../types';
import { Check } from 'lucide-react';

interface Props {
  tache: Tache;
  onToggleDone: (id: string) => void;
  onAssign: (id: string, assignee: Assignee) => void;
}

export function TacheItem({ tache, onToggleDone, onAssign }: Props) {
  const moment = MOMENT_TACHE_LABELS[tache.moment];
  const assignee = ASSIGNEE_LABELS[tache.assignee_a];
  const isDone = tache.statut === 'fait';

  return (
    <div className={`bg-white rounded-2xl p-4 shadow-sm ${isDone ? 'opacity-60' : ''}`}>
      <div className="flex items-start gap-3">
        <button
          onClick={() => onToggleDone(tache.id)}
          className={`mt-0.5 w-7 h-7 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
            isDone ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300'
          }`}
        >
          {isDone && <Check size={16} />}
        </button>
        <div className="flex-1 min-w-0">
          <p className={`font-medium text-sm ${isDone ? 'line-through text-gray-400' : 'text-gray-900'}`}>
            {TYPE_TACHE_LABELS[tache.type_tache]}
          </p>
          <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
            <Badge {...moment} />
            <Badge {...assignee} />
            {tache.date_echeance && (
              <span className="text-xs text-gray-400">
                📅 {formatDateShort(tache.date_echeance)}
              </span>
            )}
          </div>
        </div>
        {!isDone && tache.assignee_a === 'non_assignee' && (
          <div className="flex gap-1">
            <button
              onClick={() => onAssign(tache.id, 'manu')}
              className="text-xs px-2 py-1 rounded-lg bg-blue-50 text-blue-500"
            >
              Manu
            </button>
            <button
              onClick={() => onAssign(tache.id, 'alienor')}
              className="text-xs px-2 py-1 rounded-lg bg-purple-50 text-purple-500"
            >
              Aliénor
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
