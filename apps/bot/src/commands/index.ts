/**
 * FlowState Bot — Slash command definitions and handler dispatch.
 *
 * Commands (coach only):
 *   /checkin [client]    — manually trigger check-in prompt
 *   /status [client]     — get adherence % and last check-in
 *   /pause [client] [days] — pause check-in reminders
 *   /summary [client]    — get this week's summary
 */

import {
  type ChatInputCommandInteraction,
  type Client,
  REST,
  Routes,
  SlashCommandBuilder,
} from 'discord.js';
import { getClientStatus, getWeeklySummary } from '../api.js';

const COACH_ROLE_PREFIX = 'coach';

// ─── Command definitions ──────────────────────────────────────────────────────

export const commands = [
  new SlashCommandBuilder()
    .setName('checkin')
    .setDescription('Manually send a check-in reminder to a client')
    .addStringOption((opt) =>
      opt.setName('client_id').setDescription('Client UUID').setRequired(true)
    )
    .addStringOption((opt) =>
      opt
        .setName('type')
        .setDescription('morning or evening')
        .addChoices(
          { name: 'Morning', value: 'morning' },
          { name: 'Evening', value: 'evening' }
        )
    ),

  new SlashCommandBuilder()
    .setName('status')
    .setDescription('Get a client's current adherence and last check-in')
    .addStringOption((opt) =>
      opt.setName('client_id').setDescription('Client UUID').setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName('pause')
    .setDescription('Pause a client's check-in reminders')
    .addStringOption((opt) =>
      opt.setName('client_id').setDescription('Client UUID').setRequired(true)
    )
    .addIntegerOption((opt) =>
      opt.setName('days').setDescription('Number of days to pause').setMinValue(1).setMaxValue(30)
    ),

  new SlashCommandBuilder()
    .setName('summary')
    .setDescription('Get this week's AI summary for a client')
    .addStringOption((opt) =>
      opt.setName('client_id').setDescription('Client UUID').setRequired(true)
    ),
].map((c) => c.toJSON());

// ─── Register commands with Discord ──────────────────────────────────────────

export async function registerCommands(): Promise<void> {
  const rest = new REST().setToken(process.env.DISCORD_BOT_TOKEN ?? '');
  const clientId = process.env.DISCORD_APPLICATION_ID ?? '';
  const guildId = process.env.DISCORD_GUILD_ID ?? '';

  await rest.put(Routes.applicationGuildCommands(clientId, guildId), {
    body: commands,
  });
  console.log('[commands] Slash commands registered');
}

// ─── Command handler dispatch ─────────────────────────────────────────────────

export async function handleCommand(
  interaction: ChatInputCommandInteraction,
  _client: Client
): Promise<void> {
  // Coach guard — only members with a role starting with 'coach' can use commands
  const member = interaction.guild?.members.cache.get(interaction.user.id);
  const isCoach = member?.roles.cache.some((r) =>
    r.name.toLowerCase().startsWith(COACH_ROLE_PREFIX)
  );

  if (!isCoach) {
    await interaction.reply({ content: 'This command is for coaches only.', ephemeral: true });
    return;
  }

  switch (interaction.commandName) {
    case 'status':
      await handleStatus(interaction);
      break;
    case 'summary':
      await handleSummary(interaction);
      break;
    case 'checkin':
      await handleCheckin(interaction);
      break;
    case 'pause':
      await handlePause(interaction);
      break;
    default:
      await interaction.reply({ content: 'Unknown command.', ephemeral: true });
  }
}

// ─── Individual handlers ──────────────────────────────────────────────────────

async function handleStatus(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply({ ephemeral: true });
  const clientId = interaction.options.getString('client_id', true);

  try {
    const client = await getClientStatus(clientId);
    const lastCheckin = client.last_checkin_at
      ? new Date(client.last_checkin_at).toLocaleString()
      : 'Never';

    await interaction.editReply(
      `**${client.full_name}** (${client.status})\n` +
      `• 7-day adherence: **${client.rolling_7d_adherence}%**\n` +
      `• Consecutive missed: ${client.consecutive_missed_checkins}\n` +
      `• Last check-in: ${lastCheckin}`
    );
  } catch (err) {
    await interaction.editReply(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }
}

async function handleSummary(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply({ ephemeral: true });
  const clientId = interaction.options.getString('client_id', true);

  try {
    const summaries = await getWeeklySummary(clientId);
    const latest = summaries[0];
    if (!latest) {
      await interaction.editReply('No weekly summaries found for this client.');
      return;
    }

    await interaction.editReply(
      `**Week ${latest.week_number} Summary** (${latest.avg_adherence}% adherence)\n\n${latest.ai_narrative}`
    );
  } catch (err) {
    await interaction.editReply(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }
}

async function handleCheckin(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply({ ephemeral: true });
  const clientId = interaction.options.getString('client_id', true);
  const type = (interaction.options.getString('type') ?? 'morning') as 'morning' | 'evening';

  // Fetch client to get channel ID then send reminder via Discord REST (API does this too, but from bot it's direct)
  try {
    const client = await getClientStatus(clientId);
    // We need the channel ID — get it from client status
    // Actually let's call the channel lookup
    const { getClientByChannel } = await import('../api.js');
    // We don't have channel ID here — we have client ID
    // Use a direct API call to get full client record
    const apiUrl = process.env.BACKEND_URL ?? 'http://localhost:8080';
    const res = await fetch(`${apiUrl}/api/clients/${clientId}`, {
      headers: { 'X-Bot-Token': process.env.BOT_INTERNAL_API_TOKEN ?? '' },
    });

    if (!res.ok) throw new Error('Failed to fetch client');
    const fullClient = await res.json() as { discord_channel_id?: string };

    if (!fullClient.discord_channel_id) {
      await interaction.editReply('Client has no Discord channel configured.');
      return;
    }

    const channel = await interaction.client.channels.fetch(fullClient.discord_channel_id);
    if (!channel?.isTextBased()) {
      await interaction.editReply('Client channel not accessible.');
      return;
    }

    const emoji = type === 'morning' ? '🌅' : '🌙';
    await (channel as import('discord.js').TextChannel).send(
      `${emoji} **Manual ${type} check-in prompt**\n\nHey ${client.full_name.split(' ')[0]}! Your coach has sent a check-in reminder. Please reply with your photo 📸 and a quick note.`
    );

    await interaction.editReply(`✅ ${type} check-in prompt sent to ${client.full_name}.`);
  } catch (err) {
    await interaction.editReply(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }
}

async function handlePause(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply({ ephemeral: true });
  const clientId = interaction.options.getString('client_id', true);
  const _days = interaction.options.getInteger('days') ?? 1;

  try {
    const { pauseClient } = await import('../api.js');
    await pauseClient(clientId);
    await interaction.editReply(`✅ Client ${clientId} paused. Restart via the portal.`);
  } catch (err) {
    await interaction.editReply(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }
}
