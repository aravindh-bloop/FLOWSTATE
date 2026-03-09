/**
 * Photo message handler.
 *
 * Triggered whenever a message with an image attachment is received
 * in any channel under the FLOWSTATE-CLIENTS category.
 *
 * Flow (as per PRD §discord_bot.check_in_flow.on_photo_received):
 *   1. Resolve client from channel ID
 *   2. Add ⏳ reaction
 *   3. Download photo, upload to R2
 *   4. Call Gemini Flash Vision
 *   5. Parse AI response
 *   6. POST to /api/bot/checkin
 *   7. Backend writes, recalculates adherence, triggers alert pipeline
 *   8. Post AI feedback as reply
 *   9. Remove ⏳, add ✅
 */

import type { Message } from 'discord.js';
import { getClientByChannel, submitCheckIn } from '../api.js';
import { uploadCheckInPhoto } from '../r2.js';
import { analyseCheckInPhoto } from '../gemini.js';

export async function handlePhotoMessage(message: Message): Promise<void> {
  const attachment = message.attachments.first();
  if (!attachment) return;

  const mimeType = attachment.contentType ?? 'image/jpeg';
  if (!mimeType.startsWith('image/')) return;

  // Step 1: resolve client
  let client;
  try {
    client = await getClientByChannel(message.channelId);
  } catch {
    // Not a client channel — ignore
    return;
  }

  // Step 2: processing reaction
  await message.react('⏳').catch(() => null);

  try {
    // Step 3: download photo
    const res = await fetch(attachment.url);
    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to R2
    const photoUrl = await uploadCheckInPhoto(client.id, buffer, mimeType);

    // Determine check-in type from time of day / channel context
    const hour = new Date().getHours();
    const type: 'morning' | 'evening' | 'wearable' =
      hour < 13 ? 'morning' : 'evening';

    // Step 4 + 5: Gemini analysis
    const analysis = await analyseCheckInPhoto(buffer, mimeType, client, type);

    // Step 6: POST to backend
    await submitCheckIn({
      client_id: client.id,
      discord_message_id: message.id,
      type,
      photo_url: photoUrl,
      client_note: message.content || undefined,
      ai_analysis: analysis.narrative,
      ai_model_used: 'gemini-2.0-flash',
      adherence_score: analysis.adherence_score ?? undefined,
      exercise_completed: analysis.exercise_completed ?? undefined,
      morning_light_completed: analysis.morning_light_completed ?? undefined,
      caffeine_cutoff_met: analysis.caffeine_cutoff_met ?? undefined,
      wake_time_actual: analysis.wake_time_actual ?? undefined,
      sleep_hours: analysis.sleep_hours ?? undefined,
      energy_rating: analysis.energy_rating ?? undefined,
      focus_rating: analysis.focus_rating ?? undefined,
      program_week: client.program_week,
      program_day: client.program_day,
    });

    // Step 8: reply with AI feedback
    await message.reply({
      content: buildFeedbackMessage(client.full_name.split(' ')[0] ?? client.full_name, analysis.narrative, type),
    });

    // Step 9: remove ⏳, add ✅
    await message.reactions.cache.get('⏳')?.remove().catch(() => null);
    await message.react('✅').catch(() => null);
  } catch (err) {
    console.error('[photo-handler] Error processing check-in:', err);
    await message.reactions.cache.get('⏳')?.remove().catch(() => null);
    await message.react('❌').catch(() => null);
    await message
      .reply('Something went wrong processing your check-in. Please try again.')
      .catch(() => null);
  }
}

function buildFeedbackMessage(
  firstName: string,
  narrative: string,
  type: 'morning' | 'evening' | 'wearable'
): string {
  const emoji = type === 'morning' ? '🌅' : type === 'evening' ? '🌙' : '📊';
  return `${emoji} **Check-in logged!**\n\n${narrative}`;
}
