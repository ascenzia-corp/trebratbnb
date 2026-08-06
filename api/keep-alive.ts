// Vercel Serverless Function — pinged by a Vercel Cron Job (see vercel.json).
// Its only job is to send a lightweight request to Supabase on a schedule so the
// free-tier project is never considered "inactive" and paused after 7 days.
//
// It reads the same environment variables the frontend already uses
// (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY), so no extra configuration is
// needed as long as those are set in the Vercel project.

export default async function handler(_req: unknown, res: any) {
  const url =
    process.env.VITE_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    'https://pqhefgzcbohkjuwberhr.supabase.co';
  const key = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

  if (!key) {
    res.status(500).json({ ok: false, error: 'Missing Supabase anon key env var' });
    return;
  }

  const pingedAt = new Date().toISOString();

  try {
    // A tiny read against the REST API. Any request reaching the project counts
    // as activity — we don't care about the rows, just that the call succeeds.
    const response = await fetch(`${url}/rest/v1/reservations?select=id&limit=1`, {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
      },
    });

    // Logged so each run is visible in Vercel's runtime logs — this is how we
    // confirm the cron actually fires (and catch a paused project early).
    const healthy = response.status === 200;
    console.log(
      `[keep-alive] ${pingedAt} supabaseStatus=${response.status} ${healthy ? 'OK' : 'UNEXPECTED — project may be paused'}`
    );

    res.status(200).json({ ok: healthy, supabaseStatus: response.status, pingedAt });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[keep-alive] ${pingedAt} FAILED — ${message}`);
    res.status(200).json({ ok: false, error: message, pingedAt });
  }
}
