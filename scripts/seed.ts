import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import bcrypt from 'bcryptjs';
import * as schema from '../src/db/schema';
import { users } from '../src/db/schema';

async function seed() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL environment variable is not set');
    process.exit(1);
  }

  console.log('Connecting to database...');
  const sql = neon(process.env.DATABASE_URL);
  const db = drizzle(sql, { schema });

  // Seed super admin user
  const adminEmail = 'admin@sainthelen.org';
  const adminPassword = 'changeme123'; // This should be changed after first login
  const adminName = 'Super Admin';
  const adminPhone = '+19085551234';

  console.log('Creating super admin user...');

  const passwordHash = await bcrypt.hash(adminPassword, 10);

  try {
    await db.insert(users).values({
      name: adminName,
      email: adminEmail,
      phone: adminPhone,
      passwordHash: passwordHash,
      role: 'super_admin',
      isActive: true,
      notificationsEnabled: true,
    }).onConflictDoNothing();

    console.log('Super admin user created successfully!');
    console.log('');
    console.log('Login credentials:');
    console.log(`  Email: ${adminEmail}`);
    console.log(`  Password: ${adminPassword}`);
    console.log('');
    console.log('IMPORTANT: Change this password after first login!');
  } catch (error) {
    console.error('Error creating super admin:', error);
    process.exit(1);
  }

  process.exit(0);
}

seed();
