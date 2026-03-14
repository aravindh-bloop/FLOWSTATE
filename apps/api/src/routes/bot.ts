/**
 * Bot-internal routes — called ONLY by the Discord bot.
 * All protected by BOT_INTERNAL_API_TOKEN (X-Bot-Token header).
 *
 *   GET   /api/bot/client-by-channel/:channelId   resolve client from Discord channel
 *   GET   /api/bot/client/:clientId                get client status (for slash commands)
 *   GET   /api/bot/client/:clientId/summaries      get client weekly summaries
 *   PATCH /api/bot/client/:clientId/pause          pause a client
 *   POST  /api/bot/checkin                         submit processed check-in
 *   POST  /api/bot/missed-checkin                  report missed check-in
 *   GET   /api/bot/pending-deliveries              approved interventions not yet sent
 *   PATCH /api/bot/delivered/:interventionId       confirm delivery
 *   GET   /api/bot/pending-reminders               clients due for AM/PM reminder now
 */

import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { query, queryOne } from '../db.js';
import { requireBot } from '../middleware/require-bot.js';
import { createDiscordChannels } from '../pipelines/provision.js';

export const botRouter = new Hono();

botRouter.use('*', requireBot);

// ─── GET /api/bot/client-by-channel/:channelId ────────────────────────────────
botRouter.get('/client-by-channel/:channelId', async (c) => {
  const client = await queryOne(`
    SELECT
      c.*,
      pp.phase_name, pp.month_theme,
      pp.target_wake_time AS pp_wake_time,
      pp.target_bedtime AS pp_bedtime,
      pp.target_caffeine_cutoff AS pp_caffeine,
      pp.morning_light_duration_min AS pp_light_min,
      pp.morning_exercise_time AS pp_exercise,
      pp.target_peak_window AS pp_peak_window
    FROM clients c
    JOIN program_phases pp ON pp.week_number = c.program_week
    WHERE c.discord_channel_id = $1 AND c.status = 'active'
  `, [c.req.param('channelId')]);

  if (!client) return c.json({ error: 'Client not found' }, 404);
  return c.json(client);
});

// ─── GET /api/bot/client/:clientId ──────────────────────────────────────────
// Used by bot slash commands (/status, /checkin) to get client info
botRouter.get('/client/:clientId', async (c) => {
  const client = await queryOne(`
    SELECT
      c.id, c.full_name, c.discord_user_id, c.discord_channel_id,
      c.program_week, c.program_day, c.status, c.chronotype,
      c.rolling_7d_adherence, c.consecutive_missed_checkins,
      c.last_checkin_at, c.intervention_flag,
      c.target_wake_time, c.target_bedtime, c.target_caffeine_cutoff,
      c.morning_light_duration_min, c.morning_exercise_time, c.target_peak_window
    FROM clients c
    WHERE c.id = $1
  `, [c.req.param('clientId')]);

  if (!client) return c.json({ error: 'Client not found' }, 404);
  return c.json(client);
});

// ─── GET /api/bot/client/:clientId/summaries ────────────────────────────────
// Used by bot /summary slash command
botRouter.get('/client/:clientId/summaries', async (c) => {
  const rows = await query(
    'SELECT * FROM weekly_summaries WHERE client_id = $1 ORDER BY week_number DESC',
    [c.req.param('clientId')]
  );
  return c.json(rows);
});

// ─── PATCH /api/bot/client/:clientId/pause ──────────────────────────────────
// Used by bot /pause slash command
botRouter.patch('/client/:clientId/pause', async (c) => {
  const updated = await queryOne(
    "UPDATE clients SET status = 'paused', updated_at = now() WHERE id = $1 RETURNING id, status",
    [c.req.param('clientId')]
  );
  if (!updated) return c.json({ error: 'Client not found' }, 404);
  return c.json(updated);
});

// ─── POST /api/bot/checkin ────────────────────────────────────────────────────
const checkinSchema = z.object({
  client_id: z.string().uuid(),
  discord_message_id: z.string(),
  type: z.enum(['morning', 'evening', 'wearable']),
  photo_url: z.string().url().optional(),
  client_note: z.string().optional(),
  ai_analysis: z.string().optional(),
  ai_model_used: z.string().optional(),
  adherence_score: z.number().min(0).max(100).optional(),
  exercise_completed: z.boolean().optional(),
  morning_light_completed: z.boolean().optional(),
  caffeine_cutoff_met: z.boolean().optional(),
  wake_time_actual: z.string().optional(),
  sleep_hours: z.number().optional(),
  energy_rating: z.number().int().min(1).max(10).optional(),
  focus_rating: z.number().int().min(1).max(10).optional(),
  wearable_hrv: z.number().optional(),
  wearable_recovery_score: z.number().int().optional(),
  wearable_sleep_score: z.number().int().optional(),
  program_week: z.number().int(),
  program_day: z.number().int(),
});

