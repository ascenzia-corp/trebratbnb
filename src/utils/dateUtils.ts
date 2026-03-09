import { format, parseISO, isToday, isTomorrow, isPast, isFuture, isWithinInterval } from 'date-fns';
import { fr } from 'date-fns/locale';

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
  return format(parseISO(dateStr), "d MMM yyyy 'à' HH:mm", { locale: fr });
}

export function formatInputDate(dateStr: string): string {
  return format(parseISO(dateStr), 'yyyy-MM-dd');
}

export function formatInputDateTime(dateStr: string): string {
  return format(parseISO(dateStr), "yyyy-MM-dd'T'HH:mm");
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
