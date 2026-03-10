import { useState } from 'react';
import type { CreateReservationInput } from '../../types';

interface Props {
  onSubmit: (data: CreateReservationInput) => Promise<void>;
  initial?: Partial<CreateReservationInput>;
  submitLabel?: string;
}

function splitDateTime(dateTimeStr: string): { date: string; time: string } {
  if (!dateTimeStr) return { date: '', time: '' };
  // Handle ISO format "2026-03-15T14:00:00+..." or "2026-03-15T14:00"
  const isoMatch = dateTimeStr.match(/^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2})/);
  if (isoMatch) {
    const time = isoMatch[2] === '00:00' ? '' : isoMatch[2];
    return { date: isoMatch[1], time };
  }
  // Handle date-only "2026-03-15"
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

export function ReservationForm({ onSubmit, initial, submitLabel = 'Créer' }: Props) {
  const [voyageur, setVoyageur] = useState(initial?.voyageur ?? '');
  const [telephone, setTelephone] = useState(initial?.telephone ?? '');
  const [nbPersonnes, setNbPersonnes] = useState(initial?.nb_personnes ?? 1);
  const initialCheckin = splitDateTime(initial?.date_checkin ?? '');
  const initialCheckout = splitDateTime(initial?.date_checkout ?? '');
  const [dateCheckin, setDateCheckin] = useState(initialCheckin.date);
  const [timeCheckin, setTimeCheckin] = useState(initialCheckin.time);
  const [dateCheckout, setDateCheckout] = useState(initialCheckout.date);
  const [timeCheckout, setTimeCheckout] = useState(initialCheckout.time);
  const [commentaires, setCommentaires] = useState(initial?.commentaires ?? '');
  const [submitting, setSubmitting] = useState(false);

  const isCheckoutValid = !dateCheckin || !dateCheckout || dateCheckout >= dateCheckin;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!voyageur || !dateCheckin || !dateCheckout || !isCheckoutValid) return;
    setSubmitting(true);
    try {
      await onSubmit({
        voyageur,
        telephone: telephone || undefined,
        nb_personnes: nbPersonnes,
        date_checkin: combineDateTime(dateCheckin, timeCheckin),
        date_checkout: combineDateTime(dateCheckout, timeCheckout),
        commentaires: commentaires || undefined,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCheckinDateChange = (newDate: string) => {
    setDateCheckin(newDate);
    // If checkout is before new checkin, reset it
    if (dateCheckout && dateCheckout < newDate) {
      setDateCheckout(newDate);
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

      {/* Check-in: date + time */}
      <div>
        <label className="block text-sm font-medium text-gray-500 mb-1">Check-in *</label>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="date"
            value={dateCheckin}
            onChange={(e) => handleCheckinDateChange(e.target.value)}
            className={inputClass}
            required
          />
          <input
            type="time"
            value={timeCheckin}
            onChange={(e) => setTimeCheckin(e.target.value)}
            className={inputClass}
            placeholder="Heure (optionnel)"
          />
        </div>
      </div>

      {/* Check-out: date + time */}
      <div>
        <label className="block text-sm font-medium text-gray-500 mb-1">Check-out *</label>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="date"
            value={dateCheckout}
            onChange={(e) => setDateCheckout(e.target.value)}
            min={dateCheckin || undefined}
            className={`${inputClass} ${!isCheckoutValid ? 'border-red-400 focus:ring-red-300' : ''}`}
            required
          />
          <input
            type="time"
            value={timeCheckout}
            onChange={(e) => setTimeCheckout(e.target.value)}
            className={inputClass}
            placeholder="Heure (optionnel)"
          />
        </div>
        {!isCheckoutValid && (
          <p className="text-xs text-red-500 mt-1">La date de sortie doit être postérieure à la date d'entrée</p>
        )}
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
        disabled={submitting || !voyageur || !dateCheckin || !dateCheckout || !isCheckoutValid}
        className="w-full bg-[#007AFF] text-white py-3.5 rounded-xl font-semibold text-base disabled:opacity-50 active:scale-[0.98] transition-transform"
      >
        {submitting ? '...' : submitLabel}
      </button>
    </form>
  );
}
