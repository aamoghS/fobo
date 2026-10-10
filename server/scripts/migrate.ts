// Applies db/migrations in order, once each. Reads DATABASE_URL.
//   npm run migrate   (from server/, loads ../.env.local)
import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';

const dir = path.join(import.meta.dirname, '..', '..', 'db', 'migrations');
const client = new pg.Client(process.env.DATABASE_URL);
await client.connect();
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
await client.end();
