import { Pool } from '@neondatabase/serverless';
import fs from 'node:fs';
import path from 'node:path';

const envPath = path.join(process.cwd(), 'apps', 'api', '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const dbUrlMatch = envContent.match(/DATABASE_URL=(.+)/);
const DATABASE_URL = dbUrlMatch?.[1]?.trim();

const pool = new Pool({ connectionString: DATABASE_URL });

async function main() {
    await pool.query(`
    INSERT INTO users (name, email, role, created_at)
    VALUES ('Coach', 'coach@flowstate.com', 'coach', now())
    ON CONFLICT (email) DO UPDATE SET role = 'coach'
  `);
    console.log('Coach created');
}

main().catch(console.error).finally(() => pool.end());
