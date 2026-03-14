import fs from 'node:fs';
import path from 'node:path';

const envPath = path.join(process.cwd(), 'apps', 'api', '.env');
const envContent = fs.readFileSync(envPath, 'utf8');

const tokenMatch = envContent.match(/DISCORD_BOT_TOKEN="?([^"\n]+)"?/);
const token = tokenMatch?.[1]?.trim();
const guildMatch = envContent.match(/DISCORD_GUILD_ID="?([^"\n]+)"?/);
const guildId = guildMatch?.[1]?.trim();

async function main() {
    const res = await fetch(`https://discord.com/api/v10/guilds/${guildId}/channels`, {
        headers: { Authorization: `Bot ${token}` }
    });
    const channels = await res.json();
    console.log('CHANNELS:', JSON.stringify(channels.map((ch: any) => ({ name: ch.name, id: ch.id })), null, 2));
}
main().catch(console.error);