botRouter.post('/checkin', zValidator('json', checkinSchema), async (c) => {
  const data = c.req.valid('json');

  // Insert check-in row
  const [checkin] = await query<{ id: string }>(`
    INSERT INTO check_ins (
      client_id, discord_message_id, type, photo_url, client_note,
      ai_analysis, ai_model_used, adherence_score,
      exercise_completed, morning_light_completed, caffeine_cutoff_met,
      wake_time_actual, sleep_hours, energy_rating, focus_rating,
      wearable_hrv, wearable_recovery_score, wearable_sleep_score,
      program_week, program_day
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11,
      $12, $13, $14, $15, $16, $17, $18, $19, $20
    ) RETURNING id
  `, [
    data.client_id, data.discord_message_id, data.type,
    data.photo_url ?? null, data.client_note ?? null,
    data.ai_analysis ?? null, data.ai_model_used ?? null, data.adherence_score ?? null,
    data.exercise_completed ?? null, data.morning_light_completed ?? null,
    data.caffeine_cutoff_met ?? null, data.wake_time_actual ?? null,
    data.sleep_hours ?? null, data.energy_rating ?? null, data.focus_rating ?? null,
    data.wearable_hrv ?? null, data.wearable_recovery_score ?? null,
    data.wearable_sleep_score ?? null, data.program_week, data.program_day,
  ]);

  // Mark matching calendar event as completed (use subquery since PostgreSQL doesn't support LIMIT in UPDATE)
  await query(`
    UPDATE calendar_events
    SET status = 'completed', completed_at = now(), linked_checkin_id = $1
    WHERE id = (
      SELECT id FROM calendar_events
      WHERE client_id = $2
        AND type = 'checkin_scheduled'
        AND status = 'scheduled'
        AND DATE(scheduled_at) = CURRENT_DATE
        AND (
          ($3 = 'morning' AND EXTRACT(HOUR FROM scheduled_at) < 12)
          OR ($3 = 'evening' AND EXTRACT(HOUR FROM scheduled_at) >= 12)
          OR $3 = 'wearable'
        )
      LIMIT 1
    )
  `, [checkin.id, data.client_id, data.type]);

  // Update last_checkin_at + reset missed counter + update streak
  // Streak: if last check-in was yesterday or today, increment; otherwise reset to 1
  const updatedClient = await queryOne<{ streak_count: number }>(`
    UPDATE clients
    SET last_checkin_at = now(),
        consecutive_missed_checkins = 0,
        streak_count = CASE
          WHEN last_checkin_at IS NULL THEN 1
          WHEN DATE(last_checkin_at) = CURRENT_DATE THEN GREATEST(streak_count, 1)
          WHEN DATE(last_checkin_at) = CURRENT_DATE - 1 THEN streak_count + 1
          ELSE 1
        END,
        updated_at = now()
    WHERE id = $1
    RETURNING streak_count
  `, [data.client_id]);

  // Run alert pipeline asynchronously (don't await — don't block bot response)
  const { runAlertPipeline } = await import('../pipelines/alert.js');
  runAlertPipeline(data.client_id).catch(console.error);

  return c.json({ checkinId: checkin.id, streak: updatedClient?.streak_count ?? 0 }, 201);
});

// ─── POST /api/bot/missed-checkin ─────────────────────────────────────────────
const missedSchema = z.object({
  client_id: z.string().uuid(),
  type: z.enum(['morning', 'evening']),
});

