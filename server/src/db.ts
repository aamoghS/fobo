import pg from 'pg';

export type Claims = { sub: string };

// Plan costs and day loads are numeric (tenths); hand them to the app as numbers, not strings.
pg.types.setTypeParser(pg.types.builtins.NUMERIC, (v) => Number(v));

// Use Neon's pooled connection string. SET LOCAL does not survive a transaction pool across
// statements, so every request runs inside its own transaction.
export function createPool(connectionString = process.env.DATABASE_URL): pg.Pool {
  return new pg.Pool({ connectionString });
}

async function inTransaction<T>(
  pool: pg.Pool,
  role: 'app_user' | 'app_service',
  claims: Claims | null,
  fn: (client: pg.PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('begin');
    await client.query(`set local role ${role}`);
    if (claims) {
      await client.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify(claims)]);
    }
    const result = await fn(client);
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
export function withUser<T>(pool: pg.Pool, claims: Claims, fn: (client: pg.PoolClient) => Promise<T>) {
  return inTransaction(pool, 'app_user', claims, fn);
}

// Google sync, Claude fixes and apply-fix work only.
export function withService<T>(pool: pg.Pool, fn: (client: pg.PoolClient) => Promise<T>) {
  return inTransaction(pool, 'app_service', null, fn);
}

// Called on first sign-in. Handle defaults to 'user_' + first 19 chars of the id.
export function upsertProfile(client: pg.PoolClient, id: string, name: string | null = null) {
  return client.query(
    'insert into profiles (id, name) values ($1, $2) on conflict (id) do nothing',
    [id, name],
  );
}
