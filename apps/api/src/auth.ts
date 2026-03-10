/**
 * FlowState — Auth layer (BetterAuth + bearer tokens).
 *
 * Exposes:
 *   auth          — BetterAuth instance (mounted at /api/auth/**)
 *   requireAuth   — middleware that validates a Bearer JWT and sets c.var.user
 *
 * BetterAuth routes:
 *   POST /api/auth/sign-in/email
 *   POST /api/auth/sign-out
 *   GET  /api/auth/get-session
 *
 * Custom wrapper routes at /api/auth/login, /api/auth/logout, /api/auth/me
 * are defined in routes/auth.ts for API shape compatibility with the frontend.
 */

import { betterAuth } from 'better-auth';
import { bearer } from 'better-auth/plugins';
import { pool } from './db.js';

export const auth = betterAuth({
  // Use existing NeonDB pool
  database: { db: pool, type: 'pg' },

  // Email + password sign-in
  emailAndPassword: { enabled: true },

  // Bearer token plugin — enables Authorization: Bearer <token> flow
  plugins: [bearer()],

  // Expose extra user fields returned in session
  user: {
    additionalFields: {
      role: { type: 'string', required: true, defaultValue: 'client' },
      must_change_password: { type: 'boolean', required: false, defaultValue: false },
    },
  },

  // Session config — 30 day token lifetime
  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 days in seconds
    updateAge: 60 * 60 * 24,       // rotate session every 24h
  },

  trustedOrigins: process.env.BETTERAUTH_URL
    ? [process.env.BETTERAUTH_URL]
    : ['http://localhost:3000'],
});

export type Session = Awaited<ReturnType<typeof auth.api.getSession>>;
