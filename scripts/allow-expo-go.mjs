// Lets Google sign-in return to a teammate's Expo Go dev server, for someone who can't register their own
// (no DATABASE_URL). Takes the address their npm start printed:
//   npm run allow-expo-go -- abc_123-name-8081.exp.direct
import { allowDevReturn } from './dev-returns.mjs';

const host = (process.argv[2] ?? '').trim().toLowerCase().replace(/^exps?:\/\//, '').replace(/\/.*$/, '');
if (!host) {
  console.error('Usage: npm run allow-expo-go -- <host from npm start, like abc_123-name-8081.exp.direct>');
  process.exit(1);
}
await allowDevReturn(host);
console.log(`Google sign-in can return to exp://${host} for the next 7 days`);
