/**
 * Discord server reset script — run once manually.
 *
 * Usage:
 *   cd "D:/FLOWSTATE DISCORD/FLOWSTATE"
 *   npx tsx apps/bot/src/setup/reset-server.ts
 *
 * This will:
 *   1. Delete ALL existing channels and roles (except @everyone and bot-managed roles)
 *   2. Create roles: @admin, @coach, @client, @unverified
 *   3. Create the server structure:
 *      - INFO category: #welcome (read-only), #rules (read-only), #announcements (read-only)
 *      - GENERAL category: #general-chat, #introductions, #resources (coach/admin send only)
 *      - ADMIN category (hidden from everyone except admins): #admin-chat, #admin-logs
 *      - COACH WORKSPACE category (hidden, coach/admin read-only, bot sends): #dashboard, #alerts, #weekly-summaries
 *      - VERIFY category: #verify (with a verify button)
 *      - FLOWSTATE-CLIENTS category (hidden by default, clients get per-user access)
 *   4. Print all created IDs for .env update
 */

const TOKEN = process.env.DISCORD_BOT_TOKEN ?? '';
const GUILD_ID = process.env.DISCORD_GUILD_ID ?? '';
const API = 'https://discord.com/api/v10';

if (!TOKEN || !GUILD_ID) {
  console.error('Missing DISCORD_BOT_TOKEN or DISCORD_GUILD_ID in env');
  process.exit(1);
}

const headers = {
  Authorization: `Bot ${TOKEN}`,
  'Content-Type': 'application/json',
};

// ── Discord permission bit flags ──
const VIEW_CHANNEL = '1024';
const SEND_MESSAGES = '2048';
const READ_MESSAGE_HISTORY = '65536';
const ATTACH_FILES = '32768';
const MANAGE_CHANNELS = '16';
const MANAGE_ROLES = '268435456';

function combinePerms(...perms: string[]): string {
  let result = BigInt(0);
  for (const p of perms) result |= BigInt(p);
  return result.toString();
}

