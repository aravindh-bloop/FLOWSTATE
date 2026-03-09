/**
 * FlowState — Hono API entry point.
 *
 * Mounts all route groups, BetterAuth handler, and starts the server.
 * Cron jobs are registered after the server starts.
 */

import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { auth } from './auth.js';
import { authRouter } from './routes/auth.js';
import { clientsRouter } from './routes/clients.js';
import { checkInsRouter } from './routes/checkins.js';
import { calendarRouter } from './routes/calendar.js';
import { interventionsRouter } from './routes/interventions.js';
import { templatesRouter } from './routes/templates.js';
import { summariesRouter } from './routes/summaries.js';
import { dashboardRouter } from './routes/dashboard.js';
import { notificationsRouter } from './routes/notifications.js';
import { registrationsRouter } from './routes/registrations.js';
import { botRouter } from './routes/bot.js';
import { registerCronJobs } from './jobs/index.js';

const app = new Hono();

// ─── Global middleware ────────────────────────────────────────────────────────

app.use(logger());

app.use(
  '*',
  cors({
    origin: process.env.BETTERAUTH_URL ?? 'http://localhost:3000',
    allowHeaders: ['Content-Type', 'Authorization', 'X-Bot-Token'],
    allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
  })
);

// ─── BetterAuth native routes (/api/auth/**) ─────────────────────────────────
// Handles sign-up, sign-in/email, sign-out, get-session, etc.
app.on(['GET', 'POST'], '/api/auth/**', (c) => auth.handler(c.req.raw));

// ─── FlowState custom auth wrappers ──────────────────────────────────────────
app.route('/api/auth', authRouter);

// ─── Domain routes ────────────────────────────────────────────────────────────
app.route('/api/clients', clientsRouter);

// Check-in routes are nested under clients
app.route('/api/clients/:clientId/checkins', checkInsRouter);

// Calendar — two mount points (nested + top-level event)
app.route('/api/clients/:clientId/calendar', calendarRouter);
app.route('/api/calendar', calendarRouter);

// Interventions — two mount points
app.route('/api/interventions', interventionsRouter);
app.route('/api/clients', interventionsRouter); // for /api/clients/:clientId/interventions

app.route('/api/templates', templatesRouter);

// Summaries — two mount points
app.route('/api/summaries', summariesRouter);
app.route('/api/clients', summariesRouter); // for /api/clients/:clientId/summaries

app.route('/api/dashboard', dashboardRouter);
app.route('/api/notifications', notificationsRouter);
app.route('/api/registrations', registrationsRouter);

// Bot-internal routes (BOT_INTERNAL_API_TOKEN required)
app.route('/api/bot', botRouter);

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/health', (c) => c.json({ status: 'ok', ts: new Date().toISOString() }));

// ─── Start server ─────────────────────────────────────────────────────────────
const PORT = Number(process.env.PORT ?? 8080);

serve({ fetch: app.fetch, port: PORT }, () => {
  console.log(`[api] FlowState API running on port ${PORT}`);
  registerCronJobs();
});

export default app;
