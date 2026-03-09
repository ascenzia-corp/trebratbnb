import { useNavigate } from 'react-router-dom';
import { Users, AlertTriangle } from 'lucide-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { STATUT_SEJOUR_LABELS } from '../../utils/labels';
import { formatDateRange } from '../../utils/dateUtils';
import type { Reservation } from '../../types';

interface Props {
  reservation: Reservation;
}

export function ReservationCard({ reservation }: Props) {
  const navigate = useNavigate();
  const statut = STATUT_SEJOUR_LABELS[reservation.statut_sejour];
  const missingInfo = !reservation.telephone || !reservation.nb_personnes;

  return (
    <Card
      onClick={() => navigate(`/reservations/${reservation.id}`)}
      className={missingInfo ? 'border-l-4 border-orange-400' : ''}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-gray-900 truncate">{reservation.voyageur}</p>
            {missingInfo && <AlertTriangle size={16} className="text-orange-400 shrink-0" />}
          </div>
          <p className="text-sm text-gray-500 mt-0.5">
            📅 {formatDateRange(reservation.date_checkin, reservation.date_checkout)}
          </p>
          <div className="flex items-center gap-2 mt-1.5">
            <span className="flex items-center gap-1 text-xs text-gray-500">
              <Users size={14} /> {reservation.nb_personnes} pers.
            </span>
          </div>
        </div>
        <Badge {...statut} />
      </div>
    </Card>
  );
}
