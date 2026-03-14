import fs from 'node:fs';
import path from 'node:path';

const envPath = path.join(process.cwd(), 'apps', 'api', '.env');
const envContent = fs.readFileSync(envPath, 'utf8');

const tokenMatch = envContent.match(/DISCORD_BOT_TOKEN="?([^"\n]+)"?/);
const token = tokenMatch?.[1]?.trim();
const guildIdVal = envContent.match(/DISCORD_GUILD_ID="?([^"\n]+)"?/)?.[1]?.trim();
const verifyChannelId = '1480984782430015489';
const unverifiedRoleId = '1480984843427774719';

async function main() {
    console.log('Setting #verify channel permissions...');

    // 1. Deny @everyone ViewChannel
    await fetch(`https://discord.com/api/v10/channels/${verifyChannelId}/permissions/${guildIdVal}`, {
        method: 'PUT',
        headers: { Authorization: `Bot ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 0, deny: '1024' }) // 1024 = ViewChannel
    });

    // 2. Allow @unverified ViewChannel
    await fetch(`https://discord.com/api/v10/channels/${verifyChannelId}/permissions/${unverifiedRoleId}`, {
        method: 'PUT',
        headers: { Authorization: `Bot ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 0, allow: '1024' })
    });

    console.log('Success!');
}
main().catch(console.error);
