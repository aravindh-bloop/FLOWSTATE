import fs from 'node:fs';
import path from 'node:path';

const envPath = path.join(process.cwd(), 'apps', 'api', '.env');
const envContent = fs.readFileSync(envPath, 'utf8');

const tokenMatch = envContent.match(/DISCORD_BOT_TOKEN="?([^"\n]+)"?/);
const token = tokenMatch?.[1]?.trim();
const guildId = envContent.match(/DISCORD_GUILD_ID="?([^"\n]+)"?/);
const guildIdVal = guildId?.[1]?.trim();

async function main() {
    console.log('Creating @unverified role...');
    const res = await fetch(`https://discord.com/api/v10/guilds/${guildIdVal}/roles`, {
        method: 'POST',
        headers: {
            Authorization: `Bot ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            name: 'unverified',
            color: 0x808080
        })
    });
    const data = await res.json();
    console.log('Created @unverified:', data.id);
}
main().catch(console.error);
