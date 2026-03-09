const APPS_SCRIPT_URL = import.meta.env.VITE_GOOGLE_APPS_SCRIPT_URL;

interface CalendarEventInput {
  voyageur: string;
  date_checkin: string;
  date_checkout: string;
  nb_personnes: number;
  telephone?: string;
  commentaires?: string;
}

interface CalendarEventResult {
  eventId: string;
}

export async function createCalendarEvent(input: CalendarEventInput): Promise<CalendarEventResult | null> {
  if (!APPS_SCRIPT_URL) {
    console.warn('Google Apps Script URL not configured (VITE_GOOGLE_APPS_SCRIPT_URL)');
    return null;
  }

  try {
    const response = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({
        action: 'create',
        voyageur: input.voyageur,
        date_checkin: input.date_checkin,
        date_checkout: input.date_checkout,
        nb_personnes: input.nb_personnes,
        telephone: input.telephone ?? '',
        commentaires: input.commentaires ?? '',
      }),
    });

    const result = await response.json();
    if (result.error) {
      console.error('Google Calendar error:', result.error);
      return null;
    }
    return { eventId: result.eventId };
  } catch (err) {
    console.error('Failed to create calendar event:', err);
    return null;
  }
}

export async function deleteCalendarEvent(eventId: string): Promise<void> {
  if (!APPS_SCRIPT_URL) return;

  try {
    await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ action: 'delete', eventId }),
    });
  } catch (err) {
    console.error('Failed to delete calendar event:', err);
  }
}
