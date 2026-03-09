import { useNavigate } from 'react-router-dom';
import { Camera } from 'lucide-react';
import { Badge } from '../ui/Badge';
import { PIECE_LABELS, ETAT_EDL_LABELS } from '../../utils/labels';
import type { EtatDesLieux } from '../../types';

interface Props {
  edl: EtatDesLieux;
}

export function EdlPieceItem({ edl }: Props) {
  const navigate = useNavigate();
  const etat = ETAT_EDL_LABELS[edl.etat];
  const hasPhotos = edl.photos && edl.photos.length > 0;

  return (
    <div
      onClick={() => navigate(`/etats-des-lieux/${edl.id}`)}
      className="bg-white rounded-2xl p-4 shadow-sm flex items-center justify-between active:scale-[0.98] transition-transform cursor-pointer"
    >
      <div className="flex items-center gap-3 min-w-0">
        <span className="text-xl shrink-0">{PIECE_LABELS[edl.piece].split(' ')[0]}</span>
        <p className="font-medium text-sm text-gray-900 truncate">
          {PIECE_LABELS[edl.piece].substring(PIECE_LABELS[edl.piece].indexOf(' ') + 1)}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {hasPhotos && <Camera size={14} className="text-gray-400" />}
        <Badge {...etat} />
      </div>
    </div>
  );
}
