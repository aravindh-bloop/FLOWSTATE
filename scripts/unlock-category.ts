import fs from 'node:fs';
import path from 'node:path';

const envPath = path.join(process.cwd(), 'apps', 'api', '.env');
const envContent = fs.readFileSync(envPath, 'utf8');

const tokenMatch = envContent.match(/DISCORD_BOT_TOKEN="?([^"\n]+)"?/);
const token = tokenMatch?.[1]?.trim();

async function main() {
    const categoryId = '1480681557088927754';
    const friendId = '756489726856527934';

    console.log(`Explicitly adding friend ${friendId} to category ${categoryId}...`);

    const res = await fetch(`https://discord.com/api/v10/channels/${categoryId}/permissions/${friendId}`, {
        method: 'PUT',
        headers: {
            Authorization: `Bot ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            type: 1, // USER
            allow: '68608' // View, Send, History
        })
    });

    if (res.ok) {
        console.log('Successfully updated category permissions!');
    } else {
        console.log('Failed:', res.status, await res.text());
    }
}
main().catch(console.error);
