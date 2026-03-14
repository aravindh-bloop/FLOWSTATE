import fs from 'node:fs';
import path from 'node:path';

const envPath = path.join(process.cwd(), 'apps', 'api', '.env');
const envContent = fs.readFileSync(envPath, 'utf8');

const tokenMatch = envContent.match(/DISCORD_BOT_TOKEN="?([^"\n]+)"?/);
const token = tokenMatch?.[1]?.trim();
const guildMatch = envContent.match(/DISCORD_GUILD_ID="?([^"\n]+)"?/);
const guildId = guildMatch?.[1]?.trim();

async function main() {
    const res = await fetch(`https://discord.com/api/v10/guilds/${guildId}`, {
        headers: { Authorization: `Bot ${token}` }
    });
    const guild = await res.json();
    console.log('GUILD NAME:', guild.name);
}
main().catch(console.error);
