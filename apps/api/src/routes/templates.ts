/**
 * Intervention template routes (coach only)
 *
 *   GET    /api/templates
 *   POST   /api/templates
 *   GET    /api/templates/:id
 *   PATCH  /api/templates/:id
 *   DELETE /api/templates/:id    soft delete (active = false)
 */

import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { query, queryOne } from '../db.js';
import { requireAuth, requireCoach } from '../middleware/require-auth.js';

export const templatesRouter = new Hono();

templatesRouter.use('*', requireAuth, requireCoach);

const templateSchema = z.object({
  code: z.string().min(1).optional(),
  trigger_condition: z.string(),
  name: z.string().min(1),
  message_template: z.string().min(1),
  variables: z.array(z.string()).optional(),
});

templatesRouter.get('/', async (c) => {
  const rows = await query(
    'SELECT * FROM intervention_templates WHERE active = true ORDER BY code'
  );
  return c.json(rows);
});

templatesRouter.post('/', zValidator('json', templateSchema), async (c) => {
  const data = c.req.valid('json');
  const [row] = await query(`
    INSERT INTO intervention_templates (code, trigger_condition, name, message_template, variables)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *
  `, [
    data.code ?? `CUSTOM-${Date.now()}`,
    data.trigger_condition,
    data.name,
    data.message_template,
    JSON.stringify(data.variables ?? []),
  ]);
  return c.json(row, 201);
});

templatesRouter.get('/:id', async (c) => {
  const row = await queryOne(
    'SELECT * FROM intervention_templates WHERE id = $1',
    [c.req.param('id')]
  );
  if (!row) return c.json({ error: 'Not found' }, 404);
  return c.json(row);
});

templatesRouter.patch('/:id', zValidator('json', templateSchema.partial()), async (c) => {
  const data = c.req.valid('json');
  const entries = Object.entries(data).filter(([, v]) => v !== undefined);
  if (entries.length === 0) return c.json({ error: 'Nothing to update' }, 400);

  const setClauses = entries.map(([k], i) => `${k} = $${i + 2}`).join(', ');
  const values = entries.map(([, v]) => v);

  const updated = await queryOne(
    `UPDATE intervention_templates SET ${setClauses} WHERE id = $1 RETURNING *`,
    [c.req.param('id'), ...values]
  );
  if (!updated) return c.json({ error: 'Not found' }, 404);
  return c.json(updated);
});

templatesRouter.delete('/:id', async (c) => {
  const updated = await queryOne(
    'UPDATE intervention_templates SET active = false WHERE id = $1 RETURNING id, active',
    [c.req.param('id')]
  );
  if (!updated) return c.json({ error: 'Not found' }, 404);
  return c.json(updated);
});
