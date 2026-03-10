/**
 * Weekly summary routes
 *
 *   GET   /api/clients/:clientId/summaries
 *   PATCH /api/summaries/:id/notes
 */

import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { query, queryOne } from '../db.js';
import { requireAuth, requireCoach, requireCoachOrSelf } from '../middleware/require-auth.js';

export const summariesRouter = new Hono();

summariesRouter.use('*', requireAuth);

// GET /api/clients/:clientId/summaries
summariesRouter.get('/:clientId/summaries', requireCoachOrSelf, async (c) => {
  const rows = await query(
    'SELECT * FROM weekly_summaries WHERE client_id = $1 ORDER BY week_number DESC',
    [c.req.param('clientId')]
  );
  return c.json(rows);
});

// PATCH /api/summaries/:id/notes
const notesSchema = z.object({ coach_notes: z.string() });

summariesRouter.patch('/:id/notes', requireCoach, zValidator('json', notesSchema), async (c) => {
  const { coach_notes } = c.req.valid('json');
  const updated = await queryOne(
    'UPDATE weekly_summaries SET coach_notes = $1 WHERE id = $2 RETURNING *',
    [coach_notes, c.req.param('id')]
  );
  if (!updated) return c.json({ error: 'Not found' }, 404);
  return c.json(updated);
});
