/**
 * Intervention delivery poller.
 *
 * Polls /api/bot/pending-deliveries every 60 seconds.
 * For each approved intervention: posts final_message to client's Discord channel,
 * then confirms delivery via /api/bot/delivered/:id.
 */

import type { Client, TextChannel } from 'discord.js';
import { getPendingDeliveries, confirmDelivery } from '../api.js';

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
          const sentMessage = await textChannel.send({
            content: `📋 **Message from your coach:**\n\n${delivery.final_message}`,
          });

          await confirmDelivery(delivery.id, sentMessage.id);
          console.log(`[delivery-poller] Delivered intervention ${delivery.id}`);
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
