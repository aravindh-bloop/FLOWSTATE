import fs from 'node:fs';
import path from 'node:path';

const envPath = path.join(process.cwd(), 'apps', 'api', '.env');
const envContent = fs.readFileSync(envPath, 'utf8');

const tokenMatch = envContent.match(/DISCORD_BOT_TOKEN="?([^"\n]+)"?/);
const token = tokenMatch?.[1]?.trim();

async function main() {
    const channelId = '1480980974916600009';

    const res = await fetch(`https://discord.com/api/v10/channels/${channelId}`, {
        headers: { Authorization: `Bot ${token}` }
    });

    const data: any = await res.json();
    console.log('Channel Data Status:', res.status);
    console.log('Channel Name:', data.name);
    console.log('Permission Overwrites:', JSON.stringify(data.permission_overwrites, null, 2));
}
main().catch(console.error);
