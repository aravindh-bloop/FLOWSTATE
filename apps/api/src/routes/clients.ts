/**
 * Client routes
 *
 *   GET    /api/clients                 coach — all active clients
 *   GET    /api/clients/:id             coach | own_client
 *   POST   /api/clients/onboard         coach — full onboarding flow
 *   PATCH  /api/clients/:id             coach — update config/targets
 *   PATCH  /api/clients/:id/status      coach — set status
 */

import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { query, queryOne } from '../db.js';
import { requireAuth, requireCoach, requireCoachOrSelf } from '../middleware/require-auth.js';

export const clientsRouter = new Hono();

clientsRouter.use('*', requireAuth);

// ─── GET /api/clients ─────────────────────────────────────────────────────────
clientsRouter.get('/', requireCoach, async (c) => {
  const clients = await query(`
    SELECT
      c.id, c.full_name, c.discord_user_id, c.discord_channel_id,
      c.affine_workspace_id, c.program_start_date, c.program_end_date,
      c.program_week, c.program_day, c.status, c.chronotype,
      c.primary_goal, c.rolling_7d_adherence, c.consecutive_missed_checkins,
      c.last_checkin_at, c.intervention_flag,
      c.checkin_time_am, c.checkin_time_pm,
      c.target_wake_time, c.target_bedtime, c.target_caffeine_cutoff,
      c.morning_light_duration_min, c.morning_exercise_time, c.target_peak_window,
      u.email, u.name as user_name
    FROM clients c
    JOIN users u ON u.id = c.user_id
    ORDER BY c.rolling_7d_adherence ASC
  `);
  return c.json(clients);
});

// ─── GET /api/clients/:id ─────────────────────────────────────────────────────
clientsRouter.get('/:id', requireCoachOrSelf, async (c) => {
  const client = await queryOne(`
    SELECT c.*, u.email, u.name as user_name
    FROM clients c
    JOIN users u ON u.id = c.user_id
    WHERE c.id = $1
  `, [c.req.param('id')]);

  if (!client) return c.json({ error: 'Not found' }, 404);
  return c.json(client);
});

// ─── POST /api/clients/onboard ────────────────────────────────────────────────
const onboardSchema = z.object({
  full_name: z.string().min(1),
  email: z.string().email(),
  program_start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  meq_score: z.number().int().min(16).max(86),
  primary_goal: z.string().optional(),
  signature_focus_areas: z.array(z.string()).optional(),
  onboarding_responses: z.record(z.unknown()).optional(),
  discord_user_id: z.string().optional(),
  checkin_time_am: z.string().default('06:30'),
  checkin_time_pm: z.string().default('20:00'),
});

