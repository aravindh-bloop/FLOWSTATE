import fs from 'node:fs';
import path from 'node:path';

const envPath = path.join(process.cwd(), 'apps', 'api', '.env');
const envContent = fs.readFileSync(envPath, 'utf8');

const tokenMatch = envContent.match(/DISCORD_BOT_TOKEN="?([^"\n]+)"?/);
const token = tokenMatch?.[1]?.trim();

const guildMatch = envContent.match(/DISCORD_GUILD_ID="?([^"\n]+)"?/);
const guildId = guildMatch?.[1]?.trim();

async function main() {
    const res = await fetch(`https://discord.com/api/v10/users/@me`, {
        headers: { Authorization: `Bot ${token}` }
    });
    const me = await res.json();
    const botId = me.id;

    const mRes = await fetch(`https://discord.com/api/v10/guilds/${guildId}/members/${botId}`, {
        headers: { Authorization: `Bot ${token}` }
    });
    const member = await mRes.json();

    const gRes = await fetch(`https://discord.com/api/v10/guilds/${guildId}`, {
        headers: { Authorization: `Bot ${token}` }
    });
    const guild = await gRes.json();

    console.log(`Bot Roles: ${member.roles.join(', ')}`);
    for (const roleId of member.roles) {
        const role = guild.roles.find((r: any) => r.id === roleId);
        console.log(`Role: ${role.name} (${role.id})`);
        console.log(`Permissions: ${role.permissions}`);
        const isAdmin = (BigInt(role.permissions) & 8n) === 8n;
        console.log(`Is Admin: ${isAdmin}`);
    }
}
main().catch(console.error);
