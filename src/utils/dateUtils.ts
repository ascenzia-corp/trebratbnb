import { format, parseISO, isToday, isTomorrow, isPast, isFuture, isWithinInterval } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { StatutSejour } from '../types';

export function formatDateShort(dateStr: string): string {
  return format(parseISO(dateStr), 'd MMM', { locale: fr });
}

export function formatDateFull(dateStr: string): string {
  return format(parseISO(dateStr), 'EEEE d MMMM yyyy', { locale: fr });
}

export function formatDateRange(checkin: string, checkout: string): string {
  return `${formatDateShort(checkin)} → ${formatDateShort(checkout)}`;
}

export function formatDateTime(dateStr: string): string {
  const parsed = parseISO(dateStr);
  // If time is midnight (00:00), show date only (no time was specified)
  if (parsed.getHours() === 0 && parsed.getMinutes() === 0) {
    return format(parsed, 'd MMM yyyy', { locale: fr });
  }
  return format(parsed, "d MMM yyyy 'à' HH:mm", { locale: fr });
}

export function formatInputDate(dateStr: string): string {
  return format(parseISO(dateStr), 'yyyy-MM-dd');
}

export function formatInputDateTime(dateStr: string): string {
  return format(parseISO(dateStr), "yyyy-MM-dd'T'HH:mm");
}

/**
 * Compute the effective stay status from the check-in / check-out dates and
 * the current date. A stored "annule" status is always preserved. This is the
 * source of truth for display and filtering — the DB `statut_sejour` column is
 * only a default and is not kept in sync as time passes.
 */
export function computeStatutSejour(
  checkin: string,
  checkout: string,
  stored?: StatutSejour
): StatutSejour {
  if (stored === 'annule') return 'annule';
  const now = new Date();
  const start = new Date(checkin);
  const end = new Date(checkout);
  // All-day check-out (midnight): the stay runs until the end of that day.
  if (end.getHours() === 0 && end.getMinutes() === 0) {
    end.setHours(23, 59, 59, 999);
  }
  if (now < start) return 'a_venir';
  if (now > end) return 'termine';
  return 'en_cours';
}

export function isReservationEnCours(checkin: string, checkout: string): boolean {
  const now = new Date();
  return isWithinInterval(now, { start: parseISO(checkin), end: parseISO(checkout) });
}

export function isReservationAVenir(checkin: string): boolean {
  return isFuture(parseISO(checkin));
}

export function isReservationTerminee(checkout: string): boolean {
  return isPast(parseISO(checkout));
}

export { isToday, isTomorrow, parseISO };

/**
 * Split an ISO datetime string into local date (YYYY-MM-DD) and time (HH:MM).
 * Converts from UTC to the browser's local timezone (Europe/Paris).
 */
export function splitDateTime(dateTimeStr: string): { date: string; time: string } {
  if (!dateTimeStr) return { date: '', time: '' };
  const parsed = new Date(dateTimeStr);
  if (isNaN(parsed.getTime())) return { date: '', time: '' };
  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const day = String(parsed.getDate()).padStart(2, '0');
  const hours = String(parsed.getHours()).padStart(2, '0');
  const minutes = String(parsed.getMinutes()).padStart(2, '0');
  const date = `${year}-${month}-${day}`;
  const time = (hours === '00' && minutes === '00') ? '' : `${hours}:${minutes}`;
  return { date, time };
}

/**
 * Combine a local date (YYYY-MM-DD) and time (HH:MM) into an ISO string.
 * The date+time is interpreted as local (Europe/Paris) and converted to UTC ISO.
 * For no-time (all-day), returns "YYYY-MM-DDT00:00" as-is (no TZ conversion).
 */
export function combineDateTime(date: string, time: string): string {
  if (!date) return '';
  if (!time) return `${date}T00:00`;
  // new Date("YYYY-MM-DDTHH:MM") interprets as local time
  const local = new Date(`${date}T${time}`);
  return local.toISOString();
}
