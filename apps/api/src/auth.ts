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
  // Use existing NeonDB pool directly (BetterAuth auto-detects pg Pool)
  database: pool,

  // Email + password sign-in
  emailAndPassword: { enabled: true },

  // Bearer token plugin — enables Authorization: Bearer <token> flow
  plugins: [bearer()],

  // Base URL for auth callbacks and redirects
  baseURL: process.env.BETTERAUTH_URL ?? 'http://localhost:8080',

  // Map BetterAuth model names to our DB (users table has snake_case columns)
  user: {
    modelName: 'users',
    fields: {
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
    additionalFields: {
      role: { type: 'string', required: true, defaultValue: 'client' },
      must_change_password: { type: 'boolean', required: false, defaultValue: false },
    },
  },

  session: {
    modelName: 'session',
    expiresIn: 60 * 60 * 24 * 30, // 30 days in seconds
    updateAge: 60 * 60 * 24,       // rotate session every 24h
  },

  account: {
    modelName: 'account',
  },

  // Use UUIDs for IDs (our users.id is uuid type)
  advanced: {
    database: {
      generateId: () => crypto.randomUUID(),
    },
  },

  trustedOrigins: [
    process.env.BETTERAUTH_URL ?? 'http://localhost:8080',
    process.env.FRONTEND_URL,
    process.env.COACH_PORTAL_URL,
    ...(process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',').map(s => s.trim()) : []),
    'http://localhost:3000',   // Landing page
    'http://localhost:3001',   // Coach portal
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3001',
  ].filter(Boolean) as string[],
});

export type Session = Awaited<ReturnType<typeof auth.api.getSession>>;
