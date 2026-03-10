/**
 * FlowState — Auto-Provision Pipeline
 *
 * Triggered by PATCH /api/registrations/:id/approve.
 * Executes all 10 steps from PRD.auto_provision_pipeline:
 *   1. Generate temporary password
 *   2. Create users row (role=client, must_change_password=true)
 *   3. Create clients row (Week 1 targets from program_phases, chronotype=Intermediate)
 *   4. Create Discord channels (checkin, support, session) via Discord REST API
 *   5. Write discord_channel_id back to clients
 *   6. Assign a UUID as affine_workspace_id
 *   7. Seed calendar_events for first 7 days
 *   8. Send welcome email via Resend
 *   9. Update registrations.status = approved
 *  10. Create coach notification
 */

import { auth } from '../auth.js';
import { query, queryOne } from '../db.js';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Registration {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  discord_user_id: string | null;
  preferred_start_date: string;
  checkin_time_am: string | null;
  key_changes: string | null;
  short_term_goals: string | null;
  long_term_goals: string | null;
  goal_motivation: string | null;
  bottlenecks: string | null;
  current_wake_time: string | null;
  peak_mental_time: string | null;
  wearable_device: string | null;
}

interface PhaseRow {
  target_wake_time: string;
  target_bedtime: string;
  target_caffeine_cutoff: string;
  morning_light_duration_min: number;
  morning_exercise_time: string;
  target_peak_window: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateTempPassword(): string {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghjkmnpqrstuvwxyz';
  const digits = '23456789';
  const all = upper + lower + digits;
  let pw = '';
  pw += upper[Math.floor(Math.random() * upper.length)];
  pw += lower[Math.floor(Math.random() * lower.length)];
  pw += digits[Math.floor(Math.random() * digits.length)];
  for (let i = 3; i < 12; i++) {
    pw += all[Math.floor(Math.random() * all.length)];
  }
  return pw
    .split('')
    .sort(() => Math.random() - 0.5)
    .join('');
}

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

async function sendEmail(to: string, subject: string, html: string) {
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    console.warn('[provision] RESEND_API_KEY not set — skipping email');
    return;
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'FlowState <noreply@flowstate.app>',
      to,
      subject,
      html,
    }),
  });
  if (!res.ok) {
    console.error('[provision] Resend error:', await res.text());
  }
}

