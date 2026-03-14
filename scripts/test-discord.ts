import fs from 'node:fs';
import path from 'node:path';

const envPath = path.join(process.cwd(), 'apps', 'api', '.env');
const envContent = fs.readFileSync(envPath, 'utf8');

const tokenMatch = envContent.match(/DISCORD_BOT_TOKEN="?([^"\n]+)"?/);
const guildMatch = envContent.match(/DISCORD_GUILD_ID="?([^"\n]+)"?/);
const categoryMatch = envContent.match(/DISCORD_CLIENT_CATEGORY_ID="?([^"\n]+)"?/);

const token = tokenMatch?.[1]?.trim();
const guildId = guildMatch?.[1]?.trim();
const categoryId = categoryMatch?.[1]?.trim();

async function main() {
    console.log({ guildId, categoryId });
    console.log('Sending request to discord...');
    const res = await fetch(`https://discord.com/api/v10/guilds/${guildId}/channels`, {
        method: 'POST',
        headers: {
            Authorization: `Bot ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            name: 'hello-world-test',
            type: 0,
            parent_id: categoryId
        })
    });
    const text = await res.text();
    console.log(res.status, text);
}
main().catch(console.error);
