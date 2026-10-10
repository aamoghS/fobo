import { SignJWT, createRemoteJWKSet, jwtVerify } from 'jose';
import type { Claims } from './db.ts';

const ISSUER = 'fobo';
let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

const secret = () => new TextEncoder().encode(process.env.AUTH_SECRET ?? '');

// A session token for a Google sign-in through the API (src/routes/auth.ts).
export function issueSession(sub: string) {
  return new SignJWT({}).setProtectedHeader({ alg: 'HS256' }).setIssuer(ISSUER).setSubject(sub)
    .setIssuedAt().setExpirationTime('60d').sign(secret());
}

// Accepts the API's own session tokens and Neon Auth tokens. Null when missing or invalid.
export async function verify(header: string | undefined): Promise<Claims | null> {
  const token = header?.replace(/^Bearer /, '');
  if (!token) return null;
  if (process.env.AUTH_SECRET) {
    try {
      const { payload } = await jwtVerify(token, secret(), { issuer: ISSUER });
      if (payload.sub) return { sub: payload.sub };
    } catch { /* not ours; try Neon Auth */ }
  }
  if (!process.env.NEON_AUTH_JWKS_URL) return null;
  jwks ??= createRemoteJWKSet(new URL(process.env.NEON_AUTH_JWKS_URL));
  try {
    const { payload } = await jwtVerify(token, jwks);
    return payload.sub ? { sub: payload.sub } : null;
  } catch {
    return null;
  }
}
