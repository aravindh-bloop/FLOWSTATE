/**
 * Middleware: requireAuth
 *
 * Validates the `Authorization: Bearer <token>` header via BetterAuth.
 * Sets `c.var.user` and `c.var.session` for downstream handlers.
 * Returns 401 if the token is missing or invalid.
 */

import type { Context, Next } from 'hono';
import { createMiddleware } from 'hono/factory';
import { auth } from '../auth.js';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: 'coach' | 'client';
}

declare module 'hono' {
  interface ContextVariableMap {
    user: AuthUser;
    sessionToken: string;
  }
}

export const requireAuth = createMiddleware(async (c: Context, next: Next) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });

  if (!session?.user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  c.set('user', session.user as AuthUser);
  await next();
});

/** Coach-only guard — must come after requireAuth */
export const requireCoach = createMiddleware(async (c: Context, next: Next) => {
  const user = c.get('user');
  if (user.role !== 'coach') {
    return c.json({ error: 'Forbidden' }, 403);
  }
  await next();
});

/** Allow coach OR the client whose id matches the route param :id */
export const requireCoachOrSelf = createMiddleware(
  async (c: Context, next: Next) => {
    const user = c.get('user');
    if (user.role === 'coach') return next();

    // For client: verify the requested resource belongs to them
    // Routes should use :clientId param; fall back to :id
    const paramId = c.req.param('clientId') ?? c.req.param('id');

    // Look up the client row to get user_id
    const { queryOne } = await import('../db.js');
    const client = await queryOne<{ user_id: string }>(
      'SELECT user_id FROM clients WHERE id = $1',
      [paramId]
    );

    if (!client || client.user_id !== user.id) {
      return c.json({ error: 'Forbidden' }, 403);
    }

    await next();
  }
);
