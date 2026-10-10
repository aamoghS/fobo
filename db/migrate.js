// Applies db/migrations in order, once each. Usage: node db/migrate.js (reads DATABASE_URL).
// Run from server/ so `pg` resolves: node --env-file=../.env.local ../db/migrate.js
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(path.join(process.cwd(), 'package.json'));
const pg = require('pg');
const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'migrations');
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
