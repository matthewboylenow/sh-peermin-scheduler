import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq, inArray } from 'drizzle-orm';
import { z } from 'zod';
import bcrypt from 'bcryptjs';

const createAdminSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Valid email required'),
  phone: z.string().min(10, 'Valid phone number required').optional(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(['admin', 'super_admin']).default('admin'),
});

// GET /api/admins - List all admins
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adminUsers = await db.query.users.findMany({
      where: inArray(users.role, ['admin', 'super_admin']),
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

    return NextResponse.json(adminUsers);
  } catch (error) {
    console.error('Error fetching admins:', error);
    return NextResponse.json(
      { error: 'Failed to fetch admins' },
      { status: 500 }
    );
  }
}

// POST /api/admins - Create new admin
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only super_admins can create admins
    if (session.user.role !== 'super_admin') {
      return NextResponse.json(
        { error: 'Only Super Admins can create admin accounts' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = createAdminSchema.parse(body);

    // Format phone number if provided
    let formattedPhone: string | null = null;
    if (validatedData.phone) {
      formattedPhone = validatedData.phone.replace(/\D/g, '');
      if (formattedPhone.length === 10) {
        formattedPhone = `+1${formattedPhone}`;
      } else if (formattedPhone.length === 11 && formattedPhone.startsWith('1')) {
        formattedPhone = `+${formattedPhone}`;
      } else if (!formattedPhone.startsWith('+')) {
        formattedPhone = `+${formattedPhone}`;
      }
    }

    // Check if email already exists
    const existingEmail = await db.query.users.findFirst({
      where: eq(users.email, validatedData.email),
    });

    if (existingEmail) {
      return NextResponse.json(
        { error: 'A user with this email already exists' },
        { status: 400 }
      );
    }

    // Check if phone already exists (if provided)
    if (formattedPhone) {
      const existingPhone = await db.query.users.findFirst({
        where: eq(users.phone, formattedPhone),
      });

      if (existingPhone) {
        return NextResponse.json(
          { error: 'A user with this phone number already exists' },
          { status: 400 }
        );
      }
    }

    // Hash password
    const passwordHash = await bcrypt.hash(validatedData.password, 10);

    // Create the admin
    const [admin] = await db.insert(users).values({
      name: validatedData.name,
      email: validatedData.email,
      phone: formattedPhone,
      passwordHash,
      role: validatedData.role,
      isActive: true,
      notificationsEnabled: true,
    }).returning({
      id: users.id,
      name: users.name,
      phone: users.phone,
      email: users.email,
      role: users.role,
      isActive: users.isActive,
      createdAt: users.createdAt,
    });

    return NextResponse.json(admin, { status: 201 });
  } catch (error) {
    console.error('Error creating admin:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to create admin' },
      { status: 500 }
    );
  }
}
