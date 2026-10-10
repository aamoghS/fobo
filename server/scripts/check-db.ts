// Checks the API can reach the database the way requests do: a transaction per role, read-only.
//   node --env-file=../.env.local scripts/check-db.ts
import { sql } from 'drizzle-orm';
import { createPool, withService, withUser } from '../src/db.ts';

const pool = createPool();
const started = Date.now();
const service = await withService(pool, (db) =>
  db.execute<{ profiles: number }>(sql`select count(*)::int as profiles from profiles`));
const user = await withUser(pool, { sub: 'nobody' }, (db) => db.execute(sql`select * from profiles`));
console.log(`ok in ${Date.now() - started} ms: ${service.rows[0].profiles} profiles; a stranger sees ${user.rows.length}`);
await pool.end();
