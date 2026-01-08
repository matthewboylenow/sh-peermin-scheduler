import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users, verificationCodes } from '@/db/schema';
import { eq, and, gt } from 'drizzle-orm';
import { sendVerificationCode } from '@/lib/twilio';
import { z } from 'zod';

const sendCodeSchema = z.object({
  phone: z.string().min(10),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone: rawPhone } = sendCodeSchema.parse(body);

    // Format phone number
    let phone = rawPhone.replace(/\D/g, '');
    if (phone.length === 10) {
      phone = `+1${phone}`;
    } else if (phone.length === 11 && phone.startsWith('1')) {
      phone = `+${phone}`;
    } else if (!phone.startsWith('+')) {
      phone = `+${phone}`;
    }

    // Check if user exists
    const user = await db.query.users.findFirst({
      where: and(
        eq(users.phone, phone),
        eq(users.isActive, true)
      ),
    });

    if (!user) {
      return NextResponse.json(
        { error: 'No account found with this phone number' },
        { status: 404 }
      );
    }

    // Rate limiting - check for recent verification codes
    const recentCode = await db.query.verificationCodes.findFirst({
      where: and(
        eq(verificationCodes.phone, phone),
        gt(verificationCodes.createdAt, new Date(Date.now() - 60000)) // 1 minute ago
      ),
    });

    if (recentCode) {
      return NextResponse.json(
        { error: 'Please wait before requesting another code' },
        { status: 429 }
      );
    }

    // Send verification code via Twilio Verify
    const sent = await sendVerificationCode(phone);

    if (!sent) {
      return NextResponse.json(
        { error: 'Failed to send verification code' },
        { status: 500 }
      );
    }

    // Log the attempt (for rate limiting)
    await db.insert(verificationCodes).values({
      phone,
      code: 'twilio-verify', // We don't store the actual code when using Twilio Verify
      expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
    });

    return NextResponse.json({
      success: true,
      message: 'Verification code sent',
    });
  } catch (error) {
    console.error('Error sending code:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid phone number' },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to send verification code' },
      { status: 500 }
    );
  }
}