async function api(path: string, method = 'GET', body?: any): Promise<any> {
  const url = `${API}${path}`;
  const opts: RequestInit = { method, headers };
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(url, opts);

  // Handle rate limits
  if (res.status === 429) {
    const data = await res.json();
    const retryAfter = (data.retry_after ?? 1) * 1000;
    console.log(`  [rate-limit] Waiting ${retryAfter}ms...`);
    await sleep(retryAfter + 500);
    return api(path, method, body);
  }

  if (res.status === 204) return null;

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Discord API ${method} ${path} → ${res.status}: ${text}`);
  }
  return text ? JSON.parse(text) : null;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// ── Permission overwrite helper ──
// type: 0 = role, 1 = member
interface Overwrite {
  id: string;
  type: 0 | 1;
  allow: string;
  deny: string;
}

function roleOverwrite(roleId: string, allow: string[], deny: string[]): Overwrite {
  return {
    id: roleId,
    type: 0,
    allow: combinePerms(...allow),
    deny: combinePerms(...deny),
  };
}

async function main() {
  console.log('[reset] Starting Discord server reset...\n');

  // Get bot user info
  const botUser = await api('/users/@me');
  const botUserId = botUser.id;
  console.log(`[reset] Logged in as ${botUser.username}#${botUser.discriminator} (${botUserId})\n`);

  // Find the bot's managed role (we'll need it later to allow sending in read-only channels)
  const allRoles: any[] = await api(`/guilds/${GUILD_ID}/roles`);
  const botManagedRole = allRoles.find((r: any) => r.managed && r.tags?.bot_id === botUserId);
  const botRoleId = botManagedRole?.id;
  if (botRoleId) {
    console.log(`[reset] Bot managed role: ${botManagedRole.name} (${botRoleId})\n`);
  } else {
    console.warn('[reset] Warning: Could not find bot managed role\n');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 1: DELETE ALL EXISTING CHANNELS
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('=== STEP 1: DELETE ALL CHANNELS ===');
  const channels: any[] = await api(`/guilds/${GUILD_ID}/channels`);

  for (const ch of channels) {
    try {
      await api(`/channels/${ch.id}`, 'DELETE');
      console.log(`  Deleted channel: #${ch.name} (type ${ch.type})`);
      await sleep(300);
    } catch (err: any) {
      console.warn(`  Could not delete #${ch.name}: ${err.message}`);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 2: DELETE ALL CUSTOM ROLES (except @everyone and bot-managed)
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n=== STEP 2: DELETE ALL CUSTOM ROLES ===');
  const roles: any[] = await api(`/guilds/${GUILD_ID}/roles`);

  for (const role of roles) {
    // Skip @everyone (id === guild id) and bot-managed roles
    if (role.id === GUILD_ID) continue;
    if (role.managed) continue;

    try {
      await api(`/guilds/${GUILD_ID}/roles/${role.id}`, 'DELETE');
      console.log(`  Deleted role: @${role.name}`);
      await sleep(300);
    } catch (err: any) {
      console.warn(`  Could not delete @${role.name}: ${err.message}`);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 3: CREATE ROLES
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n=== STEP 3: CREATE ROLES ===');

  // Note: Bot can only create roles with permissions it has itself.
  // Bot has: MANAGE_CHANNELS, ADD_REACTIONS, VIEW_CHANNEL, SEND_MESSAGES,
  //          ATTACH_FILES, READ_MESSAGE_HISTORY, MANAGE_ROLES
  const adminRole = await api(`/guilds/${GUILD_ID}/roles`, 'POST', {
    name: 'admin',
    color: 0xe74c3c,
    hoist: true,
    permissions: combinePerms(
      VIEW_CHANNEL, SEND_MESSAGES, READ_MESSAGE_HISTORY,
      MANAGE_CHANNELS, MANAGE_ROLES, ATTACH_FILES,
    ),
  });
  console.log(`  Created @admin: ${adminRole.id}`);
  await sleep(300);

  const coachRole = await api(`/guilds/${GUILD_ID}/roles`, 'POST', {
    name: 'coach',
    color: 0x0fa884,
    hoist: true,
    permissions: combinePerms(VIEW_CHANNEL, SEND_MESSAGES, READ_MESSAGE_HISTORY, ATTACH_FILES),
  });
  console.log(`  Created @coach: ${coachRole.id}`);
  await sleep(300);

  const clientRole = await api(`/guilds/${GUILD_ID}/roles`, 'POST', {
    name: 'client',
    color: 0x3b82f6,
    hoist: true,
    permissions: combinePerms(VIEW_CHANNEL, SEND_MESSAGES, READ_MESSAGE_HISTORY, ATTACH_FILES),
  });
  console.log(`  Created @client: ${clientRole.id}`);
  await sleep(300);

  const unverifiedRole = await api(`/guilds/${GUILD_ID}/roles`, 'POST', {
    name: 'unverified',
    color: 0x94a3b8,
    hoist: false,
    permissions: combinePerms(VIEW_CHANNEL, SEND_MESSAGES, READ_MESSAGE_HISTORY),
  });
  console.log(`  Created @unverified: ${unverifiedRole.id}`);
  await sleep(300);

  const everyoneId = GUILD_ID; // @everyone role ID = guild ID

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 4: CREATE SERVER STRUCTURE
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n=== STEP 4: CREATE SERVER STRUCTURE ===');

  // ── INFO category ──────────────────────────────────────────────────────────
  const infoCategory = await api(`/guilds/${GUILD_ID}/channels`, 'POST', {
    name: 'INFO',
    type: 4, // GUILD_CATEGORY
    permission_overwrites: [
      roleOverwrite(everyoneId, [VIEW_CHANNEL, READ_MESSAGE_HISTORY], [SEND_MESSAGES]),
    ],
  });
  console.log(`  Created INFO category: ${infoCategory.id}`);
  await sleep(300);

  // Helper: create a read-only channel, send a message, then lock it down.
  // Creates the channel WITHOUT a parent (so no inherited deny), sends message,
  // then moves it to the parent and applies the deny overwrite.
  async function createReadOnlyWithMessage(
    name: string,
    parentId: string,
    topic: string,
    messagePayload: any,
    extraOverwrites: Overwrite[] = [],
  ) {
    // Create channel without parent (no inherited deny, so bot can post)
    const ch = await api(`/guilds/${GUILD_ID}/channels`, 'POST', {
      name,
      type: 0,
      topic,
    });
    console.log(`  Created #${name}: ${ch.id}`);
    await sleep(300);

    // Send the message while channel is still open
    await api(`/channels/${ch.id}/messages`, 'POST', messagePayload);
    await sleep(300);

    // Now move to parent and lock the channel: deny SEND_MESSAGES for @everyone
    await api(`/channels/${ch.id}`, 'PATCH', {
      parent_id: parentId,
      permission_overwrites: [
        roleOverwrite(everyoneId, [VIEW_CHANNEL, READ_MESSAGE_HISTORY], [SEND_MESSAGES]),
        ...extraOverwrites,
      ],
    });
    await sleep(300);

    return ch;
  }

  const welcomeChannel = await createReadOnlyWithMessage(
    'welcome',
    infoCategory.id,
    'Welcome to FlowState! Read this first.',
    {
      embeds: [{
        title: 'Welcome to FlowState',
        description: [
          'FlowState is a 90-day human performance coaching program that optimizes your circadian rhythm, focus, and energy through daily check-ins and personalized interventions.',
          '',
          '**How to get started:**',
          '1. Apply at the landing page',
          '2. Get approved by your coach',
          '3. Receive your verification code via email',
          '4. Head to #verify and click the **Verify Account** button',
          '5. Your private channels will be created automatically',
        ].join('\n'),
        color: 0x0fa884,
      }],
    },
  );

  await createReadOnlyWithMessage(
    'rules',
    infoCategory.id,
    'Server rules',
    {
      embeds: [{
        title: 'Server Rules',
        description: [
          '1. **Check in daily** — Send your morning and evening check-in photos in your private channel',
          '2. **Be honest** — Accurate data = better coaching',
          '3. **Respect privacy** — Don\'t share others\' check-in data',
          '4. **Ask questions** — Your coach is here to help',
          '5. **Stay consistent** — Streaks matter for your progress',
        ].join('\n'),
        color: 0x0fa884,
      }],
    },
  );

  // Create without parent, then move + set overwrites
  const announcementsChannel = await api(`/guilds/${GUILD_ID}/channels`, 'POST', {
    name: 'announcements',
    type: 0,
    topic: 'Coach announcements',
  });
  console.log(`  Created #announcements: ${announcementsChannel.id}`);
  await sleep(300);
  await api(`/channels/${announcementsChannel.id}`, 'PATCH', {
    parent_id: infoCategory.id,
    permission_overwrites: [
      roleOverwrite(everyoneId, [VIEW_CHANNEL, READ_MESSAGE_HISTORY], [SEND_MESSAGES]),
      roleOverwrite(coachRole.id, [SEND_MESSAGES], []),
      roleOverwrite(adminRole.id, [SEND_MESSAGES], []),
    ],
  });
  await sleep(300);

  // ── GENERAL category ───────────────────────────────────────────────────────
  const generalCategory = await api(`/guilds/${GUILD_ID}/channels`, 'POST', {
    name: 'GENERAL',
    type: 4,
    permission_overwrites: [
      roleOverwrite(everyoneId, [VIEW_CHANNEL, SEND_MESSAGES, READ_MESSAGE_HISTORY], []),
    ],
  });
  console.log(`  Created GENERAL category: ${generalCategory.id}`);
  await sleep(300);

  const generalChat = await api(`/guilds/${GUILD_ID}/channels`, 'POST', {
    name: 'general-chat',
    type: 0,
    parent_id: generalCategory.id,
    topic: 'General discussion for the FlowState community',
  });
  console.log(`  Created #general-chat: ${generalChat.id}`);
  await sleep(300);

  const introductions = await api(`/guilds/${GUILD_ID}/channels`, 'POST', {
    name: 'introductions',
    type: 0,
    parent_id: generalCategory.id,
    topic: 'Introduce yourself to the community!',
  });
  console.log(`  Created #introductions: ${introductions.id}`);
  await sleep(300);

  // #resources — visible to client/coach/admin, only coach/admin can send
  const resources = await api(`/guilds/${GUILD_ID}/channels`, 'POST', {
    name: 'resources',
    type: 0,
    topic: 'Shared tools, frameworks, articles',
  });
  console.log(`  Created #resources: ${resources.id}`);
  await sleep(300);
  await api(`/channels/${resources.id}`, 'PATCH', {
    parent_id: generalCategory.id,
    permission_overwrites: [
      roleOverwrite(everyoneId, [], [VIEW_CHANNEL]),
      roleOverwrite(clientRole.id, [VIEW_CHANNEL, READ_MESSAGE_HISTORY], [SEND_MESSAGES]),
      roleOverwrite(coachRole.id, [VIEW_CHANNEL, SEND_MESSAGES, READ_MESSAGE_HISTORY], []),
      roleOverwrite(adminRole.id, [VIEW_CHANNEL, SEND_MESSAGES, READ_MESSAGE_HISTORY], []),
    ],
  });
  await sleep(300);

  // ── ADMIN category (hidden from everyone except admins) ────────────────────
  const adminCategory = await api(`/guilds/${GUILD_ID}/channels`, 'POST', {
    name: 'ADMIN',
    type: 4,
    permission_overwrites: [
      roleOverwrite(everyoneId, [], [VIEW_CHANNEL]),
      roleOverwrite(adminRole.id, [VIEW_CHANNEL, SEND_MESSAGES, READ_MESSAGE_HISTORY], []),
    ],
  });
  console.log(`  Created ADMIN category: ${adminCategory.id}`);
  await sleep(300);

  // Create admin channels without parent (to avoid inheriting VIEW_CHANNEL deny), then move
  const adminChat = await api(`/guilds/${GUILD_ID}/channels`, 'POST', {
    name: 'admin-chat',
    type: 0,
    topic: 'Private admin discussion',
  });
  console.log(`  Created #admin-chat: ${adminChat.id}`);
  await sleep(300);
  await api(`/channels/${adminChat.id}`, 'PATCH', {
    parent_id: adminCategory.id,
    permission_overwrites: [
      roleOverwrite(everyoneId, [], [VIEW_CHANNEL]),
      roleOverwrite(adminRole.id, [VIEW_CHANNEL, SEND_MESSAGES, READ_MESSAGE_HISTORY], []),
    ],
  });
  await sleep(300);

  const adminLogs = await api(`/guilds/${GUILD_ID}/channels`, 'POST', {
    name: 'admin-logs',
    type: 0,
    topic: 'Bot and system logs',
  });
  console.log(`  Created #admin-logs: ${adminLogs.id}`);
  await sleep(300);
  await api(`/channels/${adminLogs.id}`, 'PATCH', {
    parent_id: adminCategory.id,
    permission_overwrites: [
      roleOverwrite(everyoneId, [], [VIEW_CHANNEL]),
      roleOverwrite(adminRole.id, [VIEW_CHANNEL, READ_MESSAGE_HISTORY], [SEND_MESSAGES]),
    ],
  });
  await sleep(300);

  // ── COACH WORKSPACE category (hidden, coach/admin read-only, bot can send) ─
  const coachCategory = await api(`/guilds/${GUILD_ID}/channels`, 'POST', {
    name: 'COACH WORKSPACE',
    type: 4,
    permission_overwrites: [
      roleOverwrite(everyoneId, [], [VIEW_CHANNEL]),
      roleOverwrite(coachRole.id, [VIEW_CHANNEL, READ_MESSAGE_HISTORY], [SEND_MESSAGES]),
      roleOverwrite(adminRole.id, [VIEW_CHANNEL, READ_MESSAGE_HISTORY], [SEND_MESSAGES]),
      ...(botRoleId
        ? [roleOverwrite(botRoleId, [VIEW_CHANNEL, SEND_MESSAGES, READ_MESSAGE_HISTORY], [])]
        : []),
    ],
  });
  console.log(`  Created COACH WORKSPACE category: ${coachCategory.id}`);
  await sleep(300);

  const coachOverwrites: Overwrite[] = [
    roleOverwrite(everyoneId, [], [VIEW_CHANNEL]),
    roleOverwrite(coachRole.id, [VIEW_CHANNEL, READ_MESSAGE_HISTORY], [SEND_MESSAGES]),
    roleOverwrite(adminRole.id, [VIEW_CHANNEL, READ_MESSAGE_HISTORY], [SEND_MESSAGES]),
    ...(botRoleId
      ? [roleOverwrite(botRoleId, [VIEW_CHANNEL, SEND_MESSAGES, READ_MESSAGE_HISTORY], [])]
      : []),
  ];

  // #dashboard
  const dashboardChannel = await api(`/guilds/${GUILD_ID}/channels`, 'POST', {
    name: 'dashboard',
    type: 0,
    topic: 'Client overview and stats',
  });
  console.log(`  Created #dashboard: ${dashboardChannel.id}`);
  await sleep(300);
  await api(`/channels/${dashboardChannel.id}/messages`, 'POST', {
    embeds: [{
      title: 'Coach Dashboard',
      description: [
        'This channel is your at-a-glance overview of all active clients.',
        '',
        '**What you\'ll see here:**',
        '- Daily check-in summaries',
        '- Client streak updates',
        '- Program milestone notifications',
        '',
        'This channel is managed by the bot — messages are posted automatically.',
      ].join('\n'),
      color: 0x0fa884,
    }],
  });
  await sleep(300);
  await api(`/channels/${dashboardChannel.id}`, 'PATCH', {
    parent_id: coachCategory.id,
    permission_overwrites: coachOverwrites,
  });
  await sleep(300);

  // #alerts
  const alertsChannel = await api(`/guilds/${GUILD_ID}/channels`, 'POST', {
    name: 'alerts',
    type: 0,
    topic: 'Missed check-ins, streak breaks, and flagged items',
  });
  console.log(`  Created #alerts: ${alertsChannel.id}`);
  await sleep(300);
  await api(`/channels/${alertsChannel.id}/messages`, 'POST', {
    embeds: [{
      title: 'Coach Alerts',
      description: [
        'This channel surfaces items that need your attention.',
        '',
        '**Alert types:**',
        '- Missed check-ins',
        '- Broken streaks',
        '- Flagged AI analysis results',
        '- Client-initiated escalations',
        '',
        'This channel is managed by the bot — messages are posted automatically.',
      ].join('\n'),
      color: 0xe74c3c,
    }],
  });
  await sleep(300);
  await api(`/channels/${alertsChannel.id}`, 'PATCH', {
    parent_id: coachCategory.id,
    permission_overwrites: coachOverwrites,
  });
  await sleep(300);

  // #weekly-summaries
  const weeklySummariesChannel = await api(`/guilds/${GUILD_ID}/channels`, 'POST', {
    name: 'weekly-summaries',
    type: 0,
    topic: 'AI-generated weekly client summaries',
  });
  console.log(`  Created #weekly-summaries: ${weeklySummariesChannel.id}`);
  await sleep(300);
  await api(`/channels/${weeklySummariesChannel.id}/messages`, 'POST', {
    embeds: [{
      title: 'Weekly Summaries',
      description: [
        'AI-generated weekly reports for each active client.',
        '',
        '**Each summary includes:**',
        '- Check-in consistency and streak status',
        '- Energy, focus, and sleep trends',
        '- Key observations and recommendations',
        '',
        'Summaries are generated every Monday and posted here automatically.',
      ].join('\n'),
      color: 0x3b82f6,
    }],
  });
  await sleep(300);
  await api(`/channels/${weeklySummariesChannel.id}`, 'PATCH', {
    parent_id: coachCategory.id,
    permission_overwrites: coachOverwrites,
  });
  await sleep(300);

  // ── VERIFY category ────────────────────────────────────────────────────────
  const verifyCategory = await api(`/guilds/${GUILD_ID}/channels`, 'POST', {
    name: 'VERIFY',
    type: 4,
    permission_overwrites: [
      roleOverwrite(everyoneId, [VIEW_CHANNEL, READ_MESSAGE_HISTORY], [SEND_MESSAGES]),
      roleOverwrite(clientRole.id, [], [VIEW_CHANNEL]),
    ],
  });
  console.log(`  Created VERIFY category: ${verifyCategory.id}`);
  await sleep(300);

  const verifyChannel = await createReadOnlyWithMessage(
    'verify',
    verifyCategory.id,
    'Click the button below to verify your account',
    {
      embeds: [{
        title: 'Verify Your Account',
        description: [
          'Welcome to FlowState! To get started with the program, you need to verify your account.',
          '',
          'You should have received a **verification code** via email when your coach approved your application.',
          '',
          'Click the button below to begin the verification process.',
        ].join('\n'),
        color: 0x0fa884,
      }],
      components: [{
        type: 1, // ACTION_ROW
        components: [{
          type: 2, // BUTTON
          style: 3, // SUCCESS (green)
          label: 'Verify Account',
          emoji: { name: '\u2705' },
          custom_id: 'flowstate_verify',
        }],
      }],
    },
    [roleOverwrite(clientRole.id, [], [VIEW_CHANNEL])],
  );

  // ── FLOWSTATE-CLIENTS category ─────────────────────────────────────────────
  const clientCategory = await api(`/guilds/${GUILD_ID}/channels`, 'POST', {
    name: 'FLOWSTATE-CLIENTS',
    type: 4,
    permission_overwrites: [
      roleOverwrite(everyoneId, [], [VIEW_CHANNEL]),
      roleOverwrite(coachRole.id, [VIEW_CHANNEL, SEND_MESSAGES, READ_MESSAGE_HISTORY], []),
      roleOverwrite(adminRole.id, [VIEW_CHANNEL, SEND_MESSAGES, READ_MESSAGE_HISTORY], []),
    ],
  });
  console.log(`  Created FLOWSTATE-CLIENTS category: ${clientCategory.id}`);
  await sleep(300);

  // ═══════════════════════════════════════════════════════════════════════════
  // PRINT SUMMARY
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n' + '='.repeat(60));
  console.log('  SERVER RESET COMPLETE — UPDATE YOUR .env FILES');
  console.log('='.repeat(60) + '\n');
  console.log('# Discord IDs — copy to apps/bot/.env and apps/api/.env:\n');
  console.log(`DISCORD_GUILD_ID=${GUILD_ID}`);
  console.log(`DISCORD_ADMIN_ROLE_ID=${adminRole.id}`);
  console.log(`DISCORD_COACH_ROLE_ID=${coachRole.id}`);
  console.log(`DISCORD_CLIENT_ROLE_ID=${clientRole.id}`);
  console.log(`DISCORD_UNVERIFIED_ROLE_ID=${unverifiedRole.id}`);
  console.log(`DISCORD_CLIENT_CATEGORY_ID=${clientCategory.id}`);
  console.log(`DISCORD_VERIFY_CHANNEL_ID=${verifyChannel.id}`);
  console.log(`DISCORD_WELCOME_CHANNEL_ID=${welcomeChannel.id}`);
  console.log(`DISCORD_ANNOUNCEMENTS_CHANNEL_ID=${announcementsChannel.id}`);
  console.log(`DISCORD_GENERAL_CHAT_CHANNEL_ID=${generalChat.id}`);
  console.log(`DISCORD_ADMIN_CHAT_CHANNEL_ID=${adminChat.id}`);
  console.log(`DISCORD_ADMIN_LOGS_CHANNEL_ID=${adminLogs.id}`);
  console.log(`DISCORD_RESOURCES_CHANNEL_ID=${resources.id}`);
  console.log(`DISCORD_COACH_CATEGORY_ID=${coachCategory.id}`);
  console.log(`DISCORD_DASHBOARD_CHANNEL_ID=${dashboardChannel.id}`);
  console.log(`DISCORD_ALERTS_CHANNEL_ID=${alertsChannel.id}`);
  console.log(`DISCORD_WEEKLY_SUMMARIES_CHANNEL_ID=${weeklySummariesChannel.id}`);
  console.log('');
}

main()
  .then(() => {
    console.log('[reset] Done!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('[reset] Fatal error:', err);
    process.exit(1);
  });
