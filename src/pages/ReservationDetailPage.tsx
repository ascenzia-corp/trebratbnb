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
import { formatDateFull } from '../utils/dateUtils';
import { fetchReservation } from '../services/reservationService';
import type { Reservation, Assignee } from '../types';

export function ReservationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { updateReservation } = useReservationStore();
  const { taches, fetchTaches, updateTache } = useTacheStore();
  const { edls, fetchEdls } = useEdlStore();
  const { achats, fetchAchats } = useAchatStore();
  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState({ voyageur: '', telephone: '', nb_personnes: 1, commentaires: '' });

  useEffect(() => {
    if (!id) return;
    fetchReservation(id).then((r) => {
      setReservation(r);
      setEditData({
        voyageur: r.voyageur,
        telephone: r.telephone ?? '',
        nb_personnes: r.nb_personnes,
        commentaires: r.commentaires ?? '',
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

  const handleSaveEdit = async () => {
    await updateReservation(reservation.id, {
      voyageur: editData.voyageur,
      telephone: editData.telephone || null,
      nb_personnes: editData.nb_personnes,
      commentaires: editData.commentaires || null,
    } as Partial<Reservation>);
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
              <textarea value={editData.commentaires} onChange={(e) => setEditData({ ...editData, commentaires: e.target.value })} className={`${inputClass} resize-none`} rows={3} />
              <button onClick={handleSaveEdit} className="w-full bg-[#007AFF] text-white py-3 rounded-xl font-semibold">Enregistrer</button>
            </div>
          ) : (
            <div className="space-y-2 text-sm text-gray-700">
              <p>📅 {formatDateFull(reservation.date_checkin)} → {formatDateFull(reservation.date_checkout)}</p>
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
