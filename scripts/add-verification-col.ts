import { Pool } from '@neondatabase/serverless';
import fs from 'node:fs';
import path from 'node:path';

const envPath = path.join(process.cwd(), 'apps', 'api', '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const dbUrlMatch = envContent.match(/DATABASE_URL=(.+)/);
const DATABASE_URL = dbUrlMatch?.[1]?.trim();

const pool = new Pool({ connectionString: DATABASE_URL });

async function main() {
    console.log('Adding discord_verification_code column...');
    await pool.query("ALTER TABLE clients ADD COLUMN IF NOT EXISTS discord_verification_code text UNIQUE");
    console.log('Success!');
}

main().catch(console.error).finally(() => pool.end());