botRouter.post('/missed-checkin', zValidator('json', missedSchema), async (c) => {
  const { client_id, type } = c.req.valid('json');

  await query(`
    UPDATE clients
    SET consecutive_missed_checkins = consecutive_missed_checkins + 1, updated_at = now()
    WHERE id = $1
  `, [client_id]);

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
  `, [client_id, type]);

  const { runAlertPipeline } = await import('../pipelines/alert.js');
  runAlertPipeline(client_id).catch(console.error);

  return c.body(null, 204);
});

// ─── GET /api/bot/pending-deliveries ─────────────────────────────────────────
botRouter.get('/pending-deliveries', async (c) => {
  const rows = await query(`
    SELECT i.id, i.client_id, i.final_message, c.discord_channel_id
    FROM interventions i
    JOIN clients c ON c.id = i.client_id
    WHERE i.status = 'approved'
      AND i.final_message IS NOT NULL
      AND c.discord_channel_id IS NOT NULL
    ORDER BY i.approved_at ASC
  `);
  return c.json(rows);
});

// ─── PATCH /api/bot/delivered/:interventionId ────────────────────────────────
const deliveredSchema = z.object({
  discord_message_id: z.string(),
});

botRouter.patch('/delivered/:interventionId', zValidator('json', deliveredSchema), async (c) => {
  const { discord_message_id } = c.req.valid('json');
  await query(`
    UPDATE interventions
    SET status = 'sent', discord_message_id = $1, sent_at = now()
    WHERE id = $2
  `, [discord_message_id, c.req.param('interventionId')]);

  // Clear intervention_flag if no more pending interventions for this client
  const intervention = await queryOne<{ client_id: string }>(
    'SELECT client_id FROM interventions WHERE id = $1',
    [c.req.param('interventionId')]
  );
  if (intervention) {
    const pending = await queryOne<{ count: string }>(
      "SELECT COUNT(*)::text AS count FROM interventions WHERE client_id = $1 AND status = 'pending'",
      [intervention.client_id]
    );
    if (Number(pending?.count ?? 0) === 0) {
      await query('UPDATE clients SET intervention_flag = false WHERE id = $1', [intervention.client_id]);
    }
  }

  return c.body(null, 204);
});

// ─── GET /api/bot/pending-reminders ──────────────────────────────────────────
// Bot polls this to know which clients need a reminder sent right now.
botRouter.get('/pending-reminders', async (c) => {
  const type = (c.req.query('type') ?? 'morning') as 'morning' | 'evening';
  const field = type === 'morning' ? 'checkin_time_am' : 'checkin_time_pm';

  const rows = await query(`
    SELECT
      c.id, c.full_name, c.discord_channel_id, c.program_week, c.program_day,
      c.target_wake_time, c.target_bedtime, c.target_caffeine_cutoff,
      c.morning_light_duration_min, c.morning_exercise_time, c.target_peak_window,
      pp.checkin_prompt_am, pp.checkin_prompt_pm
    FROM clients c
    JOIN program_phases pp ON pp.week_number = c.program_week
    WHERE c.status = 'active'
      AND c.${field}::time BETWEEN
            (NOW()::time - INTERVAL '7 minutes') AND
            (NOW()::time + INTERVAL '7 minutes')
      AND c.discord_channel_id IS NOT NULL
  `);

  return c.json({ type, clients: rows });
});

// ─── POST /api/bot/verify ───────────────────────────────────────────────────
const verifySchema = z.object({
  discord_user_id: z.string(),
  discord_username: z.string(),
  verification_code: z.string(),
});

botRouter.post('/verify', zValidator('json', verifySchema), async (c) => {
  const { discord_user_id, verification_code } = c.req.valid('json');

  // Find client with this code and pending status
  const client = await queryOne<{ id: string; full_name: string }>(
    "SELECT id, full_name FROM clients WHERE discord_verification_code = $1 AND status = 'pending'",
    [verification_code]
  );

  if (!client) {
    return c.json({ success: false, error: 'Invalid or expired verification code.' }, 404);
  }

  // Update client status and Discord details
  // Note: clients table does not have a discord_username column
  await query(
    `UPDATE clients
     SET discord_user_id = $1,
         status = 'active',
         discord_verification_code = NULL,
         updated_at = now()
     WHERE id = $2`,
    [discord_user_id, client.id]
  );

  // Trigger Discord channel creation
  const firstName = client.full_name.split(' ')[0] ?? client.full_name;
  try {
    const discordChannelId = await createDiscordChannels(client.id, firstName, discord_user_id);
    if (discordChannelId) {
      await query('UPDATE clients SET discord_channel_id = $1 WHERE id = $2', [
        discordChannelId,
        client.id,
      ]);
      return c.json({
        success: true,
        client_id: client.id,
        full_name: client.full_name,
        discord_channel_id: discordChannelId
      });
    } else {
      return c.json({ success: true, client_id: client.id, full_name: client.full_name, warning: 'Discord channels could not be created automatically.' });
    }
  } catch (err) {
    console.error('[bot-verify] Discord provisioning failed:', err);
    return c.json({ success: true, client_id: client.id, full_name: client.full_name, error: 'User verified, but Discord channel creation failed. Please contact coach.' });
  }
});
