/**
 * Registrations routes
 *
 *   POST   /api/registrations              public — landing page form submission
 *   GET    /api/registrations              coach — list all (filterable by ?status=)
 *   GET    /api/registrations/:id          coach — single registration detail
 *   PATCH  /api/registrations/:id/approve  coach — approve + trigger provision pipeline
 *   PATCH  /api/registrations/:id/reject   coach — reject + send rejection email
 */

import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { query, queryOne } from '../db.js';
import { requireAuth, requireCoach } from '../middleware/require-auth.js';
import { runProvisionPipeline } from '../pipelines/provision.js';

export const registrationsRouter = new Hono();

// ─── POST /api/registrations — public, no auth ────────────────────────────────

const registrationSchema = z.object({
  full_name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  discord_user_id: z.string().min(1),
  preferred_start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  key_changes: z.string().optional(),
  short_term_goals: z.string().optional(),
  long_term_goals: z.string().optional(),
  goal_motivation: z.string().optional(),
  bottlenecks: z.string().optional(),
  checkin_time_am: z.string().optional(),
  current_wake_time: z.string().optional(),
  peak_mental_time: z.string().optional(),
  wearable_device: z.string().optional(),
});

registrationsRouter.post(
  '/',
  zValidator('json', registrationSchema),
  async (c) => {
    const body = c.req.valid('json');

    // Guard: prevent duplicate email submissions
    const existing = await queryOne<{ id: string }>(
      "SELECT id FROM registrations WHERE email = $1 AND status IN ('pending','approved')",
      [body.email]
    );
    if (existing) {
      return c.json(
        { error: 'A registration with this email is already pending or approved.' },
        409
      );
    }

    const [reg] = await query<{ id: string }>(
      `INSERT INTO registrations (
        full_name, email, phone, discord_user_id, preferred_start_date,
        key_changes, short_term_goals, long_term_goals, goal_motivation,
        bottlenecks, checkin_time_am, current_wake_time, peak_mental_time,
        wearable_device, status
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,'pending')
      RETURNING id`,
      [
        body.full_name,
        body.email,
        body.phone ?? null,
        body.discord_user_id,
        body.preferred_start_date,
        body.key_changes ?? null,
        body.short_term_goals ?? null,
        body.long_term_goals ?? null,
        body.goal_motivation ?? null,
        body.bottlenecks ?? null,
        body.checkin_time_am ?? null,
        body.current_wake_time ?? null,
        body.peak_mental_time ?? null,
        body.wearable_device ?? null,
      ]
    );

    // Notify coach (best-effort — non-fatal if coach record doesn't exist yet)
    const coach = await queryOne<{ id: string }>(
      "SELECT id FROM users WHERE role = 'coach' LIMIT 1"
    );
    if (coach) {
      const portalUrl = process.env.BETTERAUTH_URL ?? 'http://localhost:3000';
      await query(
        `INSERT INTO notifications (user_id, type, title, body, linked_entity_type, linked_entity_id)
         VALUES ($1, 'new_registration', $2, $3, 'registration', $4)`,
        [
          coach.id,
          `New registration: ${body.full_name}`,
          `${body.email} applied for FlowState. Preferred start: ${body.preferred_start_date}.`,
          reg.id,
        ]
      );

      // Send coach email (best-effort)
      sendCoachEmail(coach.id, body, reg.id, portalUrl).catch((err) =>
        console.error('[registrations] Coach email failed:', err)
      );
    }

    return c.json({ id: reg.id, status: 'pending' }, 201);
  }
);

// ─── Coach-protected routes ───────────────────────────────────────────────────

registrationsRouter.use('/:id', requireAuth, requireCoach);
registrationsRouter.use('/:id/*', requireAuth, requireCoach);

// GET /api/registrations — list (optional ?status= filter)
registrationsRouter.get('/', requireAuth, requireCoach, async (c) => {
  const status = c.req.query('status');
  const rows = status
    ? await query(
      `SELECT * FROM registrations WHERE status = $1 ORDER BY created_at DESC`,
      [status]
    )
    : await query(`SELECT * FROM registrations ORDER BY created_at DESC`);
  return c.json(rows);
});

// GET /api/registrations/:id — single
registrationsRouter.get('/:id', async (c) => {
  const reg = await queryOne('SELECT * FROM registrations WHERE id = $1', [
    c.req.param('id'),
  ]);
  if (!reg) return c.json({ error: 'Not found' }, 404);
  return c.json(reg);
});

