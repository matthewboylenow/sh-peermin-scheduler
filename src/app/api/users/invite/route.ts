import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { randomBytes } from 'crypto';
import { z } from 'zod';

// POST /api/users/invite - Generate invite link
export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Generate a unique token
    const token = randomBytes(32).toString('hex');

    // Set expiry to 7 days from now
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Create a placeholder user with the invite token
    // This user will be updated when they accept the invite
    await db.insert(users).values({
      name: 'Pending Invite',
      phone: `pending_${token.slice(0, 8)}`, // Temporary unique phone
      inviteToken: token,
      inviteExpiresAt: expiresAt,
      isActive: false, // Not active until they complete registration
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const inviteUrl = `${appUrl}/invite/${token}`;

    return NextResponse.json({
      inviteUrl,
      token,
      expiresAt: expiresAt.toISOString(),
    }, { status: 201 });
  } catch (error) {
    console.error('Error generating invite:', error);
    return NextResponse.json(
      { error: 'Failed to generate invite' },
      { status: 500 }
    );
  }
}

// GET /api/users/invite?token=xxx - Validate invite token
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json({ error: 'Token required' }, { status: 400 });
    }

    const user = await db.query.users.findFirst({
      where: eq(users.inviteToken, token),
    });

    if (!user) {
      return NextResponse.json({ error: 'Invalid invite link' }, { status: 404 });
    }

    if (user.inviteExpiresAt && new Date() > user.inviteExpiresAt) {
      return NextResponse.json({ error: 'Invite link has expired' }, { status: 410 });
    }

    if (user.isActive) {
      return NextResponse.json({ error: 'Invite has already been used' }, { status: 410 });
    }

    return NextResponse.json({
      valid: true,
      expiresAt: user.inviteExpiresAt,
    });
  } catch (error) {
    console.error('Error validating invite:', error);
    return NextResponse.json(
      { error: 'Failed to validate invite' },
      { status: 500 }
    );
  }
}

// PUT /api/users/invite - Accept invite
const acceptInviteSchema = z.object({
  token: z.string().min(1),
  name: z.string().min(1, 'Name is required'),
  phone: z.string().min(10, 'Valid phone number required'),
});

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = acceptInviteSchema.parse(body);

    // Find the invite
    const inviteUser = await db.query.users.findFirst({
      where: eq(users.inviteToken, validatedData.token),
    });

    if (!inviteUser) {
      return NextResponse.json({ error: 'Invalid invite link' }, { status: 404 });
    }

    if (inviteUser.inviteExpiresAt && new Date() > inviteUser.inviteExpiresAt) {
      return NextResponse.json({ error: 'Invite link has expired' }, { status: 410 });
    }

    if (inviteUser.isActive) {
      return NextResponse.json({ error: 'Invite has already been used' }, { status: 410 });
    }

    // Format phone number
    let formattedPhone = validatedData.phone.replace(/\D/g, '');
    if (formattedPhone.length === 10) {
      formattedPhone = `+1${formattedPhone}`;
    } else if (formattedPhone.length === 11 && formattedPhone.startsWith('1')) {
      formattedPhone = `+${formattedPhone}`;
    }

    // Check if phone already exists (for a different user)
    const existingPhone = await db.query.users.findFirst({
      where: eq(users.phone, formattedPhone),
    });

    if (existingPhone && existingPhone.id !== inviteUser.id) {
      return NextResponse.json(
        { error: 'This phone number is already registered' },
        { status: 400 }
      );
    }

    // Update the user with their real information
    const [updatedUser] = await db.update(users)
      .set({
        name: validatedData.name,
        phone: formattedPhone,
        isActive: true,
        inviteToken: null, // Clear the token
        inviteExpiresAt: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, inviteUser.id))
      .returning({
        id: users.id,
        name: users.name,
        phone: users.phone,
      });

    return NextResponse.json({
      success: true,
      user: updatedUser,
    });
  } catch (error) {
    console.error('Error accepting invite:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to accept invite' },
      { status: 500 }
    );
  }
}
