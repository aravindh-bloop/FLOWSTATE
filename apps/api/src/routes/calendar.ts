/**
 * Calendar routes
 *
 *   GET   /api/clients/:clientId/calendar          all events for client
 *   PATCH /api/calendar/:eventId/reschedule        reschedule a missed check-in
 */

import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { query, queryOne } from '../db.js';
import { requireAuth, requireCoach, requireCoachOrSelf } from '../middleware/require-auth.js';

export const calendarRouter = new Hono();

calendarRouter.use('*', requireAuth);

// GET /api/clients/:clientId/calendar
calendarRouter.get('/', requireCoachOrSelf, async (c) => {
  const clientId = c.req.param('clientId');
  const from = c.req.query('from');
  const to = c.req.query('to');

  const events = await query(`
    SELECT
      ce.*,
      ci.ai_analysis, ci.adherence_score, ci.energy_rating, ci.focus_rating
    FROM calendar_events ce
    LEFT JOIN check_ins ci ON ci.id = ce.linked_checkin_id
    WHERE ce.client_id = $1
      ${from ? "AND ce.scheduled_at >= $2::timestamptz" : ''}
      ${to ? `AND ce.scheduled_at <= $${from ? 3 : 2}::timestamptz` : ''}
    ORDER BY ce.scheduled_at ASC
  `, [clientId, ...(from ? [from] : []), ...(to ? [to] : [])]);

  return c.json(events);
});

// PATCH /api/calendar/:eventId/reschedule
const rescheduleSchema = z.object({
  scheduled_at: z.string().datetime(),
});

calendarRouter.patch('/:eventId/reschedule', requireCoach, zValidator('json', rescheduleSchema), async (c) => {
  const { scheduled_at } = c.req.valid('json');
  const updated = await queryOne(`
    UPDATE calendar_events
    SET status = 'rescheduled', rescheduled_to = $1, updated_at = now()
    WHERE id = $2
    RETURNING *
  `, [scheduled_at, c.req.param('eventId')]);

  if (!updated) return c.json({ error: 'Not found' }, 404);
  return c.json(updated);
});