// PATCH /api/registrations/:id/approve
registrationsRouter.patch('/:id/approve', async (c) => {
  const id = c.req.param('id');
  const user = c.get('user');
  const body = await c.req.json().catch(() => ({})) as { program_start_date?: string };

  const reg = await queryOne<{ status: string }>(
    'SELECT status FROM registrations WHERE id = $1',
    [id]
  );
  if (!reg) return c.json({ error: 'Not found' }, 404);
  if (reg.status !== 'pending') {
    return c.json({ error: `Registration is already ${reg.status}` }, 409);
  }

  try {
    const { clientId } = await runProvisionPipeline(
      id,
      user.id,
      body.program_start_date
    );
    return c.json({ ok: true, client_id: clientId });
  } catch (err) {
    console.error('[registrations] Provision failed:', err);
    const msg = err instanceof Error ? err.message : 'Provision pipeline failed';
    return c.json({ error: msg }, 500);
  }
});

// PATCH /api/registrations/:id/reject
const rejectSchema = z.object({ reason: z.string().optional() });

registrationsRouter.patch(
  '/:id/reject',
  zValidator('json', rejectSchema),
  async (c) => {
    const id = c.req.param('id');
    const user = c.get('user');

    const reg = await queryOne<{ status: string; email: string; full_name: string }>(
      'SELECT status, email, full_name FROM registrations WHERE id = $1',
      [id]
    );
    if (!reg) return c.json({ error: 'Not found' }, 404);
    if (reg.status !== 'pending') {
      return c.json({ error: `Registration is already ${reg.status}` }, 409);
    }

    await query(
      `UPDATE registrations SET status = 'rejected', reviewed_by = $1, reviewed_at = now() WHERE id = $2`,
      [user.id, id]
    );

    // Send rejection email (best-effort)
    sendRejectionEmail(reg.email, reg.full_name).catch((err) =>
      console.error('[registrations] Rejection email failed:', err)
    );

    return c.json({ ok: true });
  }
);

// ─── Email helpers ────────────────────────────────────────────────────────────

async function sendCoachEmail(
  _coachUserId: string,
  reg: { full_name: string; email: string; preferred_start_date: string },
  registrationId: string,
  portalUrl: string
) {
  const resendKey = process.env.RESEND_API_KEY;
  const coachEmail = process.env.COACH_EMAIL;
  if (!resendKey || !coachEmail) return;

  const reviewUrl = `${portalUrl}/workspace/coach-admin/registrations`;

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'FlowState <noreply@flowstate.app>',
      to: coachEmail,
      subject: `New FlowState registration — ${reg.full_name}`,
      html: `
        <div style="font-family:Inter,system-ui,sans-serif;max-width:600px;margin:0 auto;color:#0f172a">
          <div style="background:#0f172a;padding:24px 32px;border-radius:12px 12px 0 0">
            <span style="color:#0fa884;font-size:18px;font-weight:700">FlowState</span>
          </div>
          <div style="background:#fff;padding:32px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px">
            <h2 style="margin:0 0 16px;font-size:20px">New registration — action required</h2>
            <table style="border-collapse:collapse;width:100%;font-size:14px">
              <tr><td style="padding:8px 0;color:#64748b;width:140px">Name</td><td style="padding:8px 0;font-weight:600">${reg.full_name}</td></tr>
              <tr><td style="padding:8px 0;color:#64748b">Email</td><td style="padding:8px 0">${reg.email}</td></tr>
              <tr><td style="padding:8px 0;color:#64748b">Preferred start</td><td style="padding:8px 0">${reg.preferred_start_date}</td></tr>
              <tr><td style="padding:8px 0;color:#64748b">Registration ID</td><td style="padding:8px 0;font-family:monospace;font-size:12px">${registrationId}</td></tr>
            </table>
            <a href="${reviewUrl}" style="display:inline-block;margin-top:24px;padding:12px 24px;background:#0fa884;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">
              Review in Portal →
            </a>
          </div>
        </div>
      `,
    }),
  });
}

async function sendRejectionEmail(email: string, name: string) {
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) return;

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'FlowState <noreply@flowstate.app>',
      to: email,
      subject: 'Regarding your FlowState application',
      html: `
        <div style="font-family:Inter,system-ui,sans-serif;max-width:600px;margin:0 auto;color:#0f172a">
          <div style="background:#0f172a;padding:24px 32px;border-radius:12px 12px 0 0">
            <span style="color:#0fa884;font-size:18px;font-weight:700">FlowState</span>
          </div>
          <div style="background:#fff;padding:32px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px">
            <p style="font-size:16px">Hi ${name},</p>
            <p style="font-size:15px;line-height:1.6;color:#334155">
              Thank you for applying to FlowState. Unfortunately, we're unable to offer you a spot at this time.
            </p>
            <p style="font-size:15px;line-height:1.6;color:#334155">
              We appreciate your interest and encourage you to apply again in the future.
            </p>
            <p style="font-size:14px;color:#64748b">Best wishes,<br><strong>FlowState Team</strong></p>
          </div>
        </div>
      `,
    }),
  });
}
