/**
 * Create BetterAuth account for existing coach user.
 * Uses BetterAuth's own password hasher for compatibility.
 */
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
// Import BetterAuth's own hashPassword function
import { hashPassword } from 'better-auth/crypto';

neonConfig.webSocketConstructor = ws;

const pool = new Pool({ connectionString: process.env.DATABASE_URL || '' });

async function main() {
  const userId = '8c0622d8-4f3e-46fb-a8a6-e64e54e8e6ab';
  const password = 'flowstate123';

  const hash = await hashPassword(password);
  const accountId = crypto.randomUUID();

  // Delete any existing account entries for this user
  await pool.query(`DELETE FROM account WHERE "userId" = $1`, [userId]);

  await pool.query(`
    INSERT INTO account (id, "accountId", "providerId", "userId", password, "createdAt", "updatedAt")
    VALUES ($1, $2, 'credential', $3, $4, now(), now())
  `, [accountId, userId, userId, hash]);

  console.log('Coach account created successfully!');
  console.log('Email: prajeinck@gmail.com');
  console.log('Password: flowstate123');
  console.log('Hash:', hash.substring(0, 40) + '...');
}

main().catch(console.error).finally(() => pool.end());
