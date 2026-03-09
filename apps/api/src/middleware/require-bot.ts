/**
 * Middleware: requireBot
 *
 * Validates the `X-Bot-Token` header against BOT_INTERNAL_API_TOKEN.
 * Used exclusively on /api/bot/* endpoints called only by the Discord bot.
 */

import type { Context, Next } from 'hono';
import { createMiddleware } from 'hono/factory';

export const requireBot = createMiddleware(async (c: Context, next: Next) => {
  const token = c.req.header('X-Bot-Token');
  const expected = process.env.BOT_INTERNAL_API_TOKEN;

  if (!expected) throw new Error('BOT_INTERNAL_API_TOKEN is not configured');
  if (!token || token !== expected) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  await next();
});
