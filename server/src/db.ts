import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { profiles, schema } from './schema.ts';

export type Claims = { sub: string };
// $client is the request's pg client (tests use it for raw SQL).
export type Db = NodePgDatabase<typeof schema> & { $client: pg.PoolClient };

// Plan costs and day loads are numeric (tenths); hand them to the app as numbers, not strings.
pg.types.setTypeParser(pg.types.builtins.NUMERIC, (v) => Number(v));

// Use Neon's pooled connection string. SET LOCAL does not survive a transaction pool across
// statements, so every request runs inside its own transaction.
export function createPool(connectionString = process.env.DATABASE_URL): pg.Pool {
  return new pg.Pool({ connectionString });
}

// Drizzle runs on the request's own client, so its queries share the transaction and the role
// and user id set on it, and row-level security applies to every query.
async function inTransaction<T>(
  pool: pg.Pool,
  role: 'app_user' | 'app_service',
  claims: Claims | null,
  fn: (db: Db) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('begin');
    await client.query(`set local role ${role}`);
    if (claims) {
      await client.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify(claims)]);
    }
    const result = await fn(drizzle({ client, schema }));
    await client.query('commit');
    return result;
  } catch (err) {
    await client.query('rollback');
    throw err;
  } finally {
    client.release();
  }
}

// Runs fn as app_user for the verified JWT claims (claims.sub is the user id).
export function withUser<T>(pool: pg.Pool, claims: Claims, fn: (db: Db) => Promise<T>) {
  return inTransaction(pool, 'app_user', claims, fn);
}

// Google sync, planner fixes and apply-fix work only.
export function withService<T>(pool: pg.Pool, fn: (db: Db) => Promise<T>) {
  return inTransaction(pool, 'app_service', null, fn);
}

// Called on first sign-in. The handle defaults to 'user_' + first 19 chars of the id (a trigger).
export function upsertProfile(db: Db, id: string, name: string | null = null) {
  return db.insert(profiles).values({ id, name }).onConflictDoNothing();
}
