import { Pool } from '@neondatabase/serverless';
import fs from 'node:fs';
import path from 'node:path';

const envPath = path.join(process.cwd(), 'apps', 'api', '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const dbUrlMatch = envContent.match(/DATABASE_URL=(.+)/);
const DATABASE_URL = dbUrlMatch?.[1]?.trim();

const pool = new Pool({ connectionString: DATABASE_URL });

async function main() {
    const email = 'prajeinck@gmail.com';

    console.log(`Deleting registrations for ${email}...`);
    await pool.query('DELETE FROM registrations WHERE email = $1', [email]);

    console.log(`Deleting client user for ${email}...`);
    await pool.query("DELETE FROM users WHERE email = $1 AND role = 'client'", [email]);

    console.log('Done!');
}

main().catch(console.error).finally(() => pool.end());
