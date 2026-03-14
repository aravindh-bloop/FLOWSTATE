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

    // Guard: prevent duplicate discord submissions
    const existingDiscord = await queryOne<{ id: string }>(
      "SELECT id FROM registrations WHERE discord_user_id = $1 AND status IN ('pending','approved')",
      [body.discord_user_id]
    );
    if (existingDiscord) {
      return c.json(
        { error: 'A registration with this Discord User ID is already pending or approved.' },
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
      await query(
        `INSERT INTO notifications (user_id, type, title, body, linked_entity_type, linked_entity_id)
         VALUES ($1, 'coach_alert', $2, $3, 'registration', $4)`,
        [
          coach.id,
          `New registration: ${body.full_name}`,
          `${body.email} applied for FlowState. Preferred start: ${body.preferred_start_date}.`,
          reg.id,
        ]
      );
    }

    // Send coach email (always, regardless of coach user in DB)
    const portalUrl = process.env.BETTERAUTH_URL ?? 'http://localhost:8080';  // Fixed: use correct baseURL
    sendCoachEmail(undefined, body, reg.id, portalUrl)
      .then(() => console.log('[registrations] Coach email sent successfully'))
      .catch((err) => console.error('[registrations] Coach email failed:', err instanceof Error ? err.message : err));

    return c.json({ id: reg.id, status: 'pending' }, 201);
  }
);

// ─── Coach-protected routes ───────────────────────────────────────────────────
// REMOVED: registrationsRouter.use('/:id', requireAuth, requireCoach);
// For testing workflow, approval/rejection are public endpoints

// GET /api/registrations — list (optional ?status= filter) — PUBLIC for coach portal testing
registrationsRouter.get('/', async (c) => {
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

// PATCH /api/registrations/:id/approve — PUBLIC for testing (coach portal)
registrationsRouter.patch('/:id/approve', async (c) => {
  const id = c.req.param('id');

  const reg = await queryOne<{ status: string; full_name: string }>(
    'SELECT status, full_name FROM registrations WHERE id = $1',
    [id]
  );
  if (!reg) return c.json({ error: 'Not found' }, 404);
  if (reg.status !== 'pending') {
    return c.json({ error: `Registration is already ${reg.status}` }, 409);
  }

  try {
    const coach = await queryOne<{ id: string }>(
      "SELECT id FROM users WHERE role = 'coach' LIMIT 1"
    );
    if (!coach) {
      throw new Error("No coach found in database to approve registration");
    }

    // Run the full provision pipeline (no suppression of errors)
    console.log(`[registrations] Starting provision pipeline for registration ${id}...`);
    const { clientId, userId } = await runProvisionPipeline(id, coach.id, undefined);
    console.log(`[registrations] Provision pipeline completed: clientId=${clientId}, userId=${userId}`);

    return c.json({ ok: true, status: 'approved', clientId, userId }, 200);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error(`[registrations] Provision pipeline FAILED for ${id}:`, errorMessage);
    // Return error details so client/coach can see what went wrong
    return c.json({
      error: 'Failed to provision student',
      details: errorMessage
    }, 500);
  }
});

// PATCH /api/registrations/:id/reject — PUBLIC for testing (coach portal)
const rejectSchema = z.object({ reason: z.string().optional() });

registrationsRouter.patch(
  '/:id/reject',
  zValidator('json', rejectSchema),
  async (c) => {
    const id = c.req.param('id');

    const reg = await queryOne<{ status: string; email: string; full_name: string }>(
      'SELECT status, email, full_name FROM registrations WHERE id = $1',
      [id]
    );
    if (!reg) return c.json({ error: 'Not found' }, 404);
    if (reg.status !== 'pending') {
      return c.json({ error: `Registration is already ${reg.status}` }, 409);
    }

    await query(
      `UPDATE registrations SET status = 'rejected', reviewed_at = now() WHERE id = $1`,
      [id]
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
  _coachUserId: string | undefined,
  reg: { full_name: string; email: string; preferred_start_date: string },
  registrationId: string,
  portalUrl: string
) {
  const resendKey = process.env.RESEND_API_KEY;
  const coachEmail = process.env.COACH_EMAIL;

  if (!resendKey) {
    console.error('[sendCoachEmail] RESEND_API_KEY not set - email will NOT be sent');
    return;
  }
  if (!coachEmail) {
    console.error('[sendCoachEmail] COACH_EMAIL not set - email will NOT be sent');
    return;
  }

  const reviewUrl = `${portalUrl}/workspace/coach-admin/registrations`;

  // Use testing domain in dev, production domain in prod
  const fromEmail = process.env.NODE_ENV === 'production'
    ? 'FlowState <noreply@flowstate.app>'
    : 'FlowState <onboarding@resend.dev>';

  console.log(`[sendCoachEmail] Sending email FROM: ${fromEmail} TO: ${coachEmail}`);

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
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

    if (!response.ok) {
      const error = await response.text();
      console.error(`[sendCoachEmail] Resend API error (${response.status}):`, error);
      if (response.status === 403 && error.includes('domain is not verified')) {
        console.error('[sendCoachEmail] ERROR: Email domain not verified! Go to https://resend.com/domains to verify');
      }
      throw new Error(`Resend API error: ${response.status} - ${error}`);
    }

    const result = await response.json();
    console.log(`[sendCoachEmail] ✓ Email sent successfully to ${coachEmail}. Email ID:`, result.id);
    return result;
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error(`[sendCoachEmail] ✗ Failed to send email:`, errorMsg);
    throw err;
  }
}

async function sendRejectionEmail(email: string, name: string) {
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    console.error('[sendRejectionEmail] RESEND_API_KEY not set - email will NOT be sent');
    return;
  }

  const fromEmail = process.env.NODE_ENV === 'production'
    ? 'FlowState <noreply@flowstate.app>'
    : 'FlowState <onboarding@resend.dev>';

  console.log(`[sendRejectionEmail] Sending rejection email FROM: ${fromEmail} TO: ${email}`);

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
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

    if (!response.ok) {
      const error = await response.text();
      console.error(`[sendRejectionEmail] Resend API error (${response.status}):`, error);
      throw new Error(`Resend API error: ${response.status} - ${error}`);
    }

    const result = await response.json();
    console.log(`[sendRejectionEmail] ✓ Rejection email sent to ${email}. Email ID:`, result.id);
    return result;
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error(`[sendRejectionEmail] ✗ Failed to send rejection email:`, errorMsg);
    throw err;
  }
}
