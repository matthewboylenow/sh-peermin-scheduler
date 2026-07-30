import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

/**
 * Signing key for peer minister sessions.
 *
 * There is deliberately no production fallback. A hard-coded default would sit
 * in the repository, and anyone who read it could mint a session for any user
 * id — so an unset secret has to fail loudly rather than quietly downgrade to
 * a public key. Resolved per call so a missing variable surfaces as a request
 * error rather than breaking the build.
 */
function getSecretKey(): Uint8Array {
  const secret = process.env.PEER_SESSION_SECRET;

  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'PEER_SESSION_SECRET is not set. Peer minister sessions cannot be signed securely without it.'
      );
    }
    console.warn(
      '[peer-session] PEER_SESSION_SECRET is not set; using an insecure development key.'
    );
    return new TextEncoder().encode('development-only-insecure-key');
  }

  // Warn rather than throw: a short secret is weak, but refusing to sign would
  // lock every peer minister out of a running deployment over a config nit.
  if (secret.length < 32) {
    console.warn(
      `[peer-session] PEER_SESSION_SECRET is only ${secret.length} characters; 32 or more is recommended.`
    );
  }

  return new TextEncoder().encode(secret);
}

export interface PeerSession {
  userId: string;
  phone: string;
  name: string;
}

export async function createPeerSession(userId: string, phone: string, name: string) {
  const token = await new SignJWT({ userId, phone, name })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('30d')
    .sign(getSecretKey());

  const cookieStore = await cookies();
  cookieStore.set('peer_session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: '/',
  });
}

export async function getPeerSession(): Promise<PeerSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('peer_session')?.value;
  if (!token) return null;

  // Resolved outside the try: a misconfigured secret should surface as an
  // error, not as a silent logout loop that looks like a session bug.
  const key = getSecretKey();

  try {
    const { payload } = await jwtVerify(token, key);
    return payload as unknown as PeerSession;
  } catch {
    return null;
  }
}

export async function clearPeerSession() {
  const cookieStore = await cookies();
  cookieStore.delete('peer_session');
}
