/**
 * FlowState Discord Bot — entry point.
 *
 * Responsibilities:
 *   1. Register slash commands on startup
 *   2. Listen for photo messages in client channels → photo handler
 *   3. Listen for slash command interactions → command dispatch
 *   4. Poll /api/bot/pending-deliveries every 60s → delivery job
 *
 * The backend (apps/api) handles cron-based AM/PM reminder sending
 * via Discord REST API directly. The bot handles interactive events.
 */

import {
  Client,
  Events,
  GatewayIntentBits,
  Partials,
  type Message,
} from 'discord.js';
import { registerCommands, handleCommand } from './commands/index.js';
import { handlePhotoMessage } from './handlers/photo.js';
import { startDeliveryPoller } from './jobs/deliveries.js';

const GUILD_ID = process.env.DISCORD_GUILD_ID ?? '';
const CLIENT_CATEGORY_ID = process.env.DISCORD_CLIENT_CATEGORY_ID ?? '';

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

  // Register slash commands
  await registerCommands().catch((err) =>
    console.error('[bot] Failed to register commands:', err)
  );

  // Start intervention delivery poller
  startDeliveryPoller(readyClient);

  console.log('[bot] FlowState bot ready');
});

// ─── Message events (photo check-ins) ────────────────────────────────────────

client.on(Events.MessageCreate, async (message: Message) => {
  // Ignore bots
  if (message.author.bot) return;
  if (!message.guildId || message.guildId !== GUILD_ID) return;

  // Only process messages in the FLOWSTATE-CLIENTS category
  const channel = message.channel;
  if (!('parentId' in channel)) return;

  const parentId = (channel as { parentId?: string | null }).parentId;
  if (CLIENT_CATEGORY_ID && parentId !== CLIENT_CATEGORY_ID) return;

  // Only handle messages with image attachments
  const hasImage = message.attachments.some((a) =>
    (a.contentType ?? '').startsWith('image/')
  );
  if (!hasImage) return;

  await handlePhotoMessage(message).catch((err) =>
    console.error('[bot] Photo handler error:', err)
  );
});

// ─── Slash command interactions ───────────────────────────────────────────────

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  await handleCommand(interaction, client).catch((err) =>
    console.error('[bot] Command handler error:', err)
  );
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
