// Starts the API (server/) and the Expo app together: one terminal, one QR code, one Ctrl+C.
//   npm run dev:all            phone (Expo Go or a development build) and browser
//   npm run dev:all -- --web   also opens the browser build
// The app is pointed at this computer's Wi-Fi address, so a phone on the same network reaches the API.
import { spawn } from 'node:child_process';
import os from 'node:os';

const PORT = 8787;

// This machine's LAN address: the first private IPv4 that is not a virtual adapter (WSL, Hyper-V).
function lanAddress() {
  const candidates = Object.values(os.networkInterfaces()).flat()
    .filter((a) => a && a.family === 'IPv4' && !a.internal && !a.address.startsWith('169.254.'));
  const preferred = candidates.find((a) => /^(10|192\.168)\./.test(a.address)) ?? candidates[0];
  return preferred?.address ?? 'localhost';
}

const apiUrl = `http://${lanAddress()}:${PORT}`;
const extra = process.argv.slice(2);
const children = [];

function run(name, command, args, cwd, env = {}) {
  const child = spawn(command, args, { cwd, stdio: 'inherit', shell: true, env: { ...process.env, ...env } });
  child.on('exit', (code) => {
    console.log(`\n${name} stopped (${code ?? 'signal'}); stopping the rest.`);
    for (const c of children) if (c !== child) c.kill();
    process.exit(code ?? 0);
  });
  children.push(child);
}

console.log(`API on ${apiUrl}`);
run('API', 'npm', ['run', 'dev'], 'server', { PORT: String(PORT) });
// Expo reads .env.local but keeps variables already set, so this address wins over the file.
run('Expo', 'npx', ['expo', 'start', ...extra], '.', { EXPO_PUBLIC_API_URL: apiUrl });

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    for (const c of children) c.kill();
    process.exit(0);
  });
}
