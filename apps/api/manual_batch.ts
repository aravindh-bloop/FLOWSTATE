import { createDiscordChannels } from './src/pipelines/provision.ts';
import { query, queryOne } from './src/db.ts';

async function main() {
  const clients = [
    { id: '651f961e-842a-4421-8812-d91290f8327c', name: 'zoovy' },
    { id: '8fda0d29-d636-42eb-868b-58e349a5ae3e', name: 'lone wolf sigma' }
  ];

  for (const c of clients) {
    const client = await queryOne<{ id: string; full_name: string; discord_user_id: string | null }>(
      'SELECT * FROM clients WHERE id = $1', [c.id]
    );
    if (!client) {
      console.error(`Client ${c.name} (ID: ${c.id}) not found`);
      continue;
    }

    console.log(`\n--- Provisioning ${client.full_name} ---`);
    const firstName = client.full_name.split(' ')[0];
    
    // Check if discord_user_id is numeric
    const isNumeric = client.discord_user_id && /^\d+$/.test(client.discord_user_id);
    if (!isNumeric && client.discord_user_id) {
      console.warn(`[WARN] discord_user_id "${client.discord_user_id}" is not numeric. Discord permissions (overwrites) will be skipped for this user.`);
    }

    try {
      const channelId = await createDiscordChannels(client.id, firstName, isNumeric ? client.discord_user_id : null);
      if (channelId) {
        await query('UPDATE clients SET discord_channel_id = $1 WHERE id = $2', [channelId, client.id]);
        console.log(`✓ Successfully created channels for ${client.full_name}: ${channelId}`);
      } else {
        console.log(`✗ Failed to create channels for ${client.full_name}`);
      }
    } catch (err) {
      console.error(`✗ Error during provisioning for ${client.full_name}:`, err);
    }
  }
}

main().catch(console.error).finally(() => process.exit());
