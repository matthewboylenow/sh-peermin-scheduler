import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getPeerSession } from '@/lib/peer-session';

/**
 * Authorization helpers for API routes.
 *
 * Peer ministers' contact details belong to minors, so read endpoints need a
 * session just as much as write endpoints do. These helpers make the required
 * role explicit at each call site rather than leaving it to a bare
 * `session?.user?.id` check.
 */

export const ADMIN_ROLES = ['admin', 'super_admin'] as const;

export function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

export function forbidden(message = 'Forbidden') {
  return NextResponse.json({ error: message }, { status: 403 });
}

/** The signed-in admin, or null. Peer minister sessions do not count. */
export async function getAdminSession() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const role = session.user.role;
  if (role !== 'admin' && role !== 'super_admin') return null;

  return session;
}

export async function isSuperAdmin() {
  const session = await getAdminSession();
  return session?.user?.role === 'super_admin';
}

/**
 * True when the request carries any signed-in identity — an admin or a peer
 * minister. Use for resources both audiences legitimately read, such as the
 * shared file library and the event schedule.
 */
export async function hasAnySession() {
  const [adminSession, peerSession] = await Promise.all([
    auth(),
    getPeerSession(),
  ]);
  return Boolean(adminSession?.user?.id || peerSession);
}
