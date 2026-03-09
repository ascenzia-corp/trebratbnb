import type { EtatEdl } from '../../types';

interface Props {
  value: EtatEdl;
  onChange: (etat: EtatEdl) => void;
}

const options: { value: EtatEdl; label: string; activeColor: string }[] = [
  { value: 'ras', label: '✅ RAS', activeColor: 'bg-green-100 border-green-500 text-green-700' },
  { value: 'a_signaler', label: '⚠️ À signaler', activeColor: 'bg-yellow-100 border-yellow-500 text-yellow-700' },
  { value: 'probleme', label: '🔴 Problème', activeColor: 'bg-red-100 border-red-500 text-red-700' },
];

export function EdlEtatSelector({ value, onChange }: Props) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`py-3 rounded-xl border-2 text-sm font-medium transition-colors ${
            value === opt.value ? opt.activeColor : 'bg-white border-gray-200 text-gray-500'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
