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
    console.log('Channel:', data.name);
    console.log('Parent Category ID:', data.parent_id);
}
main().catch(console.error);