async function createDiscordChannels(
  clientId: string,
  firstName: string,
  discordUserId: string | null
): Promise<string | null> {
  const botToken = process.env.DISCORD_BOT_TOKEN;
  const guildId = process.env.DISCORD_GUILD_ID;
  const categoryId = process.env.DISCORD_CLIENT_CATEGORY_ID;
  const adminRoleId = process.env.DISCORD_ADMIN_ROLE_ID;
  const clientRoleId = process.env.DISCORD_CLIENT_ROLE_ID;

  if (!botToken || !guildId || !categoryId) {
    console.warn(
      '[provision] Discord env vars not set — skipping channel creation'
    );
    return null;
  }

  const shortId = clientId.replace(/-/g, '').slice(0, 6);
  const safeName = firstName.toLowerCase().replace(/[^a-z0-9]/g, '');

  const channelsToCreate = [
    { name: `checkin-${safeName}-${shortId}`, type: 0 },
    { name: `support-${safeName}-${shortId}`, type: 0 },
    { name: `session-${safeName}-${shortId}`, type: 2 },
  ];

  const permissionOverwrites: Array<{
    id: string;
    type: number;
    deny?: string;
    allow?: string;
  }> = [
    { id: guildId, type: 0, deny: '1024' },
    ...(adminRoleId ? [{ id: adminRoleId, type: 0, allow: '68608' }] : []),
  ];

  try {
    const createdChannels: Array<{ id: string; name: string }> = [];

    for (const ch of channelsToCreate) {
      const createRes = await fetch(
        `https://discord.com/api/v10/guilds/${guildId}/channels`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bot ${botToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: ch.name,
            type: ch.type,
            parent_id: categoryId,
            permission_overwrites: permissionOverwrites,
          }),
        }
      );

      if (!createRes.ok) {
        console.error(
          `[provision] Channel ${ch.name} failed:`,
          await createRes.text()
        );
        continue;
      }

      const channel = (await createRes.json()) as { id: string; name: string };
      createdChannels.push(channel);

      if (discordUserId) {
        fetch(
          `https://discord.com/api/v10/channels/${channel.id}/permissions/${discordUserId}`,
          {
            method: 'PUT',
            headers: {
              Authorization: `Bot ${botToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ type: 1, allow: '68608' }),
          }
        ).catch(() => {
          /* non-fatal */
        });
      }
    }

    if (discordUserId && clientRoleId) {
      fetch(
        `https://discord.com/api/v10/guilds/${guildId}/members/${discordUserId}/roles/${clientRoleId}`,
        { method: 'PUT', headers: { Authorization: `Bot ${botToken}` } }
      ).catch((err: unknown) =>
        console.error('[provision] Role assign failed:', err)
      );
    }

    return createdChannels.find(c => c.name.startsWith('checkin-'))?.id ?? null;
  } catch (err) {
    console.error('[provision] Discord error:', err);
    return null;
  }
}

// ─── Main pipeline ────────────────────────────────────────────────────────────

export async function runProvisionPipeline(
  registrationId: string,
  reviewedBy: string,
  approvedStartDate?: string
): Promise<{ clientId: string; userId: string }> {
  const reg = await queryOne<Registration>(
    'SELECT * FROM registrations WHERE id = $1',
    [registrationId]
  );
  if (!reg) throw new Error('Registration not found');

  const phase = await queryOne<PhaseRow>(
    'SELECT * FROM program_phases WHERE week_number = 1'
  );
  if (!phase)
    throw new Error('program_phases seed data missing — run seed.sql');

  const programStartDate = approvedStartDate ?? reg.preferred_start_date;
  const tempPassword = generateTempPassword();

  // ── Step 1+2: Create BetterAuth user ────────────────────────────────────
  const userRes = await auth.api.signUpEmail({
    body: { email: reg.email, password: tempPassword, name: reg.full_name },
    headers: new Headers(),
  });
  const userId: string = (userRes as { user: { id: string } }).user.id;

  await query(
    "UPDATE users SET role = 'client', must_change_password = true WHERE id = $1",
    [userId]
  );

  // ── Step 3: Create clients row ───────────────────────────────────────────
  const onboardingResponses = {
    key_changes: reg.key_changes,
    short_term_goals: reg.short_term_goals,
    long_term_goals: reg.long_term_goals,
    goal_motivation: reg.goal_motivation,
    bottlenecks: reg.bottlenecks,
    current_wake_time: reg.current_wake_time,
    peak_mental_time: reg.peak_mental_time,
    wearable_device: reg.wearable_device,
    phone: reg.phone,
  };

  const clientRows = await query<{ id: string }>(
    `INSERT INTO clients (
      user_id, registration_id, coach_id, full_name,
      discord_user_id, program_start_date,
      target_wake_time, target_bedtime, target_caffeine_cutoff,
      morning_light_duration_min, morning_exercise_time, target_peak_window,
      checkin_time_am, onboarding_responses, chronotype
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,'Intermediate')
    RETURNING id`,
    [
      userId,
      registrationId,
      reviewedBy,
      reg.full_name,
      reg.discord_user_id ?? null,
      programStartDate,
      phase.target_wake_time,
      phase.target_bedtime,
      phase.target_caffeine_cutoff,
      phase.morning_light_duration_min,
      phase.morning_exercise_time,
      phase.target_peak_window,
      reg.checkin_time_am ?? '06:30',
      JSON.stringify(onboardingResponses),
    ]
  );

  const newClientId = clientRows[0].id;
  const firstName = reg.full_name.split(' ')[0] ?? reg.full_name;

  // ── Steps 4+5: Discord channels ──────────────────────────────────────────
  const discordChannelId = await createDiscordChannels(
    newClientId,
    firstName,
    reg.discord_user_id
  );

  if (discordChannelId) {
    await query('UPDATE clients SET discord_channel_id = $1 WHERE id = $2', [
      discordChannelId,
      newClientId,
    ]);
  }

  // ── Step 6: Affine workspace ID ───────────────────────────────────────────
  const affineWorkspaceId = generateUUID();
  await query('UPDATE clients SET affine_workspace_id = $1 WHERE id = $2', [
    affineWorkspaceId,
    newClientId,
  ]);

  // ── Step 7: Seed first 7 days of calendar events ─────────────────────────
  const checkinTimeAm = reg.checkin_time_am ?? '06:30';
  const checkinTimePm = '20:00';

  for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
    const dayDate = new Date(programStartDate);
    dayDate.setDate(dayDate.getDate() + dayOffset);
    const dateStr = dayDate.toISOString().split('T')[0];

    await query(
      `INSERT INTO calendar_events (client_id, title, type, scheduled_at, status)
       VALUES ($1, 'Morning Check-In', 'checkin_scheduled', $2::timestamptz, 'scheduled')`,
      [newClientId, `${dateStr}T${checkinTimeAm}:00`]
    );
    await query(
      `INSERT INTO calendar_events (client_id, title, type, scheduled_at, status)
       VALUES ($1, 'Evening Check-In', 'checkin_scheduled', $2::timestamptz, 'scheduled')`,
      [newClientId, `${dateStr}T${checkinTimePm}:00`]
    );
  }

  // ── Step 8: Welcome email ─────────────────────────────────────────────────
  const portalUrl = process.env.BETTERAUTH_URL ?? 'http://localhost:3000';
  const discordInvite = process.env.DISCORD_INVITE_URL ?? '';

  await sendEmail(
    reg.email,
    "You're in — here's how to get started with FlowState",
    `<div style="font-family:Inter,system-ui,sans-serif;max-width:600px;margin:0 auto;color:#0f172a">
      <div style="background:#0fa884;padding:32px;border-radius:12px 12px 0 0;text-align:center">
        <h1 style="color:#fff;margin:0;font-size:28px;font-weight:700">Welcome to FlowState</h1>
      </div>
      <div style="background:#fff;padding:32px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px">
        <p>Hey ${reg.full_name},</p>
        <p>You've been approved for the 90-day program starting <strong>${programStartDate}</strong>.</p>
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:20px;margin:24px 0">
          <p style="margin:0 0 4px"><strong>Portal:</strong> <a href="${portalUrl}/login">${portalUrl}/login</a></p>
          <p style="margin:0 0 4px"><strong>Email:</strong> ${reg.email}</p>
          <p style="margin:0"><strong>Temp password:</strong> <code>${tempPassword}</code></p>
        </div>
        ${discordInvite ? `<p><strong>Discord:</strong> <a href="${discordInvite}">${discordInvite}</a></p>` : ''}
        <p style="color:#64748b">See you in the flow,<br><strong>FlowState Team</strong></p>
      </div>
    </div>`
  );

  // ── Step 9: Mark registration approved ───────────────────────────────────
  await query(
    `UPDATE registrations SET status = 'approved', reviewed_by = $1, reviewed_at = now() WHERE id = $2`,
    [reviewedBy, registrationId]
  );

  // ── Step 10: Coach notification ───────────────────────────────────────────
  await query(
    `INSERT INTO notifications (user_id, type, title, body, linked_entity_type, linked_entity_id)
     VALUES ($1, 'new_registration', $2, $3, 'client', $4)`,
    [
      reviewedBy,
      `${reg.full_name} is now active`,
      `Approved. Portal access sent to ${reg.email}.${discordChannelId ? ' Discord channels created.' : ''}`,
      newClientId,
    ]
  );

  return { clientId: newClientId, userId };
}
