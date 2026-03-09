import { useState } from 'react';
import type { CreateReservationInput } from '../../types';

interface Props {
  onSubmit: (data: CreateReservationInput) => Promise<void>;
  initial?: Partial<CreateReservationInput>;
  submitLabel?: string;
}

export function ReservationForm({ onSubmit, initial, submitLabel = 'Créer' }: Props) {
  const [voyageur, setVoyageur] = useState(initial?.voyageur ?? '');
  const [telephone, setTelephone] = useState(initial?.telephone ?? '');
  const [nbPersonnes, setNbPersonnes] = useState(initial?.nb_personnes ?? 1);
  const [dateCheckin, setDateCheckin] = useState(initial?.date_checkin ?? '');
  const [dateCheckout, setDateCheckout] = useState(initial?.date_checkout ?? '');
  const [commentaires, setCommentaires] = useState(initial?.commentaires ?? '');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!voyageur || !dateCheckin || !dateCheckout) return;
    setSubmitting(true);
    try {
      await onSubmit({
        voyageur,
        telephone: telephone || undefined,
        nb_personnes: nbPersonnes,
        date_checkin: dateCheckin,
        date_checkout: dateCheckout,
        commentaires: commentaires || undefined,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass = 'w-full bg-white rounded-xl px-4 py-3 text-gray-900 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#007AFF]/30 focus:border-[#007AFF]';

  return (
    <form onSubmit={handleSubmit} className="space-y-4 px-4">
      <div>
        <label className="block text-sm font-medium text-gray-500 mb-1">Voyageur *</label>
        <input
          type="text"
          value={voyageur}
          onChange={(e) => setVoyageur(e.target.value)}
          className={inputClass}
          placeholder="Nom du voyageur"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-500 mb-1">Téléphone</label>
        <input
          type="tel"
          value={telephone}
          onChange={(e) => setTelephone(e.target.value)}
          className={inputClass}
          placeholder="+33 6 ..."
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-500 mb-1">Nombre de personnes</label>
        <input
          type="number"
          min={1}
          max={20}
          value={nbPersonnes}
          onChange={(e) => setNbPersonnes(Number(e.target.value))}
          className={inputClass}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-500 mb-1">Check-in *</label>
          <input
            type="datetime-local"
            value={dateCheckin}
            onChange={(e) => setDateCheckin(e.target.value)}
            className={inputClass}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-500 mb-1">Check-out *</label>
          <input
            type="datetime-local"
            value={dateCheckout}
            onChange={(e) => setDateCheckout(e.target.value)}
            className={inputClass}
            required
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-500 mb-1">Commentaires</label>
        <textarea
          value={commentaires}
          onChange={(e) => setCommentaires(e.target.value)}
          className={`${inputClass} resize-none`}
          rows={3}
          placeholder="Notes complémentaires..."
        />
      </div>

      <button
        type="submit"
        disabled={submitting || !voyageur || !dateCheckin || !dateCheckout}
        className="w-full bg-[#007AFF] text-white py-3.5 rounded-xl font-semibold text-base disabled:opacity-50 active:scale-[0.98] transition-transform"
      >
        {submitting ? '...' : submitLabel}
      </button>
    </form>
  );
}
