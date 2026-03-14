/**
 * Coach workspace channel helpers.
 *
 * Posts embeds to coach-facing Discord channels:
 *   #dashboard — check-in summaries
 *   #alerts — intervention deliveries, missed check-ins, etc.
 *   #weekly-summaries — weekly AI narrative summaries
 */

import type { Client, EmbedBuilder, TextChannel } from 'discord.js';

const DASHBOARD_CHANNEL_ID = process.env.DISCORD_DASHBOARD_CHANNEL_ID ?? '';
const ALERTS_CHANNEL_ID = process.env.DISCORD_ALERTS_CHANNEL_ID ?? '';
const WEEKLY_SUMMARIES_CHANNEL_ID = process.env.DISCORD_WEEKLY_SUMMARIES_CHANNEL_ID ?? '';

export async function postToDashboard(client: Client, embed: EmbedBuilder): Promise<void> {
  if (!DASHBOARD_CHANNEL_ID) return;
  try {
    const channel = await client.channels.fetch(DASHBOARD_CHANNEL_ID);
    if (channel?.isTextBased()) {
      await (channel as TextChannel).send({ embeds: [embed] });
    }
  } catch (err) {
    console.error('[coach-channels] Failed to post to #dashboard:', err);
  }
}

export async function postToAlerts(client: Client, embed: EmbedBuilder): Promise<void> {
  if (!ALERTS_CHANNEL_ID) return;
  try {
    const channel = await client.channels.fetch(ALERTS_CHANNEL_ID);
    if (channel?.isTextBased()) {
      await (channel as TextChannel).send({ embeds: [embed] });
    }
  } catch (err) {
    console.error('[coach-channels] Failed to post to #alerts:', err);
  }
}

export async function postToWeeklySummaries(client: Client, embed: EmbedBuilder): Promise<void> {
  if (!WEEKLY_SUMMARIES_CHANNEL_ID) return;
  try {
    const channel = await client.channels.fetch(WEEKLY_SUMMARIES_CHANNEL_ID);
    if (channel?.isTextBased()) {
      await (channel as TextChannel).send({ embeds: [embed] });
    }
  } catch (err) {
    console.error('[coach-channels] Failed to post to #weekly-summaries:', err);
  }
}
