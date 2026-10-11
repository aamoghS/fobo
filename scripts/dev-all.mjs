// Runs the app for phones (Expo Go over a tunnel, any network) against the API on Neon.
//   npm run dev:all                 Expo with --tunnel; the app uses the deployed API (EXPO_PUBLIC_API_URL)
//   npm run dev:all -- --web        also opens the browser build
//   npm run dev:all -- --lan        same Wi-Fi only, no tunnel
//   npm run dev:all -- --local      also runs the API here on :8787 (Google sign-in needs the deployed one)
import { execSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import pg from 'pg';

const args = process.argv.slice(2);
const local = args.includes('--local');
const lan = args.includes('--lan');
const expoArgs = [...args.filter((a) => a !== '--local'), ...(lan ? [] : ['--tunnel'])];
const children = [];

// The tunnel needs an Expo login on this computer (and the same account in Expo Go on the phone).
if (!lan) {
  try {
    const who = execSync('npx expo whoami', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim().split('\n').pop();
    console.log(`Expo account: ${who} (sign in to Expo Go on the phone with the same account)`);
  } catch {
    console.error('Not logged in to Expo. Run `npx expo login` (or `npx eas-cli login --device`), then try again.');
    process.exit(1);
  }
}

function lanAddress() {
  const all = Object.values(os.networkInterfaces()).flat().filter((a) => a && a.family === 'IPv4' && !a.internal);
  return (all.find((a) => /^(10|192\.168)\./.test(a.address)) ?? all[0])?.address ?? 'localhost';
}

function run(name, command, cmdArgs, cwd, env = {}) {
  const child = spawn(command, cmdArgs, { cwd, stdio: 'inherit', shell: true, env: { ...process.env, ...env } });
  child.on('exit', (code) => {
    console.log(`\n${name} stopped (${code ?? 'signal'}).`);
    for (const c of children) if (c !== child) c.kill();
    process.exit(code ?? 0);
  });
  children.push(child);
}

const expoEnv = {};
if (local) {
  expoEnv.EXPO_PUBLIC_API_URL = `http://${lanAddress()}:8787`;
  console.log(`Local API on ${expoEnv.EXPO_PUBLIC_API_URL}`);
  run('API', 'npm', ['run', 'dev'], 'server');
}
run('Expo', 'npx', ['expo', 'start', ...expoArgs], '.', expoEnv);

for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => children.forEach((c) => c.kill()));

// Google sign-in only sends a session back to dev servers the team registered by exact host (dev_returns):
// once Expo says where this one is, register it. Needs DATABASE_URL from .env.local; never stops Expo.
void registerDevReturn().catch((e) => console.warn(`\nGoogle sign-in won't return to this dev server: ${e.message}`));

async function registerDevReturn() {
  const line = fs.readFileSync('.env.local', 'utf8').split(/\r?\n/).find((l) => l.startsWith('DATABASE_URL='));
  if (!line) throw new Error('DATABASE_URL is not in .env.local');
  let host;
  for (let tries = 0; !host && tries < 90; tries++) {
    await new Promise((r) => setTimeout(r, 2000));
    const manifest = await fetch('http://localhost:8081', {
      headers: { 'expo-platform': 'ios', accept: 'application/expo+json,application/json' },
    }).then((res) => res.text()).catch(() => '');
    host = manifest.match(/"hostUri":"([^"]+)"/)?.[1]?.toLowerCase();
  }
  if (!host) throw new Error('Expo did not report its address');
  const db = new pg.Client({ connectionString: line.slice('DATABASE_URL='.length).trim().replace(/^["']|["']$/g, '') });
  await db.connect();
  try {
    await db.query('insert into dev_returns (host) values ($1) on conflict (host) do update set added_at = now()', [host]);
  } finally {
    await db.end();
  }
  console.log(`\nGoogle sign-in can return to exp://${host}`);
}
