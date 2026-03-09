/**
 * Intervention routes
 *
 *   GET   /api/interventions                     coach — all pending
 *   GET   /api/clients/:clientId/interventions   coach | own_client
 *   POST  /api/interventions/manual              coach — create manual
 *   PATCH /api/interventions/:id/approve         coach
 *   PATCH /api/interventions/:id/edit            coach
 *   PATCH /api/interventions/:id/dismiss         coach
 */

import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { query, queryOne } from '../db.js';
import { requireAuth, requireCoach, requireCoachOrSelf } from '../middleware/require-auth.js';

export const interventionsRouter = new Hono();

interventionsRouter.use('*', requireAuth);

// GET /api/interventions  (all pending across all clients)
interventionsRouter.get('/', requireCoach, async (c) => {
  const rows = await query(`
    SELECT
      i.*,
      c.full_name AS client_name,
      c.discord_channel_id,
      it.name AS template_name
    FROM interventions i
    JOIN clients c ON c.id = i.client_id
    LEFT JOIN intervention_templates it ON it.id = i.template_id
    WHERE i.status IN ('pending', 'approved')
    ORDER BY i.created_at DESC
  `);
  return c.json(rows);
});

// GET /api/clients/:clientId/interventions
interventionsRouter.get('/client/:clientId', requireCoachOrSelf, async (c) => {
  const rows = await query(`
    SELECT i.*, it.name AS template_name
    FROM interventions i
    LEFT JOIN intervention_templates it ON it.id = i.template_id
    WHERE i.client_id = $1
    ORDER BY i.created_at DESC
  `, [c.req.param('clientId')]);
  return c.json(rows);
});

// POST /api/interventions/manual
const manualSchema = z.object({
  client_id: z.string().uuid(),
  draft_message: z.string().min(1),
  trigger_data: z.record(z.unknown()).optional(),
});

interventionsRouter.post('/manual', requireCoach, zValidator('json', manualSchema), async (c) => {
  const coach = c.get('user');
  const { client_id, draft_message, trigger_data } = c.req.valid('json');

  const [row] = await query(`
    INSERT INTO interventions
      (client_id, coach_id, trigger_condition, trigger_data, draft_message, status)
    VALUES ($1, $2, 'manual', $3, $4, 'pending')
    RETURNING *
  `, [client_id, coach.id, JSON.stringify(trigger_data ?? {}), draft_message]);

  return c.json(row, 201);
});

// PATCH /api/interventions/:id/approve
interventionsRouter.patch('/:id/approve', requireCoach, async (c) => {
  const id = c.req.param('id');
  const current = await queryOne<{ draft_message: string; final_message: string | null }>(
    'SELECT draft_message, final_message FROM interventions WHERE id = $1',
    [id]
  );
  if (!current) return c.json({ error: 'Not found' }, 404);

  const updated = await queryOne(`
    UPDATE interventions
    SET
      status = 'approved',
      final_message = COALESCE(final_message, draft_message),
      approved_at = now()
    WHERE id = $1
    RETURNING *
  `, [id]);

  return c.json(updated);
});

// PATCH /api/interventions/:id/edit
const editSchema = z.object({ final_message: z.string().min(1) });

interventionsRouter.patch('/:id/edit', requireCoach, zValidator('json', editSchema), async (c) => {
  const { final_message } = c.req.valid('json');
  const updated = await queryOne(`
    UPDATE interventions
    SET final_message = $1, status = 'modified'
    WHERE id = $2
    RETURNING *
  `, [final_message, c.req.param('id')]);

  if (!updated) return c.json({ error: 'Not found' }, 404);
  return c.json(updated);
});

// PATCH /api/interventions/:id/dismiss
interventionsRouter.patch('/:id/dismiss', requireCoach, async (c) => {
  const updated = await queryOne(`
    UPDATE interventions SET status = 'dismissed' WHERE id = $1 RETURNING id, status
  `, [c.req.param('id')]);
  if (!updated) return c.json({ error: 'Not found' }, 404);
  return c.json(updated);
});
