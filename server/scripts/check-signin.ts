// Shows Google sign-ins saved by the API (no tokens), newest data first.
//   node --env-file=../.env.local scripts/check-signin.ts
import { sql } from 'drizzle-orm';
import { createPool, withService } from '../src/db.ts';

const pool = createPool();
const { rows } = await withService(pool, (db) => db.execute(sql`
  select g.email, g.refresh_token is not null as calendar, p.name, p.handle,
         (select count(*)::int from calendar_connections c where c.user_id = g.user_id) as connections,
         (select count(*)::int from events e where e.user_id = g.user_id) as plans
  from google_accounts g join profiles p on p.id = g.user_id`));
console.table(rows);
await pool.end();
