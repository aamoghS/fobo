import { createRemoteJWKSet, jwtVerify } from 'jose';
import type { Claims } from './db.ts';

let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

// Verifies a Neon Auth access token against NEON_AUTH_JWKS_URL. Returns null when missing or invalid.
export async function verify(header: string | undefined): Promise<Claims | null> {
  const token = header?.replace(/^Bearer /, '');
  if (!token) return null;
  jwks ??= createRemoteJWKSet(new URL(process.env.NEON_AUTH_JWKS_URL!));
  try {
    const { payload } = await jwtVerify(token, jwks);
    return payload.sub ? { sub: payload.sub } : null;
  } catch {
    return null;
  }
}
