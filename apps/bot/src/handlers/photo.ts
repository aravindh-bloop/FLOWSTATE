/**
 * Photo message handler.
 *
 * Triggered whenever a message with an image attachment is received
 * in any channel under the FLOWSTATE-CLIENTS category.
 *
 * Flow:
 *   1. Resolve client from channel ID
 *   2. Add ⏳ reaction
 *   3. Download photo, upload to R2
 *   4. Call Gemini Flash Vision
 *   5. Parse AI response
 *   6. POST to /api/bot/checkin
 *   7. Backend writes, recalculates adherence, triggers alert pipeline
 *   8. Post AI feedback as embed reply (with streak count)
 *   9. Remove ⏳, add ✅
 */

import { EmbedBuilder } from 'discord.js';
import type { Message } from 'discord.js';
import { getClientByChannel, submitCheckIn } from '../api.js';
import { uploadCheckInPhoto } from '../r2.js';
import { analyseCheckInPhoto } from '../gemini.js';
import { postToDashboard } from '../utils/coach-channels.js';

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
    let photoUrl = '';
    try {
      photoUrl = await uploadCheckInPhoto(client.id, buffer, mimeType);
    } catch (err) {
      console.error('[photo-handler] R2 Upload failed:', err);
      // Continue without photo URL or throw? Backend schema says photo_url is optional.
      // But for vision check-ins, we usually want it. Let's continue for now.
    }

    // Determine check-in type from time of day
    const hour = new Date().getHours();
    const type: 'morning' | 'evening' | 'wearable' =
      hour < 13 ? 'morning' : 'evening';

    // Step 4 + 5: Gemini analysis
    const analysis = await analyseCheckInPhoto(buffer, mimeType, client, type);

    // Step 6: POST to backend
    let result;
    try {
      result = await submitCheckIn({
        client_id: client.id,
        discord_message_id: message.id,
        type,
        photo_url: photoUrl || undefined,
        client_note: message.content || undefined,
        ai_analysis: analysis.narrative,
        ai_model_used: 'gemini-1.5-flash',
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
    } catch (err) {
      console.error('[photo-handler] Backend submission failed:', err);
      throw err; // Re-throw to hit final catch
    }

    const streak = (result as any).streak ?? 0;
    const firstName = client.full_name.split(' ')[0] ?? client.full_name;
    const emoji = type === 'morning' ? '🌅' : type === 'evening' ? '🌙' : '📊';

    // Step 8: reply with embed
    const embed = new EmbedBuilder()
      .setColor(0x0fa884)
      .setTitle(`${emoji} Check-in logged!`)
      .setDescription(analysis.narrative)
      .setTimestamp();

    if (streak > 0) {
      embed.setFooter({ text: `🔥 ${streak} day streak` });
    }

    const fields: { name: string; value: string; inline: boolean }[] = [];
    if (analysis.adherence_score != null) fields.push({ name: 'Adherence', value: `${analysis.adherence_score}%`, inline: true });
    if (analysis.energy_rating != null) fields.push({ name: 'Energy', value: `${analysis.energy_rating}/10`, inline: true });
    if (analysis.sleep_hours != null) fields.push({ name: 'Sleep', value: `${analysis.sleep_hours}h`, inline: true });

    if (fields.length > 0) embed.addFields(fields);

    await message.reply({ embeds: [embed] });

    // Post summary to #dashboard for coach visibility
    const dashEmbed = new EmbedBuilder()
      .setColor(type === 'morning' ? 0x0fa884 : 0x3b82f6)
      .setTitle(`${emoji} ${firstName} — ${type} check-in`)
      .setDescription(analysis.narrative.slice(0, 300))
      .setTimestamp();
    if (analysis.adherence_score != null) dashEmbed.addFields({ name: 'Adherence', value: `${analysis.adherence_score}%`, inline: true });
    if (streak > 0) dashEmbed.setFooter({ text: `🔥 ${streak} day streak` });

    postToDashboard(message.client, dashEmbed).catch(() => {});

    // Step 9: remove ⏳, add ✅
    await message.reactions.cache.get('⏳')?.remove().catch(() => null);
    await message.react('✅').catch(() => null);
  } catch (err: any) {
    console.error('[photo-handler] Error processing check-in:', err);
    if (err.response) {
      try {
        const errorText = await err.response.text();
        console.error('[photo-handler] API Error Detail:', errorText);
      } catch {}
    }
    await message.reactions.cache.get('⏳')?.remove().catch(() => null);
    await message.react('❌').catch(() => null);
    await message
      .reply('Something went wrong processing your check-in. Please try again.')
      .catch(() => null);
  }
}
