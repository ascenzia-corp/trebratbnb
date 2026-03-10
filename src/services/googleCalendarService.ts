/**
 * Google Calendar API v3 integration via Service Account JWT.
 *
 * Required env vars:
 *   VITE_GOOGLE_SERVICE_ACCOUNT_EMAIL  — service account email
 *   VITE_GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY — PEM private key (with \n)
 *   VITE_GOOGLE_CALENDAR_ID — calendar ID (defaults to the shared calendar)
 */

const SERVICE_ACCOUNT_EMAIL = import.meta.env.VITE_GOOGLE_SERVICE_ACCOUNT_EMAIL as string | undefined;
const PRIVATE_KEY_RAW = import.meta.env.VITE_GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY as string | undefined;
const CALENDAR_ID = (import.meta.env.VITE_GOOGLE_CALENDAR_ID as string | undefined)
  ?? 'c_b90baba6f4a6b60fa843f7d6571b8b6acde9fdc906939592f53a86e33c325d77@group.calendar.google.com';

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const CALENDAR_API = 'https://www.googleapis.com/calendar/v3';
const SCOPE = 'https://www.googleapis.com/auth/calendar.events';

// --- JWT helpers using Web Crypto API ---

function base64url(data: Uint8Array | string): string {
  const str = typeof data === 'string' ? data : String.fromCharCode(...data);
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const b64 = pem
    .replace(/-----BEGIN [\w ]+-----/g, '')
    .replace(/-----END [\w ]+-----/g, '')
    .replace(/\s/g, '');
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

async function createSignedJwt(): Promise<string> {
  if (!SERVICE_ACCOUNT_EMAIL || !PRIVATE_KEY_RAW) {
    throw new Error('Google service account not configured');
  }

  const privateKeyPem = PRIVATE_KEY_RAW.replace(/\\n/g, '\n');

  const key = await crypto.subtle.importKey(
    'pkcs8',
    pemToArrayBuffer(privateKeyPem),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const payload = base64url(JSON.stringify({
    iss: SERVICE_ACCOUNT_EMAIL,
    scope: SCOPE,
    aud: TOKEN_URL,
    iat: now,
    exp: now + 3600,
  }));

  const input = new TextEncoder().encode(`${header}.${payload}`);
  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, input);

  return `${header}.${payload}.${base64url(new Uint8Array(signature))}`;
}

// --- Token cache ---

let cachedToken: { token: string; expires: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expires) {
    return cachedToken.token;
  }

  const jwt = await createSignedJwt();
  const resp = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`Google token error: ${err}`);
  }

  const data = await resp.json();
  cachedToken = {
    token: data.access_token,
    expires: Date.now() + (data.expires_in - 60) * 1000,
  };
  return data.access_token;
}

// --- Public API ---

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

function isConfigured(): boolean {
  return Boolean(SERVICE_ACCOUNT_EMAIL && PRIVATE_KEY_RAW);
}

/** Check if a datetime string represents "no time" (midnight = T00:00) */
function isAllDay(dateStr: string): boolean {
  // "2026-03-15T00:00" or "2026-03-15T00:00:00"
  return /T00:00(:00)?$/.test(dateStr) || !dateStr.includes('T');
}

/** Build start/end objects for Google Calendar (all-day vs timed) */
function buildTimeSlot(dateStr: string) {
  if (isAllDay(dateStr)) {
    // All-day event: use "date" property with YYYY-MM-DD
    const dateOnly = dateStr.split('T')[0];
    return { date: dateOnly };
  }
  return { dateTime: toRFC3339(dateStr), timeZone: 'Europe/Paris' };
}

/** For all-day checkout, add one day (Google Calendar all-day end is exclusive) */
function buildEndSlot(dateStr: string, checkinStr: string) {
  if (isAllDay(dateStr)) {
    const dateOnly = dateStr.split('T')[0];
    const d = new Date(dateOnly + 'T12:00:00');
    d.setDate(d.getDate() + 1);
    const nextDay = d.toISOString().split('T')[0];
    // If checkin is also all-day, end is next day; otherwise keep timed
    if (isAllDay(checkinStr)) {
      return { date: nextDay };
    }
  }
  if (isAllDay(dateStr)) {
    const dateOnly = dateStr.split('T')[0];
    return { dateTime: `${dateOnly}T12:00:00`, timeZone: 'Europe/Paris' };
  }
  return { dateTime: toRFC3339(dateStr), timeZone: 'Europe/Paris' };
}

function buildDescription(input: CalendarEventInput): string {
  return [
    `Voyageur : ${input.voyageur}`,
    `Personnes : ${input.nb_personnes}`,
    input.telephone ? `Téléphone : ${input.telephone}` : '',
    input.commentaires ? `\nNotes : ${input.commentaires}` : '',
  ].filter(Boolean).join('\n');
}

export async function createCalendarEvent(input: CalendarEventInput): Promise<CalendarEventResult | null> {
  if (!isConfigured()) {
    console.warn('Google Calendar non configuré (VITE_GOOGLE_SERVICE_ACCOUNT_EMAIL / PRIVATE_KEY manquants)');
    return null;
  }

  try {
    const token = await getAccessToken();

    const event = {
      summary: `🏠 ${input.voyageur} (${input.nb_personnes} pers.)`,
      description: buildDescription(input),
      start: buildTimeSlot(input.date_checkin),
      end: buildEndSlot(input.date_checkout, input.date_checkin),
    };

    const resp = await fetch(`${CALENDAR_API}/calendars/${encodeURIComponent(CALENDAR_ID)}/events`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(event),
    });

    if (!resp.ok) {
      const err = await resp.text();
      console.error('Google Calendar API error:', err);
      return null;
    }

    const result = await resp.json();
    return { eventId: result.id };
  } catch (err) {
    console.error('Failed to create calendar event:', err);
    return null;
  }
}

export async function updateCalendarEvent(eventId: string, input: CalendarEventInput): Promise<void> {
  if (!isConfigured()) return;

  try {
    const token = await getAccessToken();

    const event = {
      summary: `🏠 ${input.voyageur} (${input.nb_personnes} pers.)`,
      description: buildDescription(input),
      start: buildTimeSlot(input.date_checkin),
      end: buildEndSlot(input.date_checkout, input.date_checkin),
    };

    const resp = await fetch(`${CALENDAR_API}/calendars/${encodeURIComponent(CALENDAR_ID)}/events/${eventId}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(event),
    });

    if (!resp.ok) {
      const err = await resp.text();
      console.error('Google Calendar update error:', err);
    }
  } catch (err) {
    console.error('Failed to update calendar event:', err);
  }
}

export async function deleteCalendarEvent(eventId: string): Promise<void> {
  if (!isConfigured()) return;

  try {
    const token = await getAccessToken();
    await fetch(`${CALENDAR_API}/calendars/${encodeURIComponent(CALENDAR_ID)}/events/${eventId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch (err) {
    console.error('Failed to delete calendar event:', err);
  }
}

// Ensure datetime string is RFC 3339 (Google API requirement)
function toRFC3339(dateStr: string): string {
  // If already has timezone info, return as-is
  if (dateStr.includes('+') || dateStr.endsWith('Z')) return dateStr;
  // datetime-local format: "2026-03-15T14:00" → add seconds
  if (dateStr.length === 16) return `${dateStr}:00`;
  return dateStr;
}
