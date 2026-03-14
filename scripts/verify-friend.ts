import { Pool } from '@neondatabase/serverless';
import fs from 'node:fs';
import path from 'node:path';

const envPath = path.join(process.cwd(), 'apps', 'api', '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const dbUrlMatch = envContent.match(/DATABASE_URL=(.+)/);
const DATABASE_URL = dbUrlMatch?.[1]?.trim();

const pool = new Pool({ connectionString: DATABASE_URL });

async function main() {
    const discordUserId = '756489726856527934';

    console.log(`Checking client record for Discord ID: ${discordUserId}...`);
    const { rows } = await pool.query(
        "SELECT full_name, discord_channel_id, status FROM clients WHERE discord_user_id = $1",
        [discordUserId]
    );

    console.log('CLIENT RECORD:', rows);
}

main().catch(console.error).finally(() => pool.end());
