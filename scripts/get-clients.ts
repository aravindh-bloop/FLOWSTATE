import { Pool } from '@neondatabase/serverless';
import fs from 'node:fs';
import path from 'node:path';

const envPath = path.join(process.cwd(), 'apps', 'api', '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const dbUrlMatch = envContent.match(/DATABASE_URL=(.+)/);
const DATABASE_URL = dbUrlMatch?.[1]?.trim();

const pool = new Pool({ connectionString: DATABASE_URL });

async function main() {
    const { rows } = await pool.query("SELECT c.full_name, u.email, c.discord_user_id, c.discord_channel_id FROM clients c JOIN users u ON c.user_id = u.id");
    console.log('CLIENTS WITH EMAILS:', rows);
}

main().catch(console.error).finally(() => pool.end());
