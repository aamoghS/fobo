// Linking Google to the signed-in account finishes here, on every platform: the ticket Google's sign-in came
// back with, and the key the API gave only this app when linking started.
import { send } from './api';

export async function finishLink(ticket: string, key: string): Promise<void> {
  const res = await send<{ linked: true }>('POST', '/auth/google/link/finish', { ticket, key });
  if (!('error' in res)) return;
  throw new Error(res.error === 'google-taken' ? 'That Google account is already used by another Fobo account.' : res.error);
}
