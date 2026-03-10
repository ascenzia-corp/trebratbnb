import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Phone, Edit2, XCircle } from 'lucide-react';
import { Layout } from '../components/layout/Layout';
import { PageHeader } from '../components/layout/PageHeader';
import { Badge } from '../components/ui/Badge';
import { Card } from '../components/ui/Card';
import { TacheItem } from '../components/taches/TacheItem';
import { useReservationStore } from '../stores/reservationStore';
import { useTacheStore } from '../stores/tacheStore';
import { useEdlStore } from '../stores/edlStore';
import { useAchatStore } from '../stores/achatStore';
import { STATUT_SEJOUR_LABELS, ETAT_EDL_LABELS } from '../utils/labels';
import { formatDateTime, formatInputDate } from '../utils/dateUtils';
import { fetchReservation, updateReservation as updateReservationService } from '../services/reservationService';
import { updateCalendarEvent } from '../services/googleCalendarService';
import type { Reservation, Assignee } from '../types';

function splitDateTime(dateTimeStr: string): { date: string; time: string } {
  if (!dateTimeStr) return { date: '', time: '' };
  const isoMatch = dateTimeStr.match(/^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2})/);
  if (isoMatch) {
    const time = isoMatch[2] === '00:00' ? '' : isoMatch[2];
    return { date: isoMatch[1], time };
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateTimeStr)) {
    return { date: dateTimeStr, time: '' };
  }
  return { date: '', time: '' };
}

function combineDateTime(date: string, time: string): string {
  if (!date) return '';
  if (!time) return `${date}T00:00`;
  return `${date}T${time}`;
}

