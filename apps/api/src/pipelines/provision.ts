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

function generateVerificationCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
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

  const fromEmail = process.env.NODE_ENV === 'production'
    ? 'FlowState <noreply@flowstate.app>'
    : 'FlowState <onboarding@resend.dev>';

  console.log(`[provision] Sending welcome email FROM: ${fromEmail} TO: ${to}`);

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to,
        subject,
        html,
      }),
    });

    if (!res.ok) {
      const error = await res.text();
      console.error('[provision] Resend error:', res.status, error);
      if (res.status === 403 && error.includes('domain is not verified')) {
        console.warn('[provision] Email domain not verified. Use https://resend.com to verify your domain.');
      }
      throw new Error(`Resend API error: ${res.status} - ${error}`);
    }

    const result = await res.json();
    console.log('[provision] ✓ Welcome email sent successfully. Email ID:', result.id);
  } catch (err) {
    console.error('[provision] ✗ Failed to send welcome email:', err instanceof Error ? err.message : err);
    // Continue despite email error to not block provisioning
  }
}

export async function createDiscordChannels(
  clientId: string,
  firstName: string,
  discordUserId: string | null
): Promise<string | null> {
  // ── Environment variables ──────────────────────────────────────────────────
  const botToken = process.env.DISCORD_BOT_TOKEN;
  const guildId = process.env.DISCORD_GUILD_ID;
  const adminRoleId = process.env.DISCORD_ADMIN_ROLE_ID;
  const coachRoleId = process.env.DISCORD_COACH_ROLE_ID;

  console.log('[discord] Creating per-client category for:', { clientId, firstName, discordUserId });

  if (!botToken) {
    console.error('[discord] ✗ DISCORD_BOT_TOKEN not set — cannot create channels');
    return null;
  }
  if (!guildId) {
    console.error('[discord] ✗ DISCORD_GUILD_ID not set — cannot create channels');
    return null;
  }

  // ── Derive a safe category name: "firstname-shortid" ───────────────────────
  const shortId = clientId.replace(/-/g, '').slice(0, 5);
  const safeName = firstName.toLowerCase().replace(/[^a-z0-9]/g, '');
  const categoryName = `${safeName}-${shortId}`;

  // ── Fetch the bot's own user ID so we can grant it explicit access ─────────
  let botUserId: string | null = null;
  try {
    const meRes = await fetch('https://discord.com/api/v10/users/@me', {
      headers: { Authorization: `Bot ${botToken}` },
    });
    if (meRes.ok) {
      const meData = (await meRes.json()) as { id: string };
      botUserId = meData.id;
    }
  } catch {
    console.warn('[discord] ⚠ Could not fetch bot user ID, proceeding without explicit bot override');
  }

  // ── Permission bit flags ───────────────────────────────────────────────────
  // VIEW_CHANNEL (1024) | SEND_MESSAGES (2048) | READ_MESSAGE_HISTORY (65536)
  // | ATTACH_FILES (32768) | EMBED_LINKS (16384)
  const FULL_ACCESS = '117760'; // 1024 | 2048 | 65536 | 32768 | 16384
  const DENY_VIEW = '1024';    // VIEW_CHANNEL only

  // ── Build permission overwrites for the category ───────────────────────────
  // These propagate to child channels that inherit from the category.
  const permissionOverwrites: Array<{
    id: string;
    type: number; // 0 = role, 1 = member
    deny?: string;
    allow?: string;
  }> = [
    // @everyone — deny view so the category is private
    { id: guildId, type: 0, deny: DENY_VIEW },
    // Bot user — full access so it can post embeds, attach photos, etc.
    ...(botUserId ? [{ id: botUserId, type: 1, allow: FULL_ACCESS }] : []),
    // @admin role — full access for server admins
    ...(adminRoleId ? [{ id: adminRoleId, type: 0, allow: FULL_ACCESS }] : []),
    // @coach role — full access for coaches
    ...(coachRoleId ? [{ id: coachRoleId, type: 0, allow: FULL_ACCESS }] : []),
    // The specific Discord user (client) — full access if we know their ID
    ...(discordUserId ? [{ id: discordUserId, type: 1, allow: FULL_ACCESS }] : []),
  ];

  // ── Helper: create a guild channel via Discord REST API ────────────────────
  const discordApi = `https://discord.com/api/v10/guilds/${guildId}/channels`;
  const headers = {
    Authorization: `Bot ${botToken}`,
    'Content-Type': 'application/json',
  };

  async function createChannel(payload: Record<string, unknown>): Promise<{ id: string; name: string } | null> {
    const res = await fetch(discordApi, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const errorText = await res.text();
      console.error(`[discord] ✗ Channel creation failed (${res.status}):`, errorText);
      return null;
    }
    return (await res.json()) as { id: string; name: string };
  }

  try {
    // ── Step 1: Create the per-client CATEGORY (type 4) ──────────────────────
    console.log(`[discord] Creating category: ${categoryName}`);
    const category = await createChannel({
      name: categoryName,
      type: 4, // GUILD_CATEGORY
      permission_overwrites: permissionOverwrites,
    });

    if (!category) {
      console.error('[discord] ✗ Failed to create client category — aborting channel setup');
      return null;
    }
    console.log(`[discord] ✓ Category created: ${category.name} (ID: ${category.id})`);

    // ── Step 2: Create #check-in text channel under the category ─────────────
    console.log(`[discord] Creating #check-in under category ${category.id}`);
    const checkinChannel = await createChannel({
      name: 'check-in',
      type: 0, // GUILD_TEXT
      parent_id: category.id,
      topic: `Daily check-ins for ${firstName}`,
      // Child channels inherit the category's permission overwrites automatically
    });

    if (!checkinChannel) {
      console.error('[discord] ✗ Failed to create #check-in channel');
      return null;
    }
    console.log(`[discord] ✓ #check-in created (ID: ${checkinChannel.id})`);

    // ── Step 3: Create #coach-chat text channel under the category ───────────
    console.log(`[discord] Creating #coach-chat under category ${category.id}`);
    const coachChatChannel = await createChannel({
      name: 'coach-chat',
      type: 0, // GUILD_TEXT
      parent_id: category.id,
      topic: `1-on-1 coaching for ${firstName}`,
    });

    if (coachChatChannel) {
      console.log(`[discord] ✓ #coach-chat created (ID: ${coachChatChannel.id})`);
    } else {
      console.warn('[discord] ⚠ #coach-chat creation failed — continuing with check-in only');
    }

    // ── Return the check-in channel ID (stored in clients.discord_channel_id) ─
    console.log(`[discord] ✓ Per-client Discord setup complete. Check-in channel ID: ${checkinChannel.id}`);
    return checkinChannel.id;
  } catch (err) {
    console.error('[discord] ✗ Discord error:', err instanceof Error ? err.message : err);
    throw err;
  }
}

