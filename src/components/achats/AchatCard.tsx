import { useNavigate } from 'react-router-dom';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { STATUT_ACHAT_LABELS, DEMANDEUR_LABELS } from '../../utils/labels';
import type { Achat } from '../../types';

interface Props {
  achat: Achat;
}

export function AchatCard({ achat }: Props) {
  const navigate = useNavigate();
  const statut = STATUT_ACHAT_LABELS[achat.statut];

  return (
    <Card onClick={() => navigate(`/achats/${achat.id}`)}>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 truncate">🛒 {achat.article}</p>
          <div className="flex items-center gap-2 mt-1.5">
            {achat.prix != null && (
              <span className="text-sm font-medium text-gray-700">
                {achat.prix.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
              </span>
            )}
            {achat.demande_par && <Badge {...DEMANDEUR_LABELS[achat.demande_par]} />}
          </div>
          {achat.reservation?.voyageur && (
            <p className="text-xs text-gray-400 mt-1">🏠 {achat.reservation.voyageur}</p>
          )}
        </div>
        <Badge {...statut} />
      </div>
    </Card>
  );
}