clientsRouter.post('/onboard', requireCoach, zValidator('json', onboardSchema), async (c) => {
  const data = c.req.valid('json');
  const coach = c.get('user');

  // Derive chronotype from MEQ score
  const chronotype =
    data.meq_score < 42 ? 'Evening'
    : data.meq_score <= 58 ? 'Intermediate'
    : 'Morning';

  // Fetch Week 1 targets from program_phases
  const phase1 = await queryOne<{
    target_wake_time: string;
    target_bedtime: string;
    target_caffeine_cutoff: string;
    morning_light_duration_min: number;
    morning_exercise_time: string;
    target_peak_window: string;
  }>('SELECT * FROM program_phases WHERE week_number = 1');

  if (!phase1) return c.json({ error: 'program_phases not seeded' }, 500);

  // Create BetterAuth user (password = random, invite email would follow)
  const tempPassword = Math.random().toString(36).slice(-12) + 'A1!';

  const signUpReq = new Request(
    new URL('/api/auth/sign-up/email', c.req.url).toString(),
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: data.email,
        password: tempPassword,
        name: data.full_name,
        role: 'client',
      }),
    }
  );
  const { auth } = await import('../auth.js');
  const signUpRes = await auth.handler(signUpReq);
  if (!signUpRes.ok) {
    const body = await signUpRes.json().catch(() => ({})) as { message?: string };
    return c.json({ error: body.message ?? 'Failed to create user' }, 400);
  }
  const signUpData = await signUpRes.json() as { user: { id: string } };
  const userId = signUpData.user.id;

  // Create clients row
  const [client] = await query<{ id: string }>(`
    INSERT INTO clients (
      user_id, coach_id, full_name, discord_user_id,
      program_start_date, chronotype, meq_score,
      primary_goal, signature_focus_areas, onboarding_responses,
      target_wake_time, target_bedtime, target_caffeine_cutoff,
      morning_light_duration_min, morning_exercise_time, target_peak_window,
      checkin_time_am, checkin_time_pm, status
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
      $11, $12, $13, $14, $15, $16, $17, $18, 'pending'
    ) RETURNING id
  `, [
    userId, coach.id, data.full_name, data.discord_user_id ?? null,
    data.program_start_date, chronotype, data.meq_score,
    data.primary_goal ?? null,
    JSON.stringify(data.signature_focus_areas ?? []),
    JSON.stringify(data.onboarding_responses ?? {}),
    phase1.target_wake_time, phase1.target_bedtime, phase1.target_caffeine_cutoff,
    phase1.morning_light_duration_min, phase1.morning_exercise_time, phase1.target_peak_window,
    data.checkin_time_am, data.checkin_time_pm,
  ]);

  // Notify bot to provision Discord channel + send welcome message
  // Bot provisioning happens via the bot service on startup / via internal API
  // Set status active
  await query('UPDATE clients SET status = $1 WHERE id = $2', ['active', client.id]);

  // Hydrate first week's calendar events
  const { hydrateClientWeek } = await import('../jobs/calendar-hydrate.js');
  await hydrateClientWeek(client.id);

  // Notification for coach
  await query(`
    INSERT INTO notifications (user_id, type, title, body, linked_entity_type, linked_entity_id)
    VALUES ($1, 'coach_alert', $2, $3, 'client', $4)
  `, [
    coach.id,
    `New client: ${data.full_name}`,
    `${data.full_name} has been onboarded and is now active.`,
    client.id,
  ]);

  return c.json({ id: client.id, userId, chronotype }, 201);
});

// ─── PATCH /api/clients/:id ───────────────────────────────────────────────────
const updateSchema = z.object({
  target_wake_time: z.string().optional(),
  target_bedtime: z.string().optional(),
  target_caffeine_cutoff: z.string().optional(),
  morning_light_duration_min: z.number().int().optional(),
  morning_exercise_time: z.string().optional(),
  target_peak_window: z.string().optional(),
  checkin_time_am: z.string().optional(),
  checkin_time_pm: z.string().optional(),
  primary_goal: z.string().optional(),
  discord_user_id: z.string().optional(),
  discord_channel_id: z.string().optional(),
  affine_workspace_id: z.string().optional(),
}).strict();

clientsRouter.patch('/:id', requireCoach, zValidator('json', updateSchema), async (c) => {
  const updates = c.req.valid('json');
  const entries = Object.entries(updates).filter(([, v]) => v !== undefined);
  if (entries.length === 0) return c.json({ error: 'No fields to update' }, 400);

  const setClauses = entries.map(([k], i) => `${k} = $${i + 2}`).join(', ');
  const values = entries.map(([, v]) => v);

  const updated = await queryOne(
    `UPDATE clients SET ${setClauses}, updated_at = now() WHERE id = $1 RETURNING *`,
    [c.req.param('id'), ...values]
  );
  if (!updated) return c.json({ error: 'Not found' }, 404);
  return c.json(updated);
});

// ─── PATCH /api/clients/:id/status ───────────────────────────────────────────
const statusSchema = z.object({
  status: z.enum(['pending', 'active', 'paused', 'completed']),
});

clientsRouter.patch('/:id/status', requireCoach, zValidator('json', statusSchema), async (c) => {
  const { status } = c.req.valid('json');
  const updated = await queryOne(
    'UPDATE clients SET status = $1, updated_at = now() WHERE id = $2 RETURNING id, status',
    [status, c.req.param('id')]
  );
  if (!updated) return c.json({ error: 'Not found' }, 404);
  return c.json(updated);
});