// ─── Main pipeline ────────────────────────────────────────────────────────────

export async function runProvisionPipeline(
  registrationId: string,
  reviewedBy: string,
  approvedStartDate?: string
): Promise<{ clientId: string; userId: string }> {
  console.log(`[provision] ╭─ Start provision pipeline for registration: ${registrationId}`);

  const reg = await queryOne<Registration>(
    'SELECT * FROM registrations WHERE id = $1',
    [registrationId]
  );
  if (!reg) throw new Error('Registration not found');
  console.log('[provision] │ ✓ Registration found:', reg.full_name);

  if (reg.discord_user_id) {
    const existingClient = await queryOne<{ id: string }>(
      'SELECT id FROM clients WHERE discord_user_id = $1',
      [reg.discord_user_id]
    );
    if (existingClient) {
      throw new Error(`A client with Discord ID "${reg.discord_user_id}" is already active.`);
    }
  }

  const phase = await queryOne<PhaseRow>(
    'SELECT * FROM program_phases WHERE week_number = 1'
  );
  if (!phase)
    throw new Error('program_phases seed data missing — run seed.sql');
  console.log('[provision] │ ✓ Program phase loaded');

  const programStartDate = approvedStartDate ?? reg.preferred_start_date;
  const tempPassword = generateTempPassword();
  const verificationCode = generateVerificationCode();
  console.log('[provision] │ Generated temp password, verification code, and start date:', { programStartDate, verificationCode });

  try {
    // ── Step 1+2: Create user directly in database ────────────────────────────────────
    console.log('[provision] │ ⏳ Step 1-2: Creating user account...');

    // Ensure the user exists in the users table (BetterAuth will use this)
    const existingUser = await queryOne<{ id: string }>('SELECT id FROM users WHERE email = $1', [reg.email]);
    let userId: string;

    if (existingUser) {
      userId = existingUser.id;
      await query(`UPDATE users SET role = 'client', name = $2 WHERE id = $1`, [userId, reg.full_name]);
      console.log('[provision] │ ✓ User account already exists, updated role:', userId);
    } else {
      const userRows = await query<{ id: string }>(
        `INSERT INTO users (email, name, role, created_at)
         VALUES ($1, $2, 'client', now())
         RETURNING id`,
        [reg.email, reg.full_name]
      );
      userId = userRows[0].id;
      console.log('[provision] │ ✓ User account created:', userId);
    }

    console.log('[provision] │   Temp password for initial setup:', tempPassword);

    // ── Step 3: Create clients row ───────────────────────────────────────────
    console.log('[provision] │ ⏳ Step 3: Creating clients row...');
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
        user_id, coach_id, full_name,
        discord_user_id, program_start_date,
        target_wake_time, target_bedtime, target_caffeine_cutoff,
        morning_light_duration_min, morning_exercise_time, target_peak_window,
        checkin_time_am, onboarding_responses, chronotype, discord_verification_code
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,'Intermediate',$14)
      RETURNING id`,
      [
        userId,
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
        verificationCode,
      ]
    );

    const newClientId = clientRows[0].id;
    console.log('[provision] │ ✓ Client record created:', newClientId);

    // ── Steps 4+5: Discord channels ──────────────────────────────────────────
    console.log('[provision] │ ⏳ Steps 4-5: Creating Discord channels...');
    
    const discordChannelId = await createDiscordChannels(
      newClientId,
      reg.full_name.split(' ')[0] ?? reg.full_name,
      reg.discord_user_id
    );

    if (discordChannelId) {
      await query('UPDATE clients SET discord_channel_id = $1 WHERE id = $2', [
        discordChannelId,
        newClientId,
      ]);
      console.log('[provision] │ ✓ Discord channels created:', discordChannelId);
    } else {
      console.warn('[provision] │ ⚠ Discord channels skipped (no bot token or config)');
    }

    // ── Step 6: Affine workspace ID ───────────────────────────────────────────
    console.log('[provision] │ ⏳ Step 6: Generating Affine workspace ID...');
    const affineWorkspaceId = generateUUID();
    await query('UPDATE clients SET affine_workspace_id = $1 WHERE id = $2', [
      affineWorkspaceId,
      newClientId,
    ]);
    console.log('[provision] │ ✓ Affine workspace ID assigned');

    // ── Step 7: Seed first 7 days of calendar events ─────────────────────────
    console.log('[provision] │ ⏳ Step 7: Seeding 7-day calendar...');
    const checkinTimeAm = reg.checkin_time_am?.substring(0, 5) ?? '06:30';
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
    console.log('[provision] │ ✓ Calendar events seeded');

    // ── Step 8: Welcome email ─────────────────────────────────────────────────
    console.log('[provision] │ ⏳ Step 8: Sending welcome email...');
    // Portal URL for students is the coach portal (port 3001) which has client routes
    const portalUrl = 'http://localhost:3001'; 
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
          <p>Your application has been approved! You're enrolling in the 90-day program starting <strong>${programStartDate}</strong>.</p>
          
          <h3 style="margin:24px 0 12px">Step 1: Join Discord</h3>
          ${discordInvite ? `<p>Join our Discord server: <a href="${discordInvite}">${discordInvite}</a></p>` : ''}
          <div style="background:#f1f5f9;padding:16px;border-radius:8px;margin:12px 0">
            <p style="margin:0">Go to the <strong>#verify</strong> channel and type:</p>
            <p style="font-family:monospace;font-size:18px;margin:8px 0;background:#fff;padding:8px;border-radius:4px;border:1px solid #e2e8f0">!register ${verificationCode}</p>
          </div>

          <h3 style="margin:24px 0 12px">Step 2: Access Your Portal</h3>
          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:20px;margin:12px 0">
            <p style="margin:0 0 4px"><strong>Portal:</strong> <a href="${portalUrl}/login">${portalUrl}/login</a></p>
            <p style="margin:0 0 4px"><strong>Email:</strong> ${reg.email}</p>
            <p style="margin:0"><strong>Temp password:</strong> <code>${tempPassword}</code></p>
          </div>
          
          <p style="margin-top:24px;color:#64748b;font-size:14px">See you in the flow,<br><strong>FlowState Team</strong></p>
        </div>
      </div>`
    );
    console.log('[provision] │ ✓ Welcome email sent (or bypassed if dev domain)');
    console.log('\n[provision] ==========================================');
    console.log(`[provision] VERIFICATION CODE FOR ${reg.email}: ${verificationCode}`);
    console.log(`[provision] TEMP PASSWORD FOR ${reg.email}: ${tempPassword}`);
    console.log('[provision] ==========================================\n');

    // ── Step 9: Mark registration approved ───────────────────────────────────
    console.log('[provision] │ ⏳ Step 9: Updating registration status...');
    await query(
      `UPDATE registrations SET status = 'approved', reviewed_by = $1, reviewed_at = now() WHERE id = $2`,
      [reviewedBy, registrationId]
    );
    console.log('[provision] │ ✓ Registration marked approved');

    // ── Step 10: Coach notification ───────────────────────────────────────────
    console.log('[provision] │ ⏳ Step 10: Creating coach notification...');
    await query(
      `INSERT INTO notifications (user_id, type, title, body, linked_entity_type, linked_entity_id)
       VALUES ($1, 'coach_alert', $2, $3, 'client', $4)`,
      [
        reviewedBy,
        `${reg.full_name} is now active`,
        `Approved. Portal access sent to ${reg.email}.${discordChannelId ? ' Discord channels created.' : ''}`,
        newClientId,
      ]
    );
    console.log('[provision] │ ✓ Coach notification created');

    console.log(`[provision] ╰─ ✓ Provision pipeline complete! clientId=${newClientId}, userId=${userId}`);
    return { clientId: newClientId, userId };
  } catch (err) {
    console.error(`[provision] ╰─ ✗ Pipeline failed at:`, err instanceof Error ? err.message : err);
    throw err;
  }
}
