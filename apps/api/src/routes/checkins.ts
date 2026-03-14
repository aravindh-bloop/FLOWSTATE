/**
 * Check-in routes
 *
 *   GET /api/clients/:clientId/checkins        paginated history
 *   GET /api/clients/:clientId/checkins/stats  aggregated stats
 */

import { Hono } from 'hono';
import { query, queryOne } from '../db.js';
import { requireAuth, requireCoachOrSelf } from '../middleware/require-auth.js';

export const checkInsRouter = new Hono();

checkInsRouter.use('*', requireAuth);

// GET /api/clients/:clientId/checkins
checkInsRouter.get('/', requireCoachOrSelf, async (c) => {
  const clientId = c.req.param('clientId');
  const page = Math.max(1, Number(c.req.query('page') ?? 1));
  const limit = Math.min(50, Math.max(1, Number(c.req.query('limit') ?? 20)));
  const offset = (page - 1) * limit;

  const rows = await query(`
    SELECT * FROM check_ins
    WHERE client_id = $1
    ORDER BY submitted_at DESC
    LIMIT $2 OFFSET $3
  `, [clientId, limit, offset]);

  const total = await queryOne<{ count: string }>(
    'SELECT COUNT(*)::text as count FROM check_ins WHERE client_id = $1',
    [clientId]
  );

  return c.json({
    data: rows,
    pagination: {
      page,
      limit,
      total: Number(total?.count ?? 0),
      pages: Math.ceil(Number(total?.count ?? 0) / limit),
    },
  });
});

// GET /api/clients/:clientId/checkins/stats
checkInsRouter.get('/stats', requireCoachOrSelf, async (c) => {
  const clientId = c.req.param('clientId');

  const stats = await queryOne(`
    SELECT
      COUNT(*)::int                              AS total_checkins,
      ROUND(AVG(adherence_score)::numeric, 2)   AS avg_adherence,
      ROUND(AVG(energy_rating)::numeric, 2)     AS avg_energy,
      ROUND(AVG(focus_rating)::numeric, 2)      AS avg_focus,
      ROUND(AVG(sleep_hours)::numeric, 2)       AS avg_sleep,
      ROUND(AVG(wearable_hrv)::numeric, 2)      AS avg_hrv,
      COUNT(*) FILTER (WHERE type = 'morning')::int AS morning_count,
      COUNT(*) FILTER (WHERE type = 'evening')::int AS evening_count
    FROM check_ins
    WHERE client_id = $1
  `, [clientId]);

  const trend7d = await query(`
    SELECT
      DATE(submitted_at)                        AS day,
      ROUND(AVG(adherence_score)::numeric, 2)   AS avg_adherence,
      ROUND(AVG(energy_rating)::numeric, 2)     AS avg_energy,
      ROUND(AVG(sleep_hours)::numeric, 2)       AS avg_sleep
    FROM check_ins
    WHERE client_id = $1 AND submitted_at > NOW() - INTERVAL '7 days'
    GROUP BY DATE(submitted_at)
    ORDER BY day ASC
  `, [clientId]);

  return c.json({ ...stats, trend7d });
});
