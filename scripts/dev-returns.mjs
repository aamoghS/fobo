// Google sign-in sends a session back only to Expo Go dev servers in dev_returns (by exact host). Adding one
// needs the project's DATABASE_URL from .env.local, so only the team can.
import fs from 'node:fs';
import pg from 'pg';

export async function allowDevReturn(host) {
  const line = fs.existsSync('.env.local')
    ? fs.readFileSync('.env.local', 'utf8').split(/\r?\n/).find((l) => l.startsWith('DATABASE_URL='))
    : undefined;
  if (!line) throw new Error('no DATABASE_URL in .env.local');
  const db = new pg.Client({ connectionString: line.slice('DATABASE_URL='.length).trim().replace(/^["']|["']$/g, '') });
  await db.connect();
  try {
    await db.query('insert into dev_returns (host) values ($1) on conflict (host) do update set added_at = now()', [host]);
  } finally {
    await db.end();
  }
}
