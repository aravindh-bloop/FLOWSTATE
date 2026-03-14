import { createDiscordChannels } from './src/pipelines/provision.ts';
import { query, queryOne } from './src/db.ts';

async function main() {
  const clientId = 'd77bc22c-52a7-4d87-b2df-f3af59515503'; // detest1's ID
  const client = await queryOne<{ id: string; full_name: string; discord_user_id: string | null }>('SELECT * FROM clients WHERE id = $1', [clientId]);
  if (!client) {
    console.error('Client not found');
    return;
  }

  console.log('Manually creating Discord channels for:', client.full_name);
  const firstName = client.full_name.split(' ')[0];
  
  try {
    const channelId = await createDiscordChannels(clientId, firstName, client.discord_user_id);
    if (channelId) {
      await query('UPDATE clients SET discord_channel_id = $1 WHERE id = $2', [channelId, clientId]);
      console.log('Successfully created channels and updated client with channel ID:', channelId);
    } else {
      console.log('Failed to create channels (channelId came back null)');
    }
  } catch (err) {
    console.error('Error during manual provisioning:', err);
  }
}

main().catch(console.error).finally(() => process.exit());
