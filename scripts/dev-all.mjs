// Runs the app against the API on Neon. With --local, also runs the API here and points the app at it.
//   npm run dev:all                 Expo only; the app uses the deployed API (EXPO_PUBLIC_API_URL)
//   npm run dev:all -- --local      also the local API on :8787 (Google sign-in needs the deployed one)
//   add --web to open the browser build
import { spawn } from 'node:child_process';
import os from 'node:os';

const args = process.argv.slice(2);
const local = args.includes('--local');
const expoArgs = args.filter((a) => a !== '--local');
const children = [];

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
