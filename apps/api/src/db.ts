/**
 * FlowState — NeonDB connection.
 *
 * Uses @neondatabase/serverless with WebSocket for Railway (persistent process).
 * `sql` is a tagged-template query helper that returns rows directly.
 * `pool` is exposed for transactions.
 */

import { neonConfig, Pool, type PoolClient } from '@neondatabase/serverless';
import ws from 'ws';

// Required for non-Cloudflare environments (Railway)
neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set');
}

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });

/** Run a parameterised query. Returns typed rows. */
export async function query<T = Record<string, unknown>>(
  text: string,
  values?: unknown[]
): Promise<T[]> {
  const result = await pool.query(text, values);
  return result.rows as T[];
}

/** Run a query that returns exactly one row, or null. */
export async function queryOne<T = Record<string, unknown>>(
  text: string,
  values?: unknown[]
): Promise<T | null> {
  const rows = await query<T>(text, values);
  return rows[0] ?? null;
}

/** Run a query inside a transaction. */
export async function transaction<T>(
  fn: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
