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
  const needsAttention = tache.a_faire && !isDone && tache.assignee_a === 'non_assignee';

  return (
    <div className={`bg-white rounded-2xl p-4 shadow-sm ${isDone ? 'opacity-60' : ''} ${needsAttention ? 'border-l-4 border-orange-400 bg-orange-50/50' : ''}`}>
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
            {needsAttention && (
              <span className="text-xs font-semibold px-1.5 py-0.5 rounded bg-orange-100 text-orange-600">À assigner</span>
            )}
            {tache.date_echeance && (
              <span className="text-xs text-gray-400">
                📅 {formatDateShort(tache.date_echeance)}
              </span>
            )}
          </div>
        </div>
        {!isDone && (
          <div className="flex gap-1">
            {tache.assignee_a !== 'manu' && (
              <button
                onClick={() => onAssign(tache.id, 'manu')}
                className="text-xs px-2 py-1 rounded-lg bg-blue-50 text-blue-500"
              >
                Manu
              </button>
            )}
            {tache.assignee_a !== 'alienor' && (
              <button
                onClick={() => onAssign(tache.id, 'alienor')}
                className="text-xs px-2 py-1 rounded-lg bg-purple-50 text-purple-500"
              >
                Aliénor
              </button>
            )}
            {tache.assignee_a !== 'non_assignee' && (
              <button
                onClick={() => onAssign(tache.id, 'non_assignee')}
                className="text-xs px-2 py-1 rounded-lg bg-gray-100 text-gray-400"
              >
                ✕
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
