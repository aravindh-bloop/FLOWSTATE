import fs from 'node:fs';
import path from 'node:path';

const envPath = path.join(process.cwd(), 'apps', 'api', '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const tokenMatch = envContent.match(/DISCORD_BOT_TOKEN="?([^"\n]+)"?/);
const token = tokenMatch?.[1]?.trim();

async function main() {
    const channelId = '1480962362230968414';
    const userId = '1473375713620131952'; // User's stated ID

    // 1. Check channel
    console.log('Fetching channel info...');
    const chRes = await fetch(`https://discord.com/api/v10/channels/${channelId}`, {
        headers: { Authorization: `Bot ${token}` }
    });
    console.log('Channel:', chRes.status, await chRes.text());

    // 2. Check guild member
    const guildIdMatch = envContent.match(/DISCORD_GUILD_ID="?([^"\n]+)"?/);
    const guildId = guildIdMatch?.[1]?.trim();
    console.log(`\nFetching member info for ${userId} in guild ${guildId}...`);
    const memRes = await fetch(`https://discord.com/api/v10/guilds/${guildId}/members/${userId}`, {
        headers: { Authorization: `Bot ${token}` }
    });
    console.log('Member:', memRes.status, memRes.status === 200 ? 'Found' : await memRes.text());
}
main().catch(console.error);
