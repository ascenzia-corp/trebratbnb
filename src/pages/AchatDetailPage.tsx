import { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Layout } from '../components/layout/Layout';
import { PageHeader } from '../components/layout/PageHeader';
import { Badge } from '../components/ui/Badge';
import { Card } from '../components/ui/Card';
import { PhotoGallery } from '../components/ui/PhotoGallery';
import { STATUT_ACHAT_LABELS, DEMANDEUR_LABELS } from '../utils/labels';
import { fetchAchat } from '../services/achatService';
import { useAchatStore } from '../stores/achatStore';
import type { Achat, StatutAchat } from '../types';

export function AchatDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { updateAchat, uploadJustificatif } = useAchatStore();
  const [achat, setAchat] = useState<Achat | null>(null);
  const refreshTimer = useRef<number | null>(null);

  useEffect(() => {
    if (id) fetchAchat(id).then(setAchat);
    return () => { if (refreshTimer.current) clearTimeout(refreshTimer.current); };
  }, [id]);

  if (!achat) return <Layout><div className="text-center py-8 text-gray-400">Chargement...</div></Layout>;

  const statut = STATUT_ACHAT_LABELS[achat.statut];

  const handleStatutChange = async (newStatut: StatutAchat) => {
    const data: Partial<Achat> = { statut: newStatut };
    if (newStatut === 'achete') data.date_achat = new Date().toISOString().split('T')[0];
    await updateAchat(achat.id, data);
    const updated = await fetchAchat(achat.id);
    setAchat(updated);
  };

  const handlePhotoUpload = async (file: File) => {
    await uploadJustificatif(achat.id, file);
    const updated = await fetchAchat(achat.id);
    setAchat(updated);
  };

  return (
    <Layout>
      <PageHeader title={achat.article} showBack />

      <div className="px-4 space-y-4 mt-2">
        <Card>
          <div className="flex items-center justify-between mb-3">
            <Badge {...statut} />
            {achat.prix != null && (
              <span className="text-lg font-bold text-gray-900">
                {achat.prix.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
              </span>
            )}
          </div>
          {achat.demande_par && (
            <p className="text-sm text-gray-500">
              Demandé par : <Badge {...DEMANDEUR_LABELS[achat.demande_par]} />
            </p>
          )}
          {achat.reservation?.voyageur && (
            <p className="text-sm text-gray-500 mt-1">🏠 {achat.reservation.voyageur}</p>
          )}
          {achat.commentaire && (
            <p className="text-sm text-gray-400 italic mt-2">{achat.commentaire}</p>
          )}
        </Card>

        {/* Statut actions */}
        <div className="flex gap-2">
          {(['a_acheter', 'achete', 'non_necessaire'] as StatutAchat[]).map((s) => {
            const label = STATUT_ACHAT_LABELS[s];
            const isActive = achat.statut === s;
            return (
              <button
                key={s}
                onClick={() => handleStatutChange(s)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium border-2 transition-colors ${
                  isActive ? `${label.bg} ${label.color} border-current` : 'bg-white border-gray-200 text-gray-500'
                }`}
              >
                {label.label}
              </button>
            );
          })}
        </div>

        {/* Justificatifs */}
        <div>
          <label className="block text-sm font-medium text-gray-500 mb-2">📷 Justificatifs</label>
          <PhotoGallery
            photos={(achat.justificatifs ?? []).map((j) => ({
              id: j.id,
              photo_url: j.photo_url,
              storage_path: j.storage_path,
            }))}
            onUpload={handlePhotoUpload}
          />
        </div>
      </div>
    </Layout>
  );
}
