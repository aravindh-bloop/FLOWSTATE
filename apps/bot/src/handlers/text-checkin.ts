/**
 * Text-only check-in handler.
 *
 * Triggered when a message WITHOUT image attachments is received
 * in a client channel (FLOWSTATE-CLIENTS category).
 *
 * Parses the text for check-in data and submits to the API.
 */

import { EmbedBuilder } from 'discord.js';
import type { Message } from 'discord.js';
import { getClientByChannel, submitCheckIn } from '../api.js';
import { postToDashboard } from '../utils/coach-channels.js';

export async function handleTextCheckin(message: Message): Promise<void> {
  const text = message.content.trim();
  if (!text) return;

  // Resolve client from channel
  let client;
  try {
    client = await getClientByChannel(message.channelId);
  } catch {
    return; // Not a client channel
  }

  await message.react('⏳').catch(() => null);

  try {
    // Determine check-in type from time of day
    const hour = new Date().getHours();
    const type: 'morning' | 'evening' = hour < 13 ? 'morning' : 'evening';

    // Parse ratings from text (e.g., "energy: 7", "sleep: 8h", "focus: 6")
    const parsed = parseTextCheckin(text);

    const result = await submitCheckIn({
      client_id: client.id,
      discord_message_id: message.id,
      type,
      client_note: text,
      ai_analysis: `Text check-in: ${text}`,
      ai_model_used: 'text-parse',
      energy_rating: parsed.energy ?? undefined,
      focus_rating: parsed.focus ?? undefined,
      sleep_hours: parsed.sleep ?? undefined,
      program_week: client.program_week,
      program_day: client.program_day,
    });

    const streak = (result as any).streak ?? 0;

    const embed = new EmbedBuilder()
      .setColor(0x0fa884)
      .setTitle(`${type === 'morning' ? '🌅' : '🌙'} Check-in logged!`)
      .setDescription(text.length > 200 ? text.slice(0, 200) + '...' : text)
      .setTimestamp();

    if (streak > 0) {
      embed.addFields({ name: '🔥 Streak', value: `${streak} day${streak !== 1 ? 's' : ''}`, inline: true });
    }
    if (parsed.energy) {
      embed.addFields({ name: 'Energy', value: `${parsed.energy}/10`, inline: true });
    }
    if (parsed.focus) {
      embed.addFields({ name: 'Focus', value: `${parsed.focus}/10`, inline: true });
    }
    if (parsed.sleep) {
      embed.addFields({ name: 'Sleep', value: `${parsed.sleep}h`, inline: true });
    }

    await message.reply({ embeds: [embed] });

    // Post summary to #dashboard for coach visibility
    const dashEmbed = new EmbedBuilder()
      .setColor(type === 'morning' ? 0x0fa884 : 0x3b82f6)
      .setTitle(`${type === 'morning' ? '🌅' : '🌙'} ${client.full_name.split(' ')[0]} — ${type} text check-in`)
      .setDescription(text.length > 200 ? text.slice(0, 200) + '...' : text)
      .setTimestamp();
    if (streak > 0) dashEmbed.setFooter({ text: `🔥 ${streak} day streak` });

    postToDashboard(message.client, dashEmbed).catch(() => {});

    await message.reactions.cache.get('⏳')?.remove().catch(() => null);
    await message.react('✅').catch(() => null);
  } catch (err) {
    console.error('[text-checkin] Error:', err);
    await message.reactions.cache.get('⏳')?.remove().catch(() => null);
    await message.react('❌').catch(() => null);
    await message.reply('Something went wrong processing your text check-in. Please try again.').catch(() => null);
  }
}

function parseTextCheckin(text: string): {
  energy: number | null;
  focus: number | null;
  sleep: number | null;
} {
  const lower = text.toLowerCase();

  const energyMatch = lower.match(/energy[:\s]*(\d+)/);
  const focusMatch = lower.match(/focus[:\s]*(\d+)/);
  const sleepMatch = lower.match(/sleep[:\s]*(\d+\.?\d*)/);

  const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

  return {
    energy: energyMatch ? clamp(parseInt(energyMatch[1], 10), 1, 10) : null,
    focus: focusMatch ? clamp(parseInt(focusMatch[1], 10), 1, 10) : null,
    sleep: sleepMatch ? clamp(parseFloat(sleepMatch[1]), 0, 24) : null,
  };
}
