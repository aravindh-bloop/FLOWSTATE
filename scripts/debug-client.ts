import { Pool } from '@neondatabase/serverless';
import fs from 'node:fs';
import path from 'node:path';

const envPath = path.join(process.cwd(), 'apps', 'api', '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const dbUrlMatch = envContent.match(/DATABASE_URL=(.+)/);
const DATABASE_URL = dbUrlMatch?.[1]?.trim();

const pool = new Pool({ connectionString: DATABASE_URL });

async function main() {
    const { rows } = await pool.query("SELECT full_name, discord_user_id, discord_channel_id FROM clients");
    console.log('CLIENTS:', rows);
}

main().catch(console.error).finally(() => pool.end());
