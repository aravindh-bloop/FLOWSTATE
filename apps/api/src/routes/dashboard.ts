/**
 * Dashboard routes
 *
 *   GET /api/dashboard/coach   all clients with adherence + flags
 *   GET /api/dashboard/client  own KPIs + recent check-ins + upcoming events
 */

import { Hono } from 'hono';
import { query, queryOne } from '../db.js';
import { requireAuth, requireCoach } from '../middleware/require-auth.js';

export const dashboardRouter = new Hono();

dashboardRouter.use('*', requireAuth);

// GET /api/dashboard/coach
dashboardRouter.get('/coach', requireCoach, async (c) => {
  const clients = await query(`
    SELECT
      c.id, c.full_name, c.status, c.chronotype, c.program_week, c.program_day,
      c.rolling_7d_adherence, c.consecutive_missed_checkins, c.streak_count,
      c.last_checkin_at, c.intervention_flag,
      c.target_wake_time, c.target_bedtime, c.target_caffeine_cutoff,
      c.target_peak_window,
      u.email,
      (SELECT COUNT(*) FROM interventions i WHERE i.client_id = c.id AND i.status = 'pending')::int AS pending_interventions
    FROM clients c
    JOIN users u ON u.id = c.user_id
    WHERE c.status IN ('active', 'paused')
    ORDER BY c.rolling_7d_adherence ASC, c.consecutive_missed_checkins DESC
  `);

  const stats = await queryOne(`
    SELECT
      COUNT(*) FILTER (WHERE status = 'active')::int   AS active_clients,
      COUNT(*) FILTER (WHERE status = 'paused')::int   AS paused_clients,
      COUNT(*) FILTER (WHERE intervention_flag = true)::int AS flagged_clients,
      ROUND(AVG(rolling_7d_adherence)::numeric, 2)     AS avg_adherence
    FROM clients
    WHERE status IN ('active', 'paused')
  `);

  const pendingInterventions = await queryOne(
    "SELECT COUNT(*)::int AS count FROM interventions WHERE status = 'pending'"
  );

  return c.json({
    clients,
    stats,
    pending_interventions: (pendingInterventions as { count: number } | null)?.count ?? 0,
  });
});

// GET /api/dashboard/client
dashboardRouter.get('/client', async (c) => {
  const user = c.get('user');

  const client = await queryOne<{ id: string; program_week: number }>(`
    SELECT c.*, pp.phase_name, pp.month_theme,
           pp.checkin_prompt_am, pp.checkin_prompt_pm
    FROM clients c
    JOIN program_phases pp ON pp.week_number = c.program_week
    WHERE c.user_id = $1
  `, [user.id]);

  if (!client) return c.json({ error: 'Client profile not found' }, 404);

  const recentCheckIns = await query(`
    SELECT id, type, submitted_at, adherence_score, energy_rating,
           focus_rating, sleep_hours, ai_analysis, photo_url
    FROM check_ins
    WHERE client_id = $1
    ORDER BY submitted_at DESC
    LIMIT 3
  `, [client.id]);

  const upcomingEvents = await query(`
    SELECT * FROM calendar_events
    WHERE client_id = $1 AND scheduled_at > NOW() AND status = 'scheduled'
    ORDER BY scheduled_at ASC
    LIMIT 5
  `, [client.id]);

  const weekStats = await queryOne(`
    SELECT
      COUNT(*)::int                           AS total_this_week,
      ROUND(AVG(adherence_score)::numeric, 2) AS avg_adherence,
      ROUND(AVG(energy_rating)::numeric, 2)   AS avg_energy,
      ROUND(AVG(sleep_hours)::numeric, 2)     AS avg_sleep
    FROM check_ins
    WHERE client_id = $1
      AND submitted_at >= DATE_TRUNC('week', NOW())
  `, [client.id]);

  return c.json({ client, recentCheckIns, upcomingEvents, weekStats });
});
