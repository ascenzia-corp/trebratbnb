import { useSyncStore } from '../../stores/syncStore';

/** Tells, in plain words, whether everything typed has reached the server. */
export function SyncStatus() {
  const { ops, failed, syncing, networkIssue, online } = useSyncStore();
  const pending = ops.length;

  let label: string;
  let tone: string;
  if (failed.length) {
    label = '⚠️ Erreur';
    tone = 'bg-red-50 text-red-600';
  } else if (pending && (!online || networkIssue)) {
    label = `📴 ${pending} en attente`;
    tone = 'bg-orange-50 text-orange-600';
  } else if (pending) {
    label = syncing ? '⏳ Envoi…' : `⏳ ${pending} en attente`;
    tone = 'bg-blue-50 text-blue-600';
  } else {
    label = '✓ Enregistré';
    tone = 'bg-green-50 text-green-600';
  }

  return <span className={`text-xs font-medium px-2.5 py-1 rounded-full whitespace-nowrap ${tone}`}>{label}</span>;
}
