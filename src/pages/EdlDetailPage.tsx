import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Layout } from '../components/layout/Layout';
import { PageHeader } from '../components/layout/PageHeader';
import { EdlEtatSelector } from '../components/edl/EdlEtatSelector';
import { PhotoGallery } from '../components/ui/PhotoGallery';
import { PIECE_LABELS } from '../utils/labels';
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

        {/* Réalisé par */}
        <div>
          <label className="block text-sm font-medium text-gray-500 mb-1">Réalisé par</label>
          <div className="flex gap-2">
            {(['manu', 'alienor'] as const).map((agent) => (
              <button
                key={agent}
                onClick={() => handleFieldChange('realise_par', agent)}
                className={`flex-1 py-3 rounded-xl text-sm font-medium border-2 transition-colors ${
                  edl.realise_par === agent
                    ? agent === 'manu' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-purple-50 border-purple-500 text-purple-700'
                    : 'bg-white border-gray-200 text-gray-500'
                }`}
              >
                {agent === 'manu' ? 'Manu' : 'Aliénor'}
              </button>
            ))}
          </div>
        </div>

        {/* Date constat */}
        <div>
          <label className="block text-sm font-medium text-gray-500 mb-1">Date du constat</label>
          <input
            type="date"
            value={edl.date_constat?.split('T')[0] ?? new Date().toISOString().split('T')[0]}
            onChange={(e) => handleFieldChange('date_constat', e.target.value)}
            className={inputClass}
          />
        </div>
      </div>
    </Layout>
  );
}
