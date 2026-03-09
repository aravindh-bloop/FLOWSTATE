/**
 * Auth routes — thin wrappers over BetterAuth to match the
 * frontend's expected API shape (session.ts calls these paths).
 *
 *   POST /api/auth/login  → { user, token }
 *   POST /api/auth/logout → 204
 *   GET  /api/auth/me     → { id, email, name, role, workspaceId }
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { auth } from '../auth.js';
import { requireAuth } from '../middleware/require-auth.js';
import { queryOne } from '../db.js';

export const authRouter = new Hono();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

// POST /api/auth/login
authRouter.post('/login', zValidator('json', loginSchema), async (c) => {
  const { email, password } = c.req.valid('json');

  // Delegate to BetterAuth sign-in (returns session + bearer token)
  const signInReq = new Request(
    new URL('/api/auth/sign-in/email', c.req.url).toString(),
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    }
  );

  const res = await auth.handler(signInReq);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    return c.json({ error: (body as { message?: string }).message ?? 'Invalid credentials' }, 401);
  }

  const data = (await res.json()) as {
    user: { id: string; email: string; name: string; role?: string };
    token?: string;
  };

  // Fetch client workspace ID if role is client
  const clientRow = await queryOne<{ affine_workspace_id: string | null }>(
    'SELECT affine_workspace_id FROM clients WHERE user_id = $1',
    [data.user.id]
  );

  return c.json({
    user: {
      id: data.user.id,
      email: data.user.email,
      name: data.user.name,
      role: data.user.role ?? 'client',
      workspaceId: clientRow?.affine_workspace_id ?? null,
    },
    token: data.token ?? null,
  });
});

// POST /api/auth/logout
authRouter.post('/logout', async (c) => {
  // Best-effort: call BetterAuth sign-out
  const logoutReq = new Request(
    new URL('/api/auth/sign-out', c.req.url).toString(),
    {
      method: 'POST',
      headers: c.req.raw.headers,
    }
  );
  await auth.handler(logoutReq).catch(() => null);
  return c.body(null, 204);
});

// GET /api/auth/me
authRouter.get('/me', requireAuth, async (c) => {
  const user = c.get('user');

  const clientRow = await queryOne<{ affine_workspace_id: string | null }>(
    'SELECT affine_workspace_id FROM clients WHERE user_id = $1',
    [user.id]
  );

  return c.json({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    workspaceId: clientRow?.affine_workspace_id ?? null,
  });
});
