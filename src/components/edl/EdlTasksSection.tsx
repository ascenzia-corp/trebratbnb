import { useState } from 'react';
import { Check, Plus, X } from 'lucide-react';
import { ASSIGNEE_LABELS } from '../../utils/labels';
import type { Tache } from '../../types';

interface Props {
  taches: Tache[];
  onAdd: (titre: string) => void;
  onToggle: (tache: Tache) => void;
  onDelete: (tache: Tache) => void;
  disabled?: boolean;
}

/**
 * Small follow-up jobs spotted during the walkthrough ("racheter une ampoule").
 * They are regular tasks: they also show up, and can be ticked, in the Tâches tab.
 */
export function EdlTasksSection({ taches, onAdd, onToggle, onDelete, disabled }: Props) {
  const [titre, setTitre] = useState('');
  const todo = taches.filter((t) => t.statut !== 'fait');
  const done = taches.filter((t) => t.statut === 'fait');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!titre.trim()) return;
    onAdd(titre);
    setTitre('');
  };

  return (
    <div className="space-y-2">
      <form onSubmit={submit} className="flex gap-2">
        <input
          value={titre}
          onChange={(e) => setTitre(e.target.value)}
          disabled={disabled}
          placeholder="Ex. racheter une ampoule"
          enterKeyHint="done"
          className="flex-1 min-w-0 bg-white rounded-xl px-3 py-2.5 text-sm text-gray-900 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#007AFF]/30 focus:border-[#007AFF] disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={disabled || !titre.trim()}
          aria-label="Ajouter la tâche"
          className="w-11 h-11 shrink-0 rounded-xl bg-[#007AFF] text-white flex items-center justify-center disabled:opacity-40"
        >
          <Plus size={20} />
        </button>
      </form>

      {taches.length === 0 && (
        <p className="text-xs text-gray-400 px-1">
          Aucune tâche. Ce que vous ajoutez ici apparaît aussi dans l'onglet Tâches.
        </p>
      )}

      {[...todo, ...done].map((t) => {
        const isDone = t.statut === 'fait';
        return (
          <div key={t.id} className={`bg-white rounded-xl px-3 py-2.5 flex items-center gap-3 shadow-sm ${isDone ? 'opacity-60' : ''}`}>
            <button
              type="button"
              aria-label={isDone ? 'Marquer à faire' : 'Marquer comme faite'}
              onClick={() => onToggle(t)}
              className={`w-7 h-7 rounded-full border-2 flex items-center justify-center shrink-0 ${
                isDone ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300'
              }`}
            >
              {isDone && <Check size={16} />}
            </button>
            <div className="flex-1 min-w-0">
              <p className={`text-sm ${isDone ? 'line-through text-gray-400' : 'text-gray-900'}`}>{t.titre}</p>
              {!isDone && t.assignee_a !== 'non_assignee' && (
                <p className="text-[11px] text-gray-400">{ASSIGNEE_LABELS[t.assignee_a].label}</p>
              )}
            </div>
            {!isDone && (
              <button
                type="button"
                aria-label="Supprimer la tâche"
                onClick={() => {
                  if (window.confirm(`Supprimer « ${t.titre} » ?`)) onDelete(t);
                }}
                className="w-8 h-8 shrink-0 rounded-full text-gray-300 flex items-center justify-center active:bg-gray-100"
              >
                <X size={16} />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
