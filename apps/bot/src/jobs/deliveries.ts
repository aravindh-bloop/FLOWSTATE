/**
 * Intervention delivery poller.
 *
 * Polls /api/bot/pending-deliveries every 60 seconds.
 * For each approved intervention: posts final_message as embed to client's Discord channel,
 * then confirms delivery via /api/bot/delivered/:id.
 */

import { EmbedBuilder, type Client, type TextChannel } from 'discord.js';
import { getPendingDeliveries, confirmDelivery } from '../api.js';
import { postToAlerts } from '../utils/coach-channels.js';

export function startDeliveryPoller(discordClient: Client): void {
  console.log('[delivery-poller] Starting (60s interval)');

  const poll = async () => {
    try {
      const deliveries = await getPendingDeliveries();
      if (deliveries.length === 0) return;

      console.log(`[delivery-poller] Delivering ${deliveries.length} intervention(s)`);

      for (const delivery of deliveries) {
        try {
          const channel = await discordClient.channels
            .fetch(delivery.discord_channel_id)
            .catch(() => null);

          if (!channel?.isTextBased()) {
            console.warn(`[delivery-poller] Channel ${delivery.discord_channel_id} not found or not text-based`);
            continue;
          }

          const textChannel = channel as TextChannel;

          const embed = new EmbedBuilder()
            .setColor(0x0fa884)
            .setTitle('💬 Message from your coach')
            .setDescription(delivery.final_message)
            .setTimestamp();

          const sentMessage = await textChannel.send({ embeds: [embed] });

          await confirmDelivery(delivery.id, sentMessage.id);
          console.log(`[delivery-poller] Delivered intervention ${delivery.id}`);

          // Post notification to #alerts for coach visibility
          const alertEmbed = new EmbedBuilder()
            .setColor(0xf59e0b)
            .setTitle('💬 Intervention Delivered')
            .setDescription(`Sent to client in <#${delivery.discord_channel_id}>`)
            .setTimestamp();
          postToAlerts(discordClient, alertEmbed).catch(() => {});
        } catch (err) {
          console.error(`[delivery-poller] Failed to deliver ${delivery.id}:`, err);
        }
      }
    } catch (err) {
      console.error('[delivery-poller] Poll error:', err);
    }
  };

  // Run immediately, then every 60s
  void poll();
  setInterval(() => void poll(), 60_000);
}
