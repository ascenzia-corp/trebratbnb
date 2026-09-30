import { useState } from 'react';
import type { CreateReservationInput } from '../../types';
import { splitDateTime, combineDateTime } from '../../utils/dateUtils';
import { TimeoutError } from '../../utils/withTimeout';
import { DateInput, INCOMPLETE_DATE_MESSAGE } from '../ui/DateInput';

/** YYYY-MM-DD of the day after `date` (local time). */
function nextDay(date: string): string {
  const d = new Date(`${date}T12:00:00`);
  d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function friendlyError(err: unknown): string {
  if (err instanceof TimeoutError) {
    return (
      `${err.message} Vérifiez dans la liste si la réservation a malgré tout été créée ` +
      `avant de réessayer. Si cela se reproduit, déconnectez-vous puis reconnectez-vous.`
    );
  }
  const msg = (err as Error)?.message ?? '';
  if (/load failed|failed to fetch|networkerror|aborted/i.test(msg)) {
    return 'Connexion au serveur impossible. Vérifiez votre connexion internet et réessayez.';
  }
  return msg || 'Une erreur est survenue. Veuillez réessayer.';
}

interface Props {
  onSubmit: (data: CreateReservationInput) => Promise<void>;
  initial?: Partial<CreateReservationInput>;
  submitLabel?: string;
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
  const [error, setError] = useState<string | null>(null);
  const [checkinIncomplete, setCheckinIncomplete] = useState(false);
  const [checkoutIncomplete, setCheckoutIncomplete] = useState(false);
  const [showProblems, setShowProblems] = useState(false);

  const isCheckoutValid = !dateCheckin || !dateCheckout || dateCheckout >= dateCheckin;

  // Everything still preventing creation, in plain words. The button stays
  // active: a greyed-out button gave no clue about what was wrong.
  const problems = [
    !voyageur.trim() && 'le nom du voyageur',
    checkinIncomplete ? 'la date de check-in est incomplète' : !dateCheckin && 'la date de check-in',
    checkoutIncomplete ? 'la date de check-out est incomplète' : !dateCheckout && 'la date de check-out',
    !isCheckoutValid && 'le check-out doit être après le check-in',
  ].filter((p): p is string => !!p);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (problems.length) {
      setShowProblems(true);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit({
        voyageur,
        telephone: telephone || undefined,
        nb_personnes: nbPersonnes,
        date_checkin: combineDateTime(dateCheckin, timeCheckin),
        date_checkout: combineDateTime(dateCheckout, timeCheckout),
        commentaires: commentaires || undefined,
      });
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleCheckinDateChange = (newDate: string) => {
    setDateCheckin(newDate);
    if (!newDate) return;
    // Pre-fill a real check-out (next day) rather than leaving an empty field
    // whose greyed-out hints look like a date; also fix one now before check-in.
    if (!dateCheckout || checkoutIncomplete || dateCheckout < newDate) {
      setDateCheckout(nextDay(newDate));
      setCheckoutIncomplete(false);
    }
  };

  const inputClass = 'w-full bg-white rounded-xl px-4 py-3 text-gray-900 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#007AFF]/30 focus:border-[#007AFF]';

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4 px-4">
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
          <DateInput
            value={dateCheckin}
            onChange={handleCheckinDateChange}
            onIncompleteChange={setCheckinIncomplete}
            className={`${inputClass} ${checkinIncomplete ? 'border-red-400 focus:ring-red-300' : ''}`}
          />
          <input
            type="time"
            value={timeCheckin}
            onChange={(e) => setTimeCheckin(e.target.value)}
            className={inputClass}
            placeholder="Heure (optionnel)"
          />
        </div>
        {checkinIncomplete && <p className="text-xs text-red-500 mt-1">{INCOMPLETE_DATE_MESSAGE}</p>}
      </div>

      {/* Check-out: date + time */}
      <div>
        <label className="block text-sm font-medium text-gray-500 mb-1">Check-out *</label>
        <div className="grid grid-cols-2 gap-2">
          <DateInput
            value={dateCheckout}
            onChange={setDateCheckout}
            onIncompleteChange={setCheckoutIncomplete}
            min={dateCheckin || undefined}
            className={`${inputClass} ${!isCheckoutValid || checkoutIncomplete ? 'border-red-400 focus:ring-red-300' : ''}`}
          />
          <input
            type="time"
            value={timeCheckout}
            onChange={(e) => setTimeCheckout(e.target.value)}
            className={inputClass}
            placeholder="Heure (optionnel)"
          />
        </div>
        {checkoutIncomplete ? (
          <p className="text-xs text-red-500 mt-1">{INCOMPLETE_DATE_MESSAGE}</p>
        ) : (
          !isCheckoutValid && (
            <p className="text-xs text-red-500 mt-1">La date de sortie doit être postérieure à la date d'entrée</p>
          )
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

      {error && (
        <p className="text-sm text-red-500 bg-red-50 rounded-xl px-4 py-3">{error}</p>
      )}

      {showProblems && problems.length > 0 && (
        <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3">
          Pour continuer, il manque : {problems.join(' · ')}.
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full bg-[#007AFF] text-white py-3.5 rounded-xl font-semibold text-base disabled:opacity-50 active:scale-[0.98] transition-transform"
      >
        {submitting ? 'Création...' : submitLabel}
      </button>

    </form>
  );
}
