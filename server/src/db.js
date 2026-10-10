import pg from 'pg';

// Use Neon's pooled connection string. SET LOCAL does not survive a transaction pool across
// statements, so every request runs inside its own transaction.
export function createPool(connectionString = process.env.DATABASE_URL) {
  return new pg.Pool({ connectionString });
}

async function inTransaction(pool, role, claims, fn) {
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
export function withUser(pool, claims, fn) {
  return inTransaction(pool, 'app_user', claims, fn);
}

// Google sync, Claude fixes and apply-fix work only.
export function withService(pool, fn) {
  return inTransaction(pool, 'app_service', null, fn);
}

// Called on first sign-in. Handle defaults to 'user_' + first 19 chars of the id.
export function upsertProfile(client, id, name = null) {
  return client.query(
    'insert into profiles (id, name) values ($1, $2) on conflict (id) do nothing',
    [id, name],
  );
}
