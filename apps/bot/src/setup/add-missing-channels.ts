/**
 * Add missing Discord channels — run once manually.
 *
 * Usage:
 *   cd "D:/FLOWSTATE DISCORD/FLOWSTATE"
 *   npx tsx apps/bot/src/setup/add-missing-channels.ts
 *
 * This will:
 *   1. Fetch existing roles to find @admin, @coach, @client IDs
 *   2. Add #resources channel under the existing GENERAL category
 *   3. Create COACH WORKSPACE category with #dashboard, #alerts, #weekly-summaries
 *   4. Print all new channel IDs for .env update
 */

// ── Hardcoded env vars (one-time script) ──
const TOKEN = process.env.DISCORD_BOT_TOKEN;
const GUILD_ID = process.env.DISCORD_GUILD_ID;
const GENERAL_CATEGORY_ID = '1481497485020102806';

const API = 'https://discord.com/api/v10';

const headers = {
  Authorization: `Bot ${TOKEN}`,
  'Content-Type': 'application/json',
};

// ── Discord permission bit flags ──
const VIEW_CHANNEL = '1024';
const SEND_MESSAGES = '2048';
const READ_MESSAGE_HISTORY = '65536';

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
  console.log('[add-channels] Starting — adding missing channels...\n');

  // Get bot user info
  const botUser = await api('/users/@me');
  const botUserId = botUser.id;
  console.log(`[add-channels] Logged in as ${botUser.username}#${botUser.discriminator} (${botUserId})\n`);

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 1: FETCH EXISTING ROLES
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('=== STEP 1: FETCH EXISTING ROLES ===');

  const allRoles: any[] = await api(`/guilds/${GUILD_ID}/roles`);
  const everyoneId = GUILD_ID;

  const adminRole = allRoles.find((r: any) => r.name === 'admin' && !r.managed);
  const coachRole = allRoles.find((r: any) => r.name === 'coach' && !r.managed);
  const clientRole = allRoles.find((r: any) => r.name === 'client' && !r.managed);
  const botManagedRole = allRoles.find((r: any) => r.managed && r.tags?.bot_id === botUserId);

  if (!adminRole || !coachRole || !clientRole) {
    console.error('[add-channels] Could not find required roles (@admin, @coach, @client).');
    console.error('  Found roles:', allRoles.map((r: any) => `@${r.name} (${r.id})`).join(', '));
    process.exit(1);
  }

  console.log(`  @admin:  ${adminRole.id}`);
  console.log(`  @coach:  ${coachRole.id}`);
  console.log(`  @client: ${clientRole.id}`);
  if (botManagedRole) {
    console.log(`  Bot role: ${botManagedRole.name} (${botManagedRole.id})`);
  } else {
    console.warn('  Warning: Could not find bot managed role');
  }
  console.log('');

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 2: CREATE #resources UNDER GENERAL CATEGORY
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('=== STEP 2: CREATE #resources UNDER GENERAL ===');

  // #resources: visible to @client and above, only @coach and @admin can send
  const resourcesChannel = await api(`/guilds/${GUILD_ID}/channels`, 'POST', {
    name: 'resources',
    type: 0,
    parent_id: GENERAL_CATEGORY_ID,
    topic: 'Shared tools, frameworks, articles',
    permission_overwrites: [
      // @everyone cannot view (hide from unverified)
      roleOverwrite(everyoneId, [], [VIEW_CHANNEL, SEND_MESSAGES]),
      // @client can view and read but not send
      roleOverwrite(clientRole.id, [VIEW_CHANNEL, READ_MESSAGE_HISTORY], [SEND_MESSAGES]),
      // @coach can view, read, and send
      roleOverwrite(coachRole.id, [VIEW_CHANNEL, SEND_MESSAGES, READ_MESSAGE_HISTORY], []),
      // @admin can view, read, and send
      roleOverwrite(adminRole.id, [VIEW_CHANNEL, SEND_MESSAGES, READ_MESSAGE_HISTORY], []),
    ],
  });
  console.log(`  Created #resources: ${resourcesChannel.id}`);
  await sleep(300);

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 3: CREATE COACH WORKSPACE CATEGORY + CHANNELS
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n=== STEP 3: CREATE COACH WORKSPACE ===');

  // Category: hidden from everyone except @coach and @admin
  const coachCategory = await api(`/guilds/${GUILD_ID}/channels`, 'POST', {
    name: 'COACH WORKSPACE',
    type: 4, // GUILD_CATEGORY
    permission_overwrites: [
      roleOverwrite(everyoneId, [], [VIEW_CHANNEL]),
      roleOverwrite(coachRole.id, [VIEW_CHANNEL, READ_MESSAGE_HISTORY], []),
      roleOverwrite(adminRole.id, [VIEW_CHANNEL, READ_MESSAGE_HISTORY], []),
    ],
  });
  console.log(`  Created COACH WORKSPACE category: ${coachCategory.id}`);
  await sleep(300);

  // Build the channel permission overwrites for bot-only-send channels:
  //   - @everyone: deny VIEW
  //   - @coach: allow VIEW + READ, deny SEND
  //   - @admin: allow VIEW + READ, deny SEND
  //   - Bot role: allow VIEW + SEND + READ (so bot can post)
  function coachWorkspaceChannelOverwrites(): Overwrite[] {
    const overwrites: Overwrite[] = [
      roleOverwrite(everyoneId, [], [VIEW_CHANNEL]),
      roleOverwrite(coachRole.id, [VIEW_CHANNEL, READ_MESSAGE_HISTORY], [SEND_MESSAGES]),
      roleOverwrite(adminRole.id, [VIEW_CHANNEL, READ_MESSAGE_HISTORY], [SEND_MESSAGES]),
    ];
    // Allow bot managed role to send messages
    if (botManagedRole) {
      overwrites.push(
        roleOverwrite(botManagedRole.id, [VIEW_CHANNEL, SEND_MESSAGES, READ_MESSAGE_HISTORY], []),
      );
    }
    return overwrites;
  }

  // Helper: create channel without parent, send welcome embed, then move + lock
  // (same pattern as reset-server.ts to avoid inheriting deny overwrites before posting)
  async function createCoachChannel(
    name: string,
    topic: string,
    embedTitle: string,
    embedDescription: string,
    embedColor: number,
  ) {
    // Create channel without parent so bot can post freely
    const ch = await api(`/guilds/${GUILD_ID}/channels`, 'POST', {
      name,
      type: 0,
      topic,
    });
    console.log(`  Created #${name}: ${ch.id}`);
    await sleep(300);

    // Send welcome embed while channel is still open
    await api(`/channels/${ch.id}/messages`, 'POST', {
      embeds: [{
        title: embedTitle,
        description: embedDescription,
        color: embedColor,
      }],
    });
    console.log(`  Sent welcome embed in #${name}`);
    await sleep(300);

    // Move to parent category and apply permission overwrites
    await api(`/channels/${ch.id}`, 'PATCH', {
      parent_id: coachCategory.id,
      permission_overwrites: coachWorkspaceChannelOverwrites(),
    });
    await sleep(300);

    return ch;
  }

  // #dashboard
  const dashboardChannel = await createCoachChannel(
    'dashboard',
    'Daily check-in summaries posted by MILO',
    '\ud83d\udcca Dashboard',
    [
      'This channel is where **MILO** posts daily check-in summaries for all active clients.',
      '',
      'Each morning, you\'ll see an overview of:',
      '- Who checked in yesterday (and who didn\'t)',
      '- Energy, focus, and sleep scores across the cohort',
      '- Streak updates and milestones',
      '',
      '_Summaries are generated automatically — no action needed from you._',
    ].join('\n'),
    0x0fa884,
  );

  // #alerts
  const alertsChannel = await createCoachChannel(
    'alerts',
    'Urgent client flags and alerts',
    '\ud83d\udea8 Alerts',
    [
      'This channel surfaces **urgent flags** that need your attention.',
      '',
      'You\'ll be notified here when:',
      '- A client misses 2+ consecutive check-ins',
      '- Energy or focus scores drop significantly',
      '- A client\'s streak is broken after a long run',
      '- AI detects concerning patterns in check-in data',
      '',
      '_Alerts are automated — react or follow up in the client\'s private channel._',
    ].join('\n'),
    0xe74c3c,
  );

  // #weekly-summaries
  const weeklySummariesChannel = await createCoachChannel(
    'weekly-summaries',
    'Weekly AI-generated coaching summaries',
    '\ud83d\udccb Weekly Summaries',
    [
      'Every week, **MILO** generates AI-powered coaching summaries for each active client.',
      '',
      'Each summary includes:',
      '- Week-over-week trends in energy, focus, and sleep',
      '- Check-in consistency and streak progress',
      '- Suggested coaching interventions',
      '- Notable patterns or changes in behavior',
      '',
      '_Summaries are posted every Monday morning._',
    ].join('\n'),
    0x3b82f6,
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // PRINT SUMMARY
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n' + '='.repeat(60));
  console.log('  CHANNELS CREATED — UPDATE YOUR .env FILES');
  console.log('='.repeat(60) + '\n');
  console.log('# New Discord channel IDs — add to apps/bot/.env and apps/api/.env:\n');
  console.log(`DISCORD_RESOURCES_CHANNEL_ID=${resourcesChannel.id}`);
  console.log(`DISCORD_COACH_CATEGORY_ID=${coachCategory.id}`);
  console.log(`DISCORD_DASHBOARD_CHANNEL_ID=${dashboardChannel.id}`);
  console.log(`DISCORD_ALERTS_CHANNEL_ID=${alertsChannel.id}`);
  console.log(`DISCORD_WEEKLY_SUMMARIES_CHANNEL_ID=${weeklySummariesChannel.id}`);
  console.log('');
}

main()
  .then(() => {
    console.log('[add-channels] Done!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('[add-channels] Fatal error:', err);
    process.exit(1);
  });
