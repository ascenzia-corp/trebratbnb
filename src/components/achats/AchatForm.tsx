import { useState, useEffect } from 'react';
import type { CreateAchatInput, Demandeur, Reservation } from '../../types';
import { useReservationStore } from '../../stores/reservationStore';

interface Props {
  onSubmit: (data: CreateAchatInput) => Promise<void>;
  initial?: Partial<CreateAchatInput>;
  submitLabel?: string;
}

export function AchatForm({ onSubmit, initial, submitLabel = 'Ajouter' }: Props) {
  const [article, setArticle] = useState(initial?.article ?? '');
  const [prix, setPrix] = useState(initial?.prix?.toString() ?? '');
  const [demandepar, setDemandePar] = useState<Demandeur | ''>(initial?.demande_par ?? '');
  const [reservationId, setReservationId] = useState(initial?.reservation_id ?? '');
  const [commentaire, setCommentaire] = useState(initial?.commentaire ?? '');
  const [submitting, setSubmitting] = useState(false);

  const { reservations, fetchReservations } = useReservationStore();

  useEffect(() => {
    fetchReservations();
  }, [fetchReservations]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!article) return;
    setSubmitting(true);
    try {
      await onSubmit({
        article,
        prix: prix ? parseFloat(prix) : undefined,
        demande_par: demandepar || undefined,
        reservation_id: reservationId || undefined,
        commentaire: commentaire || undefined,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass = 'w-full bg-white rounded-xl px-4 py-3 text-gray-900 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#007AFF]/30 focus:border-[#007AFF]';

  return (
    <form onSubmit={handleSubmit} className="space-y-4 px-4">
      <div>
        <label className="block text-sm font-medium text-gray-500 mb-1">Article *</label>
        <input
          type="text"
          value={article}
          onChange={(e) => setArticle(e.target.value)}
          className={inputClass}
          placeholder="Nom de l'article"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-500 mb-1">Prix (€)</label>
        <input
          type="number"
          step="0.01"
          value={prix}
          onChange={(e) => setPrix(e.target.value)}
          className={inputClass}
          placeholder="0.00"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-500 mb-1">Demandé par</label>
        <select
          value={demandepar}
          onChange={(e) => setDemandePar(e.target.value as Demandeur | '')}
          className={inputClass}
        >
          <option value="">—</option>
          <option value="marie">Marie</option>
          <option value="manu">Manu</option>
          <option value="alienor">Aliénor</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-500 mb-1">Réservation liée</label>
        <select
          value={reservationId}
          onChange={(e) => setReservationId(e.target.value)}
          className={inputClass}
        >
          <option value="">Aucune</option>
          {reservations.map((r: Reservation) => (
            <option key={r.id} value={r.id}>{r.voyageur}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-500 mb-1">Commentaire</label>
        <textarea
          value={commentaire}
          onChange={(e) => setCommentaire(e.target.value)}
          className={`${inputClass} resize-none`}
          rows={3}
        />
      </div>

      <button
        type="submit"
        disabled={submitting || !article}
        className="w-full bg-[#007AFF] text-white py-3.5 rounded-xl font-semibold text-base disabled:opacity-50 active:scale-[0.98] transition-transform"
      >
        {submitting ? '...' : submitLabel}
      </button>
    </form>
  );
}
