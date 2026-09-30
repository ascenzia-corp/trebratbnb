import { useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { Camera, Check, AlertTriangle, X } from 'lucide-react';
import { AutoSaveTextarea } from '../ui/AutoSaveTextarea';
import { PIECE_LABELS, ETAT_EDL_LABELS, DEMANDEUR_LABELS } from '../../utils/labels';
import { formatDateShort } from '../../utils/dateUtils';
import type { EtatDesLieux, EtatEdl } from '../../types';
import type { SheetPhoto } from '../../services/offline/syncOps';

interface Props {
  row: EtatDesLieux;
  /** at sortie: the same room at entrée, to spot what changed */
  entryRow?: EtatDesLieux;
  onSetEtat: (etat: EtatEdl | null) => void;
  onComment: (text: string) => void;
  onAddPhoto: (file: File) => Promise<void>;
  onDeletePhoto: (photo: SheetPhoto) => void;
}

const BUTTONS: { etat: EtatEdl; label: string; Icon: typeof Check; on: string; off: string }[] = [
  { etat: 'ras', label: 'RAS', Icon: Check, on: 'bg-green-500 border-green-500 text-white', off: 'border-gray-200 text-green-600' },
  { etat: 'a_signaler', label: 'À signaler', Icon: AlertTriangle, on: 'bg-amber-500 border-amber-500 text-white', off: 'border-gray-200 text-amber-500' },
  { etat: 'probleme', label: 'Problème', Icon: X, on: 'bg-red-500 border-red-500 text-white', off: 'border-gray-200 text-red-500' },
];

const ACCENT: Record<EtatEdl, string> = {
  ras: 'border-l-green-400',
  a_signaler: 'border-l-amber-400',
  probleme: 'border-l-red-400',
};

function splitLabel(label: string) {
  const i = label.indexOf(' ');
  return { emoji: label.slice(0, i), name: label.slice(i + 1) };
}

export function EdlRoomRow({ row, entryRow, onSetEtat, onComment, onAddPhoto, onDeletePhoto }: Props) {
  const done = !!row.realise_par;
  const photos = (row.photos ?? []) as SheetPhoto[];
  const comment = row.commentaire ?? row.description_probleme ?? '';
  const hasDetails = !!comment || photos.length > 0;
  const needsDetails = done && row.etat !== 'ras';

  const [open, setOpen] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const noteInput = useRef<HTMLTextAreaElement>(null);
  const expanded = open || needsDetails || hasDetails;

  const { emoji, name } = splitLabel(PIECE_LABELS[row.piece]);
  const entryNote =
    entryRow?.realise_par && (entryRow.etat !== 'ras' || entryRow.commentaire)
      ? `${ETAT_EDL_LABELS[entryRow.etat].label}${entryRow.commentaire ? ` — « ${entryRow.commentaire} »` : ''}`
      : null;

  const handleEtat = (etat: EtatEdl) => {
    if (done && row.etat === etat) {
      onSetEtat(null); // tapping the selected state again clears the room
      return;
    }
    onSetEtat(etat);
    if (etat !== 'ras' && !comment) {
      // Open the note and focus it within the tap itself: iOS only shows the
      // keyboard for a focus that happens during the user's gesture.
      flushSync(() => setOpen(true));
      noteInput.current?.focus();
    }
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setPhotoError(null);
    try {
      await onAddPhoto(file);
    } catch (err) {
      setPhotoError((err as Error)?.message ?? 'Photo impossible à enregistrer');
    }
  };

  return (
    <div
      className={`bg-white rounded-2xl shadow-sm border-l-4 ${done ? ACCENT[row.etat] : 'border-l-gray-200'} px-3 py-2.5`}
    >
      <div className="flex items-center gap-1">
        {/* Tapping the room name opens its note & photos */}
        <button
          type="button"
          onClick={() => !needsDetails && !hasDetails && setOpen((o) => !o)}
          className="flex-1 min-w-0 flex items-center gap-2 text-left py-1"
        >
          <span className="text-xl shrink-0 w-7 text-center">{emoji}</span>
          <span className="min-w-0">
            <span className="block font-medium text-[15px] text-gray-900 truncate">{name}</span>
            <span className="block text-[11px] text-gray-400 truncate">
              {done && row.realise_par
                ? `${DEMANDEUR_LABELS[row.realise_par].label}${row.date_constat ? ` · ${formatDateShort(row.date_constat)}` : ''}`
                : 'À vérifier'}
              {!expanded && <span className="text-[#007AFF]"> · ＋ note</span>}
              {!expanded && photos.length > 0 && ` · 📷 ${photos.length}`}
            </span>
          </span>
        </button>
        <div className="flex gap-1.5 shrink-0">
          {BUTTONS.map(({ etat, label, Icon, on, off }) => {
            const selected = done && row.etat === etat;
            return (
              <button
                key={etat}
                type="button"
                aria-label={label}
                aria-pressed={selected}
                onClick={() => handleEtat(etat)}
                className={`w-11 h-11 rounded-full border-2 flex items-center justify-center transition-colors active:scale-95 ${
                  selected ? on : `bg-white ${off}`
                }`}
              >
                <Icon size={20} strokeWidth={2.5} />
              </button>
            );
          })}
        </div>
      </div>

      {entryNote && (
        <p className="mt-2 text-xs text-gray-500 bg-gray-50 rounded-lg px-2.5 py-1.5">
          <span className="font-medium">À l'entrée :</span> {entryNote}
        </p>
      )}

      {expanded ? (
        <div className="mt-2.5 space-y-2">
          <AutoSaveTextarea
            value={comment}
            onSave={onComment}
            inputRef={noteInput}
            placeholder={row.etat === 'ras' ? 'Note (facultatif)' : 'Qu\'avez-vous constaté ?'}
          />
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            {photos.map((photo) => (
              <div key={photo.id} className="relative shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-gray-100">
                <a href={photo.photo_url} target="_blank" rel="noreferrer">
                  <img src={photo.photo_url} alt="" className="w-full h-full object-cover" />
                </a>
                {photo.pending && (
                  <span className="absolute bottom-0 inset-x-0 bg-black/50 text-white text-[9px] text-center py-0.5">
                    en attente
                  </span>
                )}
                <button
                  type="button"
                  aria-label="Supprimer la photo"
                  onClick={() => {
                    if (window.confirm('Supprimer cette photo ?')) onDeletePhoto(photo);
                  }}
                  className="absolute top-0.5 right-0.5 w-5 h-5 bg-black/50 text-white rounded-full flex items-center justify-center"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              className="shrink-0 w-16 h-16 rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400 active:bg-gray-50"
            >
              <Camera size={18} />
              <span className="text-[10px] mt-0.5">Photo</span>
            </button>
          </div>
          {photoError && <p className="text-xs text-red-500">{photoError}</p>}
        </div>
      ) : null}

      <input ref={fileInput} type="file" accept="image/*" capture="environment" onChange={handleFile} className="hidden" />
    </div>
  );
}
