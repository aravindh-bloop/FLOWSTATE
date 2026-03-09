/**
 * Calendar hydrator job
 *
 * Runs every Monday midnight: seeds 14 calendar events per active client
 * (2 per day × 7 days) with type='checkin_scheduled'.
 *
 * Also exported as hydrateClientWeek() for use during onboarding.
 */

import { query } from '../db.js';

/** Seed a single client's check-in calendar events for the current week. */
export async function hydrateClientWeek(clientId: string): Promise<void> {
  const client = await query<{
    checkin_time_am: string;
    checkin_time_pm: string;
    full_name: string;
  }>(
    'SELECT checkin_time_am, checkin_time_pm, full_name FROM clients WHERE id = $1',
    [clientId]
  );
  if (!client[0]) return;

  const { checkin_time_am, checkin_time_pm, full_name } = client[0];

  // Build 14 events: 7 AM + 7 PM for current week starting Monday
  const events: Array<{ title: string; scheduled_at: string; type: string }> = [];

  for (let d = 0; d < 7; d++) {
    const dayOffset = d;
    // Calculate Monday of current week + day offset
    const amDate = `CURRENT_DATE + (1 - EXTRACT(DOW FROM CURRENT_DATE)::int % 7) + ${dayOffset}`;

    events.push(
      {
        title: `Morning Check-In — ${full_name}`,
        scheduled_at: `(${amDate})::date + '${checkin_time_am}'::time`,
        type: 'checkin_scheduled',
      },
      {
        title: `Evening Check-In — ${full_name}`,
        scheduled_at: `(${amDate})::date + '${checkin_time_pm}'::time`,
        type: 'checkin_scheduled',
      }
    );
  }

  // Use a raw query to insert all events in one shot
  await query(`
    INSERT INTO calendar_events (client_id, title, type, scheduled_at, status)
    SELECT
      $1,
      title,
      'checkin_scheduled',
      scheduled_at::timestamptz,
      'scheduled'
    FROM (VALUES ${events
      .map((_, i) => `($${i * 2 + 2}, $${i * 2 + 3}::timestamptz)`)
      .join(', ')}) AS t(title, scheduled_at)
    ON CONFLICT DO NOTHING
  `, [
    clientId,
    ...events.flatMap((e) => [e.title, e.scheduled_at]),
  ]);
}

/** Cron handler — runs every Monday midnight for all active clients. */
export async function runCalendarHydrator(): Promise<void> {
  console.log('[calendar-hydrator] Running for all active clients');

  const clients = await query<{ id: string }>(
    "SELECT id FROM clients WHERE status = 'active'"
  );

  await Promise.allSettled(clients.map((c) => hydrateClientWeek(c.id)));
  console.log(`[calendar-hydrator] Done — ${clients.length} clients hydrated`);
}
