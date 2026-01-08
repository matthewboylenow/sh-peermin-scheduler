import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { checkVerificationCode } from '@/lib/twilio';
import { createPeerSession } from '@/lib/peer-session';
import { z } from 'zod';

const verifySchema = z.object({
  phone: z.string().min(10),
  code: z.string().length(6),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone: rawPhone, code } = verifySchema.parse(body);

    // Format phone number
    let phone = rawPhone.replace(/\D/g, '');
    if (phone.length === 10) {
      phone = `+1${phone}`;
    } else if (phone.length === 11 && phone.startsWith('1')) {
      phone = `+${phone}`;
    } else if (!phone.startsWith('+')) {
      phone = `+${phone}`;
    }

    // Verify the code with Twilio
    const isValid = await checkVerificationCode(phone, code);

    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid or expired verification code' },
        { status: 401 }
      );
    }

    // Get the user
    const user = await db.query.users.findFirst({
      where: and(
        eq(users.phone, phone),
        eq(users.isActive, true)
      ),
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Create session (user.phone is guaranteed since we queried by phone)
    await createPeerSession(user.id, user.phone!, user.name);

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
      },
    });
  } catch (error) {
    console.error('Error verifying code:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input' },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Verification failed' },
      { status: 500 }
    );
  }
}
