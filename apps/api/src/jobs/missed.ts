/**
 * Missed check-in detector (0 * * * *)
 *
 * Runs hourly. For each active client checks if a scheduled
 * check-in window passed >2 hours ago with no matching check-in row.
 * If missed: increments consecutive_missed_checkins, marks calendar event,
 * runs alert pipeline.
 */

import { query, queryOne } from '../db.js';
import { runAlertPipeline } from '../pipelines/alert.js';

export async function runMissedCheckinDetector(): Promise<void> {
  console.log('[missed-detector] Running');

  const clients = await query<{
    id: string;
    checkin_time_am: string;
    checkin_time_pm: string;
  }>(
    "SELECT id, checkin_time_am, checkin_time_pm FROM clients WHERE status = 'active'"
  );

  for (const client of clients) {
    await checkForMissedCheckIn(client.id, client.checkin_time_am, 'morning');
    await checkForMissedCheckIn(client.id, client.checkin_time_pm, 'evening');
  }
}

async function checkForMissedCheckIn(
  clientId: string,
  scheduledTime: string, // "HH:MM:SS"
  type: 'morning' | 'evening'
): Promise<void> {
  // Only run if the scheduled window was more than 2 hours ago
  const [hh, mm] = scheduledTime.split(':').map(Number);
  const scheduled = new Date();
  scheduled.setHours(hh, mm, 0, 0);
  const twoHoursAfter = new Date(scheduled.getTime() + 2 * 60 * 60 * 1000);

  if (new Date() < twoHoursAfter) return; // window hasn't passed yet

  // Check if a check-in was already submitted today for this type
  const existing = await queryOne<{ id: string }>(`
    SELECT id FROM check_ins
    WHERE client_id = $1
      AND type = $2
      AND DATE(submitted_at) = CURRENT_DATE
    LIMIT 1
  `, [clientId, type]);

  if (existing) return; // check-in was received — no action

  // Check if we already marked this as missed today (avoid double increment)
  const alreadyMissed = await queryOne<{ id: string }>(`
    SELECT id FROM calendar_events
    WHERE client_id = $1
      AND type = 'checkin_scheduled'
      AND status = 'missed'
      AND DATE(scheduled_at) = CURRENT_DATE
      AND (
        ($2 = 'morning' AND EXTRACT(HOUR FROM scheduled_at) < 12)
        OR ($2 = 'evening' AND EXTRACT(HOUR FROM scheduled_at) >= 12)
      )
    LIMIT 1
  `, [clientId, type]);

  if (alreadyMissed) return;

  console.log(`[missed-detector] Missed ${type} check-in for client ${clientId}`);

  // Increment missed counter
  await query(`
    UPDATE clients
    SET consecutive_missed_checkins = consecutive_missed_checkins + 1, updated_at = now()
    WHERE id = $1
  `, [clientId]);

  // Mark calendar event as missed
  await query(`
    UPDATE calendar_events
    SET status = 'missed'
    WHERE client_id = $1
      AND type = 'checkin_scheduled'
      AND status = 'scheduled'
      AND DATE(scheduled_at) = CURRENT_DATE
      AND (
        ($2 = 'morning' AND EXTRACT(HOUR FROM scheduled_at) < 12)
        OR ($2 = 'evening' AND EXTRACT(HOUR FROM scheduled_at) >= 12)
      )
  `, [clientId, type]);

  // Run alert pipeline
  await runAlertPipeline(clientId).catch((err) =>
    console.error('[missed-detector] Alert pipeline error:', err)
  );
}
