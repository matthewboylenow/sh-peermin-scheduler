import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';

const createUserSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  phone: z.string().min(10, 'Valid phone number required'),
  email: z.string().email().optional(),
  role: z.enum(['peer_minister', 'admin', 'super_admin']).default('peer_minister'),
});

// GET /api/users - List users
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role');
    const search = searchParams.get('search');
    const active = searchParams.get('active');

    const conditions = [];

    if (role) {
      conditions.push(eq(users.role, role as 'peer_minister' | 'admin' | 'super_admin'));
    }

    if (active !== null && active !== undefined) {
      conditions.push(eq(users.isActive, active === 'true'));
    }

    let result = await db.query.users.findMany({
      where: conditions.length > 0 ? and(...conditions) : undefined,
      columns: {
        id: true,
        name: true,
        phone: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: (users, { asc }) => [asc(users.name)],
    });

    // Apply search filter in memory (for name and phone)
    if (search) {
      const searchLower = search.toLowerCase();
      result = result.filter(
        user =>
          user.name.toLowerCase().includes(searchLower) ||
          (user.phone && user.phone.includes(search))
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

// POST /api/users - Create user
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = createUserSchema.parse(body);

    // Format phone number (remove non-digits, ensure +1 prefix)
    let formattedPhone = validatedData.phone.replace(/\D/g, '');
    if (formattedPhone.length === 10) {
      formattedPhone = `+1${formattedPhone}`;
    } else if (formattedPhone.length === 11 && formattedPhone.startsWith('1')) {
      formattedPhone = `+${formattedPhone}`;
    } else if (!formattedPhone.startsWith('+')) {
      formattedPhone = `+${formattedPhone}`;
    }

    // Check if phone already exists
    const existingUser = await db.query.users.findFirst({
      where: eq(users.phone, formattedPhone),
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'A user with this phone number already exists' },
        { status: 400 }
      );
    }

    // Check if email already exists (if provided)
    if (validatedData.email) {
      const existingEmail = await db.query.users.findFirst({
        where: eq(users.email, validatedData.email),
      });

      if (existingEmail) {
        return NextResponse.json(
          { error: 'A user with this email already exists' },
          { status: 400 }
        );
      }
    }

    // Create the user
    const [user] = await db.insert(users).values({
      name: validatedData.name,
      phone: formattedPhone,
      email: validatedData.email || null,
      role: validatedData.role,
    }).returning({
      id: users.id,
      name: users.name,
      phone: users.phone,
      email: users.email,
      role: users.role,
      isActive: users.isActive,
      createdAt: users.createdAt,
    });

    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    console.error('Error creating user:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    );
  }
}
