// Applies db/migrations in order, once each. Reads DATABASE_URL. Uses the same connection as the
// API, so Neon is reached over port 443.
//   npm run migrate   (from server/, loads ../.env.local)
import fs from 'node:fs';
import path from 'node:path';
import { createPool } from '../src/db.ts';

const dir = path.join(import.meta.dirname, '..', '..', 'db', 'migrations');
const pool = createPool();
const client = await pool.connect();
try {
  await client.query('create table if not exists schema_migrations (name text primary key)');
  for (const name of fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()) {
    const done = await client.query('select 1 from schema_migrations where name = $1', [name]);
    if (done.rowCount) continue;
    await client.query('begin');
    await client.query(fs.readFileSync(path.join(dir, name), 'utf8'));
    await client.query('insert into schema_migrations (name) values ($1)', [name]);
    await client.query('commit');
    console.log('applied', name);
  }
} finally {
  client.release();
  await pool.end();
}
