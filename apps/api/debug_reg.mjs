import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import fs from 'fs';

neonConfig.webSocketConstructor = ws;

const envContent = fs.readFileSync('.env', 'utf-8');
const dbUrl = envContent.split('\n').find(l => l.startsWith('DATABASE_URL='))?.split('=')[1].replace(/"/g, '').trim();

if (!dbUrl) {
  console.error('DATABASE_URL not found in .env');
  process.exit(1);
}

const pool = new Pool({ connectionString: dbUrl });

async function main() {
  const res = await pool.query("SELECT * FROM registrations ORDER BY created_at DESC LIMIT 10");
  console.log('--- Registrations ---');
  console.log(JSON.stringify(res.rows, null, 2));

  if (res.rows.length > 0) {
    const regId = res.rows[0].id;
    const clientRes = await pool.query("SELECT * FROM clients WHERE user_id IN (SELECT id FROM users WHERE email = $1)", [res.rows[0].email]);
    console.log('--- Clients ---');
    console.log(JSON.stringify(clientRes.rows, null, 2));
    
    const userRes = await pool.query("SELECT * FROM users WHERE email = $1", [res.rows[0].email]);
    console.log('--- Users ---');
    console.log(JSON.stringify(userRes.rows, null, 2));
  }
}

main().catch(console.error).finally(() => pool.end());
