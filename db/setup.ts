import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import fs from 'node:fs';
import path from 'node:path';
const rootDir = process.cwd().includes('apps') ? path.join(process.cwd(), '..', '..') : process.cwd();
const envPath = path.join(rootDir, 'apps', 'api', '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const dbUrlMatch = envContent.match(/DATABASE_URL=(.+)/);
const DATABASE_URL = dbUrlMatch?.[1]?.trim();



// Required for non-Cloudflare environments
neonConfig.webSocketConstructor = ws;

if (!DATABASE_URL) {
    console.error('DATABASE_URL is not set in apps/api/.env');
    process.exit(1);
}

const pool = new Pool({ connectionString: DATABASE_URL });

async function runSQL(filePath: string) {
    console.log(`Executing ${filePath}...`);
    const sql = fs.readFileSync(filePath, 'utf8');

    // Split the SQL into multiple commands (this is a simple split, might need improvement for complex SQL)
    // Actually, pool.query can often handle multiple commands if they are semicolon-separated,
    // but let's be safe and split by semicolon.
    // Wait, the schema file has CREATE TABLE, CREATE INDEX, etc.
    // We'll just try to execute the whole thing first.

    try {
        await pool.query(sql);
        console.log(`Successfully executed ${filePath}`);
    } catch (err) {
        console.error(`Error executing ${filePath}:`, err);
        throw err;
    }
}

async function main() {
    try {
        const dbDir = path.join(rootDir, 'db');
        await runSQL(path.join(dbDir, 'schema.sql'));
        await runSQL(path.join(dbDir, 'seed.sql'));
        console.log('Database setup complete!');
    } catch (err: unknown) {
        if (err instanceof Error) {
            console.error('Database setup error:', err.message);
        }
        process.exit(1);
    } finally {
        await pool.end();
    }
}

main();
