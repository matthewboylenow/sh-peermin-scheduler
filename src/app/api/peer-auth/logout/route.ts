import { NextResponse } from 'next/server';
import { clearPeerSession } from '@/lib/peer-session';

export async function POST() {
  try {
    await clearPeerSession();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error logging out:', error);
    return NextResponse.json(
      { error: 'Logout failed' },
      { status: 500 }
    );
  }
}
