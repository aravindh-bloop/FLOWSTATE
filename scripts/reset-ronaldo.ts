import { Pool } from '@neondatabase/serverless';
import fs from 'node:fs';
import path from 'node:path';

const envPath = path.join(process.cwd(), 'apps', 'api', '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const dbUrlMatch = envContent.match(/DATABASE_URL=(.+)/);
const DATABASE_URL = dbUrlMatch?.[1]?.trim();

const pool = new Pool({ connectionString: DATABASE_URL });

async function main() {
    const code = 'TEST24';
    console.log(`Setting Ronaldo's code to ${code} and status to pending...`);
    await pool.query(
        "UPDATE clients SET status = 'pending', discord_verification_code = $1 WHERE full_name = 'ronaldo'",
        [code]
    );
    console.log('Success!');
}

main().catch(console.error).finally(() => pool.end());
