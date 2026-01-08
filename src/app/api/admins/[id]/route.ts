import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq, or, inArray } from 'drizzle-orm';
import { z } from 'zod';
import bcrypt from 'bcryptjs';

const updateAdminSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phone: z.string().min(10).optional(),
  password: z.string().min(8).optional(),
  role: z.enum(['admin', 'super_admin']).optional(),
  isActive: z.boolean().optional(),
});

// GET /api/admins/[id] - Get single admin
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const admin = await db.query.users.findFirst({
      where: eq(users.id, id),
      columns: {
        id: true,
        name: true,
        phone: true,
        email: true,
        role: true,
        isActive: true,
        notificationsEnabled: true,
        createdAt: true,
      },
    });

    if (!admin) {
      return NextResponse.json({ error: 'Admin not found' }, { status: 404 });
    }

    // Verify it's an admin
    if (admin.role !== 'admin' && admin.role !== 'super_admin') {
      return NextResponse.json({ error: 'Not an admin user' }, { status: 404 });
    }

    return NextResponse.json(admin);
  } catch (error) {
    console.error('Error fetching admin:', error);
    return NextResponse.json(
      { error: 'Failed to fetch admin' },
      { status: 500 }
    );
  }
}

// PUT /api/admins/[id] - Update admin
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const validatedData = updateAdminSchema.parse(body);

    // Check if admin exists
    const existingAdmin = await db.query.users.findFirst({
      where: eq(users.id, id),
    });

    if (!existingAdmin) {
      return NextResponse.json({ error: 'Admin not found' }, { status: 404 });
    }

    // Verify it's an admin
    if (existingAdmin.role !== 'admin' && existingAdmin.role !== 'super_admin') {
      return NextResponse.json({ error: 'Not an admin user' }, { status: 404 });
    }

    // Only super_admins can modify other admins (except own profile)
    const isOwnProfile = id === session.user.id;
    const isSuperAdmin = session.user.role === 'super_admin';

    if (!isOwnProfile && !isSuperAdmin) {
      return NextResponse.json(
        { error: 'Only Super Admins can modify other admin accounts' },
        { status: 403 }
      );
    }

    // Non-super admins cannot change roles or activate/deactivate
    if (!isSuperAdmin && (validatedData.role !== undefined || validatedData.isActive !== undefined)) {
      return NextResponse.json(
        { error: 'Only Super Admins can change roles or status' },
        { status: 403 }
      );
    }

    // Prevent demoting the last super_admin
    if (validatedData.role === 'admin' && existingAdmin.role === 'super_admin') {
      const superAdminCount = await db.query.users.findMany({
        where: eq(users.role, 'super_admin'),
      });
      if (superAdminCount.length <= 1) {
        return NextResponse.json(
          { error: 'Cannot demote the last Super Admin' },
          { status: 400 }
        );
      }
    }

    // Prevent deactivating the last super_admin
    if (validatedData.isActive === false && existingAdmin.role === 'super_admin') {
      const activeSuperAdmins = await db.query.users.findMany({
        where: eq(users.role, 'super_admin'),
      });
      const activeCount = activeSuperAdmins.filter(a => a.isActive && a.id !== id).length;
      if (activeCount === 0) {
        return NextResponse.json(
          { error: 'Cannot deactivate the last active Super Admin' },
          { status: 400 }
        );
      }
    }

    // Format phone if provided
    let formattedPhone = validatedData.phone;
    if (formattedPhone) {
      formattedPhone = formattedPhone.replace(/\D/g, '');
      if (formattedPhone.length === 10) {
        formattedPhone = `+1${formattedPhone}`;
      } else if (formattedPhone.length === 11 && formattedPhone.startsWith('1')) {
        formattedPhone = `+${formattedPhone}`;
      } else if (!formattedPhone.startsWith('+')) {
        formattedPhone = `+${formattedPhone}`;
      }

      // Check phone uniqueness
      const phoneExists = await db.query.users.findFirst({
        where: eq(users.phone, formattedPhone),
      });
      if (phoneExists && phoneExists.id !== id) {
        return NextResponse.json(
          { error: 'Phone number already in use' },
          { status: 400 }
        );
      }
    }

    // Check email uniqueness if provided
    if (validatedData.email) {
      const emailExists = await db.query.users.findFirst({
        where: eq(users.email, validatedData.email),
      });
      if (emailExists && emailExists.id !== id) {
        return NextResponse.json(
          { error: 'Email already in use' },
          { status: 400 }
        );
      }
    }

    // Hash password if provided
    let passwordHash: string | undefined;
    if (validatedData.password) {
      passwordHash = await bcrypt.hash(validatedData.password, 10);
    }

    // Update the admin
    const [updatedAdmin] = await db.update(users)
      .set({
        ...(validatedData.name && { name: validatedData.name }),
        ...(validatedData.email && { email: validatedData.email }),
        ...(formattedPhone && { phone: formattedPhone }),
        ...(passwordHash && { passwordHash }),
        ...(validatedData.role && { role: validatedData.role }),
        ...(validatedData.isActive !== undefined && { isActive: validatedData.isActive }),
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning({
        id: users.id,
        name: users.name,
        phone: users.phone,
        email: users.email,
        role: users.role,
        isActive: users.isActive,
      });

    return NextResponse.json(updatedAdmin);
  } catch (error) {
    console.error('Error updating admin:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to update admin' },
      { status: 500 }
    );
  }
}
