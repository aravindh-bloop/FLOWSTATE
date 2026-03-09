/**
 * Notification routes
 *
 *   GET  /api/notifications           unread for current user
 *   PATCH /api/notifications/:id/read
 *   POST  /api/notifications/read-all
 */

import { Hono } from 'hono';
import { query, queryOne } from '../db.js';
import { requireAuth } from '../middleware/require-auth.js';

export const notificationsRouter = new Hono();

notificationsRouter.use('*', requireAuth);

notificationsRouter.get('/', async (c) => {
  const user = c.get('user');
  const rows = await query(`
    SELECT * FROM notifications
    WHERE user_id = $1
    ORDER BY created_at DESC
    LIMIT 50
  `, [user.id]);
  return c.json(rows);
});

notificationsRouter.patch('/:id/read', async (c) => {
  const user = c.get('user');
  const updated = await queryOne(`
    UPDATE notifications SET read = true
    WHERE id = $1 AND user_id = $2
    RETURNING id, read
  `, [c.req.param('id'), user.id]);
  if (!updated) return c.json({ error: 'Not found' }, 404);
  return c.json(updated);
});

notificationsRouter.post('/read-all', async (c) => {
  const user = c.get('user');
  await query('UPDATE notifications SET read = true WHERE user_id = $1', [user.id]);
  return c.body(null, 204);
});
