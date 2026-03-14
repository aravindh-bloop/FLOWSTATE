/**
 * FlowState Discord Bot — entry point.
 *
 * Responsibilities:
 *   1. Register slash commands on startup
 *   2. Listen for photo messages in client channels → photo handler
 *   3. Listen for text messages in client channels → text check-in handler
 *   4. Listen for slash command interactions → command dispatch
 *   5. Auto-assign @unverified role to new members + DM welcome
 *   6. Poll /api/bot/pending-deliveries every 60s → delivery job
 *
 * The backend (apps/api) handles cron-based AM/PM reminder sending
 * via Discord REST API directly. The bot handles interactive events.
 */

import {
  Client,
  Events,
  GatewayIntentBits,
  Partials,
  EmbedBuilder,
  ActivityType,
  type Message,
  type GuildMember,
} from 'discord.js';
import { registerCommands, handleCommand } from './commands/index.js';
import { handlePhotoMessage } from './handlers/photo.js';
import { handleTextCheckin } from './handlers/text-checkin.js';
import { handleVerification, handleVerifyButton, handleVerifyModal } from './handlers/verify.js';
import { startDeliveryPoller } from './jobs/deliveries.js';

const GUILD_ID = process.env.DISCORD_GUILD_ID ?? '';
const VERIFY_CHANNEL_ID = process.env.DISCORD_VERIFY_CHANNEL_ID ?? '';
const UNVERIFIED_ROLE_ID = process.env.DISCORD_UNVERIFIED_ROLE_ID ?? '';

// ─── Discord client ───────────────────────────────────────────────────────────

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
  partials: [Partials.Message, Partials.Channel],
});

// ─── Ready ────────────────────────────────────────────────────────────────────

client.once(Events.ClientReady, async (readyClient) => {
  console.log(`[bot] Logged in as ${readyClient.user.tag}`);

  // Set bot presence to Online with activity
  readyClient.user.setPresence({
    status: 'online',
    activities: [{ name: 'FlowState Coaching', type: ActivityType.Watching }],
  });

  // Register slash commands (non-blocking — don't let rate limits stall the bot)
  const cmdTimeout = setTimeout(() => console.warn('[bot] Slash command registration taking long (rate limited?)'), 5000);
  registerCommands()
    .then(() => clearTimeout(cmdTimeout))
    .catch((err) => {
      clearTimeout(cmdTimeout);
      console.error('[bot] Failed to register commands:', err);
    });

  // Start intervention delivery poller
  startDeliveryPoller(readyClient);

  console.log('[bot] FlowState bot ready');
});

// ─── New member join — auto-assign @unverified + DM ──────────────────────────

client.on(Events.GuildMemberAdd, async (member: GuildMember) => {
  if (member.guild.id !== GUILD_ID) return;

  // Assign @unverified role
  if (UNVERIFIED_ROLE_ID) {
    await member.roles.add(UNVERIFIED_ROLE_ID).catch((err) =>
      console.error(`[bot] Failed to assign @unverified to ${member.user.tag}:`, err)
    );
    console.log(`[bot] Assigned @unverified to ${member.user.tag}`);
  }

  // Send welcome DM
  const verifyMention = VERIFY_CHANNEL_ID ? `<#${VERIFY_CHANNEL_ID}>` : '#verify';
  const embed = new EmbedBuilder()
    .setColor(0x0fa884)
    .setTitle('Welcome to FlowState!')
    .setDescription(
      `Hey ${member.user.username}! Welcome to the FlowState coaching server.\n\n` +
      `**To get started:**\n` +
      `1. Head to ${verifyMention}\n` +
      `2. Click the **✅ Verify Account** button\n` +
      `3. Enter the verification code from your email\n\n` +
      `You received your code when your coach approved your application.`
    )
    .setTimestamp();

  await member.send({ embeds: [embed] }).catch(() => {
    // DMs may be disabled — not critical
    console.warn(`[bot] Could not DM ${member.user.tag} (DMs disabled?)`);
  });
});

// ─── Message events (check-ins + verification) ──────────────────────────────

client.on(Events.MessageCreate, async (message: Message) => {
  // Ignore bots
  if (message.author.bot) return;
  if (!message.guildId || message.guildId !== GUILD_ID) return;

  // 1. Handle Verification in #verify channel
  if (VERIFY_CHANNEL_ID && message.channelId === VERIFY_CHANNEL_ID) {
    await handleVerification(message).catch((err) =>
      console.error('[bot] Verification handler error:', err)
    );
    return;
  }

  // 2. Skip messages in known non-client channels (info, general, admin, verify)
  // For client channels (per-client categories), the handlers will verify via API lookup
  const channel = message.channel;
  if (!('parentId' in channel)) return;
  // Don't process messages in channels without a parent (DMs, etc.)

  // 3. Route to photo or text handler
  const hasImage = message.attachments.some((a) =>
    (a.contentType ?? '').startsWith('image/')
  );

  if (hasImage) {
    await handlePhotoMessage(message).catch((err) =>
      console.error('[bot] Photo handler error:', err)
    );
  } else if (message.content.trim()) {
    await handleTextCheckin(message).catch((err) =>
      console.error('[bot] Text check-in handler error:', err)
    );
  }
});

// ─── Interactions (commands, buttons, modals) ────────────────────────────────

client.on(Events.InteractionCreate, async (interaction) => {
  // Slash commands
  if (interaction.isChatInputCommand()) {
    await handleCommand(interaction, client).catch((err) =>
      console.error('[bot] Command handler error:', err)
    );
    return;
  }

  // Button clicks (verify button)
  if (interaction.isButton()) {
    await handleVerifyButton(interaction).catch((err) =>
      console.error('[bot] Button handler error:', err)
    );
    return;
  }

  // Modal submissions (verify modal)
  if (interaction.isModalSubmit()) {
    await handleVerifyModal(interaction).catch((err) =>
      console.error('[bot] Modal handler error:', err)
    );
    return;
  }
});

// ─── Login ────────────────────────────────────────────────────────────────────

const token = process.env.DISCORD_BOT_TOKEN;
if (!token) {
  console.error('[bot] DISCORD_BOT_TOKEN is not set');
  process.exit(1);
}

client.login(token).catch((err) => {
  console.error('[bot] Failed to login:', err);
  process.exit(1);
});
