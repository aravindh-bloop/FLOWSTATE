/**
 * Check-in reminder job (every 15 min — cron: "* /15 * * * *")
 *
 * Every 15 minutes: find active clients whose AM or PM check-in time
 * falls within the current ±7-minute window, then POST the reminder
 * message directly to their Discord channel via Discord REST API.
 */

import { query } from '../db.js';

const DISCORD_API = 'https://discord.com/api/v10';
const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;

function formatTime(t: string) {
  // t is "HH:MM:SS" from Postgres time type — return "HH:MM"
  return t.slice(0, 5);
}

async function sendDiscordMessage(
  channelId: string,
  content: string
): Promise<void> {
  const res = await fetch(`${DISCORD_API}/channels/${channelId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bot ${BOT_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ content }),
  });
  if (!res.ok) {
    const body = await res.text();
    console.error(`[reminders] Discord API error ${res.status}: ${body}`);
  }
}

function buildAmMessage(client: {
  full_name: string;
  program_week: number;
  program_day: number;
  target_wake_time: string;
  morning_light_duration_min: number;
  morning_exercise_time: string;
  target_caffeine_cutoff: string;
  target_peak_window: string;
}): string {
  return (
    `🌅 **Morning Check-In — Week ${client.program_week}, Day ${client.program_day}**\n\n` +
    `Hey ${client.full_name.split(' ')[0]}! Today's targets:\n` +
    `• Wake: ${formatTime(client.target_wake_time)}\n` +
    `• Morning light: ${client.morning_light_duration_min} min\n` +
    `• Exercise: ${client.morning_exercise_time}\n` +
    `• Caffeine cutoff: ${formatTime(client.target_caffeine_cutoff)}\n` +
    `• Peak window: ${client.target_peak_window}\n\n` +
    `Reply with your check-in photo 📸 and a quick note on last night's sleep.`
  );
}

function buildPmMessage(client: {
  full_name: string;
  program_week: number;
}): string {
  return (
    `🌙 **Evening Check-In — Week ${client.program_week}**\n\n` +
    `Hey ${client.full_name.split(' ')[0]}! End of day:\n` +
    `• Energy today (1–10)?\n` +
    `• Focus blocks completed?\n` +
    `• Anything blocking tomorrow's morning routine?\n\n` +
    `Optional: attach wearable screenshot 📊`
  );
}

export async function runCheckinReminders(
  type: 'morning' | 'evening'
): Promise<void> {
  if (!BOT_TOKEN) {
    console.warn(
      '[reminders] DISCORD_BOT_TOKEN not set — skipping reminder job'
    );
    return;
  }

  const field = type === 'morning' ? 'checkin_time_am' : 'checkin_time_pm';

  const clients = await query<{
    id: string;
    full_name: string;
    discord_channel_id: string;
    program_week: number;
    program_day: number;
    target_wake_time: string;
    morning_light_duration_min: number;
    morning_exercise_time: string;
    target_caffeine_cutoff: string;
    target_peak_window: string;
  }>(`
    SELECT
      id, full_name, discord_channel_id, program_week, program_day,
      target_wake_time, morning_light_duration_min, morning_exercise_time,
      target_caffeine_cutoff, target_peak_window
    FROM clients
    WHERE status = 'active'
      AND discord_channel_id IS NOT NULL
      AND ${field}::time BETWEEN
          (NOW() AT TIME ZONE 'UTC')::time - INTERVAL '7 minutes' AND
          (NOW() AT TIME ZONE 'UTC')::time + INTERVAL '7 minutes'
  `);

  if (clients.length === 0) return;

  console.log(
    `[reminders] Sending ${type} reminders to ${clients.length} clients`
  );

  await Promise.allSettled(
    clients.map(client => {
      const message =
        type === 'morning' ? buildAmMessage(client) : buildPmMessage(client);
      return sendDiscordMessage(client.discord_channel_id, message);
    })
  );
}
