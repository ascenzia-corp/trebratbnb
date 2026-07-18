import { useNavigate } from 'react-router-dom';
import { Camera, Check } from 'lucide-react';
import { Badge } from '../ui/Badge';
import { PIECE_LABELS, ETAT_EDL_LABELS } from '../../utils/labels';
import { formatDateShort } from '../../utils/dateUtils';
import type { EtatDesLieux } from '../../types';

interface Props {
  edl: EtatDesLieux;
  onToggleRealise?: (edl: EtatDesLieux) => void;
  saving?: boolean;
}

export function EdlPieceItem({ edl, onToggleRealise, saving }: Props) {
  const navigate = useNavigate();
  const etat = ETAT_EDL_LABELS[edl.etat];
  const hasPhotos = edl.photos && edl.photos.length > 0;
  const realise = edl.realise_par !== null;

  return (
    <div
      onClick={() => navigate(`/etats-des-lieux/${edl.id}`)}
      className={`bg-white rounded-2xl p-4 shadow-sm flex items-center justify-between active:scale-[0.98] transition-transform cursor-pointer ${realise ? 'opacity-70' : ''}`}
    >
      <div className="flex items-center gap-3 min-w-0">
        {onToggleRealise && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onToggleRealise(edl); }}
            disabled={saving}
            aria-label={realise ? 'Marquer comme non réalisé' : 'Marquer comme réalisé'}
            className={`w-6 h-6 rounded-full shrink-0 flex items-center justify-center border-2 transition-colors ${
              realise ? 'bg-green-500 border-green-500' : 'border-gray-300'
            } ${saving ? 'opacity-50' : ''}`}
          >
            {realise && <Check size={14} className="text-white" />}
          </button>
        )}
        <span className="text-xl shrink-0">{PIECE_LABELS[edl.piece].split(' ')[0]}</span>
        <p className={`font-medium text-sm truncate ${realise ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
          {PIECE_LABELS[edl.piece].substring(PIECE_LABELS[edl.piece].indexOf(' ') + 1)}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {realise && edl.realise_par && (
          <span className="text-[10px] text-gray-400 text-right leading-tight">
            {edl.realise_par === 'manu' ? 'Manu' : 'Aliénor'}
            {edl.date_constat && <><br />{formatDateShort(edl.date_constat)}</>}
          </span>
        )}
        {hasPhotos && <Camera size={14} className="text-gray-400" />}
        <Badge {...etat} />
      </div>
    </div>
  );
}
