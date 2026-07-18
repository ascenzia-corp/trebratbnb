import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Layout } from '../components/layout/Layout';
import { PageHeader } from '../components/layout/PageHeader';
import { EdlEtatSelector } from '../components/edl/EdlEtatSelector';
import { PhotoGallery } from '../components/ui/PhotoGallery';
import { PIECE_LABELS } from '../utils/labels';
import { formatDateFull } from '../utils/dateUtils';
import { fetchEdl } from '../services/edlService';
import { useEdlStore } from '../stores/edlStore';
import type { EtatDesLieux, EtatEdl } from '../types';

export function EdlDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { updateEdl, uploadPhoto, deletePhoto } = useEdlStore();
  const [edl, setEdl] = useState<EtatDesLieux | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (id) fetchEdl(id).then(setEdl);
  }, [id]);

  if (!edl) return <Layout><div className="text-center py-8 text-gray-400">Chargement...</div></Layout>;

  const handleEtatChange = async (etat: EtatEdl) => {
    setSaving(true);
    const probleme_signale = etat !== 'ras';
    await updateEdl(edl.id, { etat, probleme_signale });
    setEdl({ ...edl, etat, probleme_signale });
    setSaving(false);
  };

  const handleFieldChange = async (field: string, value: string) => {
    setSaving(true);
    await updateEdl(edl.id, { [field]: value } as Partial<EtatDesLieux>);
    setEdl({ ...edl, [field]: value } as EtatDesLieux);
    setSaving(false);
  };

  const handlePhotoUpload = async (file: File) => {
    await uploadPhoto(edl.id, file);
    const updated = await fetchEdl(edl.id);
    setEdl(updated);
  };

  const handlePhotoDelete = async (photoId: string, storagePath: string) => {
    await deletePhoto(photoId, storagePath);
    const updated = await fetchEdl(edl.id);
    setEdl(updated);
  };

  const inputClass = 'w-full bg-white rounded-xl px-4 py-3 text-gray-900 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#007AFF]/30';

  return (
    <Layout>
      <PageHeader
        title={PIECE_LABELS[edl.piece]}
        showBack
        rightAction={saving ? <span className="text-xs text-gray-400">Sauvegarde...</span> : undefined}
      />

      <div className="px-4 space-y-6 mt-2">
        {/* État selector */}
        <div>
          <label className="block text-sm font-medium text-gray-500 mb-2">État</label>
          <EdlEtatSelector value={edl.etat} onChange={handleEtatChange} />
        </div>

        {/* Commentaire */}
        <div>
          <label className="block text-sm font-medium text-gray-500 mb-1">Commentaire</label>
          <textarea
            value={edl.commentaire ?? ''}
            onBlur={(e) => handleFieldChange('commentaire', e.target.value)}
            onChange={(e) => setEdl({ ...edl, commentaire: e.target.value })}
            className={`${inputClass} resize-none`}
            rows={3}
            placeholder="Observations..."
          />
        </div>

        {/* Description problème (shown when not RAS) */}
        {edl.etat !== 'ras' && (
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">Description du problème</label>
            <textarea
              value={edl.description_probleme ?? ''}
              onBlur={(e) => handleFieldChange('description_probleme', e.target.value)}
              onChange={(e) => setEdl({ ...edl, description_probleme: e.target.value })}
              className={`${inputClass} resize-none`}
              rows={3}
              placeholder="Décrivez le problème..."
            />
          </div>
        )}

        {/* Photos */}
        <div>
          <label className="block text-sm font-medium text-gray-500 mb-2">📷 Photos</label>
          <PhotoGallery
            photos={edl.photos ?? []}
            onUpload={handlePhotoUpload}
            onDelete={handlePhotoDelete}
          />
        </div>

        {/* Réalisé par (read-only, géré depuis la page EDL) */}
        {edl.realise_par && (
          <p className="text-xs text-gray-400 text-center">
            Réalisé par {edl.realise_par === 'manu' ? 'Manu' : 'Aliénor'}
            {edl.date_constat ? ` le ${formatDateFull(edl.date_constat)}` : ''}
          </p>
        )}
      </div>
    </Layout>
  );
}
