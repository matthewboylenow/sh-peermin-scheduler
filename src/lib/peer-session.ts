import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const secretKey = new TextEncoder().encode(
  process.env.PEER_SESSION_SECRET || 'development-secret-key-change-in-production'
);

export interface PeerSession {
  userId: string;
  phone: string;
  name: string;
}

export async function createPeerSession(userId: string, phone: string, name: string) {
  const token = await new SignJWT({ userId, phone, name })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('30d')
    .sign(secretKey);

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

  try {
    const { payload } = await jwtVerify(token, secretKey);
    return payload as unknown as PeerSession;
  } catch {
    return null;
  }
}

export async function clearPeerSession() {
  const cookieStore = await cookies();
  cookieStore.delete('peer_session');
}