export function ReservationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { updateReservation } = useReservationStore();
  const { taches, fetchTaches, updateTache } = useTacheStore();
  const { edls, fetchEdls } = useEdlStore();
  const { achats, fetchAchats } = useAchatStore();
  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState({ voyageur: '', telephone: '', nb_personnes: 1, commentaires: '', dateCheckin: '', timeCheckin: '', dateCheckout: '', timeCheckout: '' });

  useEffect(() => {
    if (!id) return;
    fetchReservation(id).then((r) => {
      setReservation(r);
      const ci = splitDateTime(formatInputDate(r.date_checkin) + 'T' + r.date_checkin.match(/T(\d{2}:\d{2})/)?.[1] || '00:00');
      const co = splitDateTime(formatInputDate(r.date_checkout) + 'T' + r.date_checkout.match(/T(\d{2}:\d{2})/)?.[1] || '00:00');
      setEditData({
        voyageur: r.voyageur,
        telephone: r.telephone ?? '',
        nb_personnes: r.nb_personnes,
        commentaires: r.commentaires ?? '',
        dateCheckin: ci.date || formatInputDate(r.date_checkin),
        timeCheckin: ci.time,
        dateCheckout: co.date || formatInputDate(r.date_checkout),
        timeCheckout: co.time,
      });
    });
    fetchTaches({ reservation_id: id });
    fetchEdls(id);
    fetchAchats({ reservation_id: id });
  }, [id, fetchTaches, fetchEdls, fetchAchats]);

  if (!reservation) return <Layout><div className="text-center py-8 text-gray-400">Chargement...</div></Layout>;

  const statut = STATUT_SEJOUR_LABELS[reservation.statut_sejour];
  const problemCount = edls.filter((e) => e.etat === 'probleme').length;
  const edlDone = edls.filter((e) => e.realise_par !== null).length;

  const isCheckoutValid = !editData.dateCheckin || !editData.dateCheckout || editData.dateCheckout >= editData.dateCheckin;

  const handleSaveEdit = async () => {
    if (!isCheckoutValid) return;
    const newCheckin = combineDateTime(editData.dateCheckin, editData.timeCheckin);
    const newCheckout = combineDateTime(editData.dateCheckout, editData.timeCheckout);

    await updateReservation(reservation.id, {
      voyageur: editData.voyageur,
      telephone: editData.telephone || null,
      nb_personnes: editData.nb_personnes,
      commentaires: editData.commentaires || null,
      date_checkin: newCheckin,
      date_checkout: newCheckout,
    } as Partial<Reservation>);

    // Update Google Calendar event if dates/times changed
    if (reservation.google_event_id) {
      await updateCalendarEvent(reservation.google_event_id, {
        voyageur: editData.voyageur,
        date_checkin: newCheckin,
        date_checkout: newCheckout,
        nb_personnes: editData.nb_personnes,
        telephone: editData.telephone || undefined,
        commentaires: editData.commentaires || undefined,
      });
    }

    const r = await fetchReservation(reservation.id);
    setReservation(r);
    setEditing(false);
  };

  const handleCancel = async () => {
    await updateReservation(reservation.id, { statut_sejour: 'annule' } as Partial<Reservation>);
    navigate('/reservations');
  };

  const handleToggleTache = async (tacheId: string) => {
    const t = taches.find((t) => t.id === tacheId);
    if (!t) return;
    await updateTache(tacheId, { statut: t.statut === 'fait' ? 'a_faire' : 'fait' });
    fetchTaches({ reservation_id: id });
  };

  const handleAssign = async (tacheId: string, assignee: Assignee) => {
    await updateTache(tacheId, { assignee_a: assignee });
    fetchTaches({ reservation_id: id });
  };

  const handleToggleAFaire = async (tacheId: string, currentValue: boolean) => {
    await updateTache(tacheId, { a_faire: !currentValue });
    fetchTaches({ reservation_id: id });
  };

  const inputClass = 'w-full bg-gray-50 rounded-xl px-4 py-3 text-gray-900 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#007AFF]/30';

  return (
    <Layout>
      <PageHeader
        title={reservation.voyageur}
        showBack
        rightAction={
          <button onClick={() => setEditing(!editing)} className="text-[#007AFF]">
            <Edit2 size={20} />
          </button>
        }
      />

      <div className="px-4 space-y-4 mt-2">
        {/* Info card */}
        <Card>
          <div className="flex items-center justify-between mb-3">
            <Badge {...statut} />
            {reservation.telephone && (
              <a href={`tel:${reservation.telephone}`} className="text-[#007AFF] flex items-center gap-1 text-sm">
                <Phone size={16} /> Appeler
              </a>
            )}
          </div>

          {editing ? (
            <div className="space-y-3">
              <input value={editData.voyageur} onChange={(e) => setEditData({ ...editData, voyageur: e.target.value })} className={inputClass} placeholder="Voyageur" />
              <input value={editData.telephone} onChange={(e) => setEditData({ ...editData, telephone: e.target.value })} className={inputClass} placeholder="Téléphone" />
              <input type="number" value={editData.nb_personnes} onChange={(e) => setEditData({ ...editData, nb_personnes: Number(e.target.value) })} className={inputClass} />
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Check-in</label>
                <div className="grid grid-cols-2 gap-2">
                  <input type="date" value={editData.dateCheckin} onChange={(e) => {
                    const newDate = e.target.value;
                    setEditData((prev) => ({
                      ...prev,
                      dateCheckin: newDate,
                      dateCheckout: prev.dateCheckout && prev.dateCheckout < newDate ? newDate : prev.dateCheckout,
                    }));
                  }} className={inputClass} />
                  <input type="time" value={editData.timeCheckin} onChange={(e) => setEditData({ ...editData, timeCheckin: e.target.value })} className={inputClass} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Check-out</label>
                <div className="grid grid-cols-2 gap-2">
                  <input type="date" value={editData.dateCheckout} onChange={(e) => setEditData({ ...editData, dateCheckout: e.target.value })} min={editData.dateCheckin || undefined} className={`${inputClass} ${!isCheckoutValid ? 'border-red-400' : ''}`} />
                  <input type="time" value={editData.timeCheckout} onChange={(e) => setEditData({ ...editData, timeCheckout: e.target.value })} className={inputClass} />
                </div>
                {!isCheckoutValid && <p className="text-xs text-red-500 mt-1">La date de sortie doit être postérieure à la date d'entrée</p>}
              </div>
              <textarea value={editData.commentaires} onChange={(e) => setEditData({ ...editData, commentaires: e.target.value })} className={`${inputClass} resize-none`} rows={3} />
              <button onClick={handleSaveEdit} disabled={!isCheckoutValid} className="w-full bg-[#007AFF] text-white py-3 rounded-xl font-semibold disabled:opacity-50">Enregistrer</button>
            </div>
          ) : (
            <div className="space-y-2 text-sm text-gray-700">
              <p>📅 {formatDateTime(reservation.date_checkin)} → {formatDateTime(reservation.date_checkout)}</p>
              <p>👥 {reservation.nb_personnes} personne{reservation.nb_personnes > 1 ? 's' : ''}</p>
              {reservation.telephone && <p>📞 {reservation.telephone}</p>}
              {reservation.commentaires && <p className="text-gray-500 italic mt-2">{reservation.commentaires}</p>}
            </div>
          )}
        </Card>

        {/* Tâches */}
        <div>
          <h2 className="text-lg font-bold text-gray-900 mb-2">✅ Tâches</h2>
          <div className="space-y-2">
            {taches.map((t) => (
              <div key={t.id} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={t.a_faire}
                  onChange={() => handleToggleAFaire(t.id, t.a_faire)}
                  className="w-5 h-5 accent-[#007AFF]"
                />
                <div className="flex-1">
                  <TacheItem tache={t} onToggleDone={handleToggleTache} onAssign={handleAssign} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* EDL summary */}
        <Card onClick={() => navigate('/etats-des-lieux')}>
          <h2 className="text-lg font-bold text-gray-900 mb-1">🏡 États des lieux</h2>
          <p className="text-sm text-gray-500">{edlDone}/18 réalisés</p>
          {problemCount > 0 && (
            <p className="text-sm text-red-500 mt-1">{ETAT_EDL_LABELS.probleme.label} : {problemCount} pièce{problemCount > 1 ? 's' : ''}</p>
          )}
        </Card>

        {/* Achats */}
        {achats.length > 0 && (
          <Card onClick={() => navigate('/achats')}>
            <h2 className="text-lg font-bold text-gray-900 mb-1">🛒 Achats</h2>
            <p className="text-sm text-gray-500">{achats.length} achat{achats.length > 1 ? 's' : ''}</p>
          </Card>
        )}

        {/* Cancel button */}
        {reservation.statut_sejour !== 'annule' && reservation.statut_sejour !== 'termine' && (
          <button
            onClick={handleCancel}
            className="w-full flex items-center justify-center gap-2 text-red-500 bg-red-50 py-3 rounded-xl font-medium"
          >
            <XCircle size={18} /> Annuler la réservation
          </button>
        )}
      </div>
    </Layout>
  );
}
