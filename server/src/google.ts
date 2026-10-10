// Google OAuth refresh and Calendar API calls. GOOGLE_WEB_CLIENT_ID/SECRET must be the client set
// as the Google provider in Neon Auth, since the refresh tokens were issued to it. Only the primary
// calendar of each account is used.
const API = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';
const TOKEN = 'https://oauth2.googleapis.com/token';

export interface GoogleEvent {
  id: string;
  status: string;
  summary?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
  attendees?: { email: string; self?: boolean; responseStatus?: string; displayName?: string }[];
  transparency?: string;
}

async function token(params: Record<string, string>) {
  const res = await fetch(TOKEN, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      ...params,
      client_id: process.env.GOOGLE_WEB_CLIENT_ID!,
      client_secret: process.env.GOOGLE_WEB_CLIENT_SECRET!,
    }),
  });
  if (!res.ok) throw new Error(`google token request failed: ${res.status}`);
  return (await res.json()) as { access_token: string; refresh_token?: string; scope?: string };
}

// A native app's one-time server auth code. Native codes are exchanged with an empty redirect_uri.
export function exchangeCode(code: string) {
  return token({ code, redirect_uri: '', grant_type: 'authorization_code' });
}

export async function accessToken(refreshToken: string) {
  return (await token({ refresh_token: refreshToken, grant_type: 'refresh_token' })).access_token;
}

function call(access: string, path: string, init: RequestInit = {}) {
  return fetch(API + path, {
    ...init,
    headers: { Authorization: `Bearer ${access}`, 'Content-Type': 'application/json' },
  });
}

// Changes since syncToken, or a window of 30 days back to a year ahead on a first sync.
// Returns null when Google expired the sync token (410) and a full sync is needed.
export async function listChanges(access: string, syncToken: string | null) {
  const items: GoogleEvent[] = [];
  let pageToken: string | undefined;
  let nextSyncToken: string | null = null;
  do {
    const q = new URLSearchParams({ singleEvents: 'true', maxResults: '250', showDeleted: 'true' });
    if (syncToken) q.set('syncToken', syncToken);
    else {
      q.set('timeMin', new Date(Date.now() - 30 * 864e5).toISOString());
      q.set('timeMax', new Date(Date.now() + 365 * 864e5).toISOString());
    }
    if (pageToken) q.set('pageToken', pageToken);
    const res = await call(access, `?${q}`);
    if (res.status === 410) return null;
    if (!res.ok) throw new Error(`google list failed: ${res.status}`);
    const page = (await res.json()) as { items: GoogleEvent[]; nextPageToken?: string; nextSyncToken?: string };
    items.push(...page.items);
    pageToken = page.nextPageToken;
    nextSyncToken = page.nextSyncToken ?? null;
  } while (pageToken);
  return { items, nextSyncToken };
}

export async function getEvent(access: string, id: string): Promise<GoogleEvent> {
  const res = await call(access, `/${encodeURIComponent(id)}`);
  if (!res.ok) throw new Error(`google get failed: ${res.status}`);
  return res.json() as Promise<GoogleEvent>;
}

export async function patchEvent(access: string, id: string, body: Partial<GoogleEvent>) {
  const res = await call(access, `/${encodeURIComponent(id)}?sendUpdates=all`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`google patch failed: ${res.status}`);
}

export async function deleteEvent(access: string, id: string) {
  const res = await call(access, `/${encodeURIComponent(id)}`, { method: 'DELETE' });
  if (!res.ok && res.status !== 410) throw new Error(`google delete failed: ${res.status}`);
}

export async function insertEvent(access: string, body: Partial<GoogleEvent>) {
  const res = await call(access, '', { method: 'POST', body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`google insert failed: ${res.status}`);
  return (await res.json()) as GoogleEvent;
}
