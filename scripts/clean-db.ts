import { Pool } from '@neondatabase/serverless';
import fs from 'node:fs';
import path from 'node:path';

const envPath = path.join(process.cwd(), 'apps', 'api', '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const dbUrlMatch = envContent.match(/DATABASE_URL=(.+)/);
const DATABASE_URL = dbUrlMatch?.[1]?.trim();

const pool = new Pool({ connectionString: DATABASE_URL });

async function main() {
    await pool.query('DELETE FROM notifications');
    await pool.query('DELETE FROM calendar_events');
    await pool.query('DELETE FROM clients');
    await pool.query("DELETE FROM users WHERE role = 'client'");
    await pool.query("UPDATE registrations SET status = 'pending', reviewed_by = null, reviewed_at = null");
    console.log('Cleaned up clients and reset registrations');
}

main().catch(console.error).finally(() => pool.end());
