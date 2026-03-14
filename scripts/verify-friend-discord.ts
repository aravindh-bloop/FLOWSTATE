import fs from 'node:fs';
import path from 'node:path';

const envPath = path.join(process.cwd(), 'apps', 'api', '.env');
const envContent = fs.readFileSync(envPath, 'utf8');

const tokenMatch = envContent.match(/DISCORD_BOT_TOKEN="?([^"\n]+)"?/);
const guildMatch = envContent.match(/DISCORD_GUILD_ID="?([^"\n]+)"?/);

const token = tokenMatch?.[1]?.trim();
const guildId = guildMatch?.[1]?.trim();

async function main() {
    const channelId = '1480969684919521481'; // checkin channel ID
    const userId = '756489726856527934'; // Friend's Discord User ID
    const clientRoleId = '1480704292800303218'; // Client role ID

    // 1. Check channel permissions
    console.log('Fetching channel info...');
    const chRes = await fetch(`https://discord.com/api/v10/channels/${channelId}`, {
        headers: { Authorization: `Bot ${token}` }
    });

    if (chRes.ok) {
        const channel: any = await chRes.json();
        console.log(`Channel name: ${channel.name}`);
        console.log(`Permission Overwrites:`);
        const userOverride = channel.permission_overwrites.find((p: any) => p.id === userId);
        if (userOverride) {
            console.log(`- Overrides found for friend ID (${userId}): YES`);
            console.log(`- Permissions given: ${userOverride.allow}`);
        } else {
            console.log(`- Overrides found for friend ID (${userId}): NO`);
        }
    } else {
        console.log('Error fetching channel:', chRes.status, await chRes.text());
    }

    // 2. We can't check the member if they haven't joined the server yet, 
    // but let's check what role gets applied when they join, or if we can see their info via @user
    console.log(`\nFetching member info for ${userId} in guild ${guildId}...`);
    const memRes = await fetch(`https://discord.com/api/v10/guilds/${guildId}/members/${userId}`, {
        headers: { Authorization: `Bot ${token}` }
    });

    if (memRes.status === 200) {
        const member: any = await memRes.json();
        console.log(`Friend has joined the server: YES`);
        console.log(`Has client role: ${member.roles.includes(clientRoleId) ? 'YES' : 'NO'}`);
    } else if (memRes.status === 404) {
        console.log(`Friend has joined the server: NO (this is expected since you said he hasn't accepted yet)`);
    } else {
        console.log(`Friend joined status check error: ${memRes.status} ${await memRes.text()}`);
    }
}
main().catch(console.error);
