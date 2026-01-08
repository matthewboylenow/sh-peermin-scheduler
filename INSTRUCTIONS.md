# Saint Helen Peer Ministry Scheduler - Claude Code Instructions

> **IMPORTANT**: This document is the single source of truth for building this application. Read it completely before starting any work. Maintain the `PROGRESS_LOG.md` file as specified at the end of this document.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Tech Stack](#tech-stack)
3. [Brand & Design System](#brand--design-system)
4. [Database Schema](#database-schema)
5. [Authentication System](#authentication-system)
6. [Feature Specifications](#feature-specifications)
7. [Page Structure & Routes](#page-structure--routes)
8. [API Routes](#api-routes)
9. [Component Library](#component-library)
10. [Third-Party Integrations](#third-party-integrations)
11. [Development Phases](#development-phases)
12. [Environment Variables](#environment-variables)
13. [Deployment](#deployment)
14. [Progress Log Instructions](#progress-log-instructions)

---

## Project Overview

### What We're Building

A web application for Saint Helen Parish to manage peer ministry scheduling and file sharing. The app serves three user types:

1. **Admins (3-4 staff + 1 super admin)**: Create events, assign peer ministers to slots, upload/manage files, send reminders
2. **Peer Ministers (80+ teens)**: View their schedules, access shared files, receive SMS reminders
3. **Public visitors**: View the master schedule (no personal details)

### Core Functionality

- **Event & Scheduling System**: Create events with multiple slots, assign peer ministers, handle recurring events
- **File Sharing**: One-way file sharing from admins to peer ministers with folder organization
- **SMS Reminders**: Automated day-before reminders via Twilio
- **Admin Notifications**: Optional alerts for unfilled slots
- **CSV Export**: Export schedules and rosters

---

## Tech Stack

```
Framework:        Next.js 15 (App Router)
Language:         TypeScript (strict mode)
Database:         Neon (PostgreSQL)
ORM:              Drizzle ORM
File Storage:     Vercel Blob
Auth (Admin):     NextAuth.js v5 (credentials provider)
Auth (Peer):      Custom SMS verification via Twilio
SMS:              Twilio (Verify API for auth, Messages API for reminders)
Styling:          Tailwind CSS v3
UI Components:    shadcn/ui (customized to brand)
Icons:            Lucide React
Forms:            React Hook Form + Zod validation
Date Handling:    date-fns
Deployment:       Vercel
Cron Jobs:        Vercel Cron
```

### Key Dependencies to Install

```bash
# Core
npm install next@latest react@latest react-dom@latest typescript @types/react @types/node

# Database
npm install drizzle-orm @neondatabase/serverless
npm install -D drizzle-kit

# Auth
npm install next-auth@beta @auth/drizzle-adapter

# UI
npm install tailwindcss postcss autoprefixer
npm install class-variance-authority clsx tailwind-merge
npm install @radix-ui/react-dialog @radix-ui/react-dropdown-menu @radix-ui/react-select @radix-ui/react-checkbox @radix-ui/react-label @radix-ui/react-slot @radix-ui/react-tabs @radix-ui/react-toast @radix-ui/react-popover @radix-ui/react-calendar
npm install lucide-react

# Forms & Validation
npm install react-hook-form @hookform/resolvers zod

# Utilities
npm install date-fns
npm install @vercel/blob
npm install twilio

# Dev
npm install -D @types/node prettier eslint
```

---

## Brand & Design System

### Colors

```css
/* CSS Custom Properties - define in globals.css */
:root {
  /* Primary */
  --navy: #1F346D;
  --navy-dark: #162650;
  --navy-light: #2A4A8F;
  
  /* Accent */
  --rust: #CD5334;
  --rust-dark: #B54529;
  --rust-light: #E06B4D;
  
  /* Neutrals */
  --white: #FFFFFF;
  --cream: #FAF9F7;
  --cream-light: #F5F3F0;
  --gray-100: #F3F4F6;
  --gray-200: #E5E7EB;
  --gray-300: #D1D5DB;
  --gray-400: #9CA3AF;
  --gray-500: #6B7280;
  --gray-600: #4B5563;
  --gray-700: #374151;
  --gray-800: #1F2937;
  --gray-900: #111827;
  
  /* Semantic */
  --success: #10B981;
  --warning: #F59E0B;
  --error: #EF4444;
  --info: #3B82F6;
}
```

### Tailwind Config

```typescript
// tailwind.config.ts
import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: '#1F346D',
          dark: '#162650',
          light: '#2A4A8F',
        },
        rust: {
          DEFAULT: '#CD5334',
          dark: '#B54529',
          light: '#E06B4D',
        },
        cream: {
          DEFAULT: '#FAF9F7',
          light: '#F5F3F0',
        },
      },
      fontFamily: {
        heading: ['Libre Baskerville', 'serif'],
        body: ['Libre Franklin', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '12px',
        lg: '16px',
        xl: '20px',
      },
      boxShadow: {
        'card': '0 2px 8px rgba(0, 0, 0, 0.08)',
        'card-hover': '0 8px 24px rgba(0, 0, 0, 0.12)',
        'button': '0 2px 4px rgba(31, 52, 109, 0.2)',
        'button-hover': '0 4px 8px rgba(31, 52, 109, 0.3)',
      },
      transitionTimingFunction: {
        'bounce-soft': 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}

export default config
```

### Typography

```css
/* In globals.css */
@import url('https://fonts.googleapis.com/css2?family=Libre+Baskerville:wght@400;700&family=Libre+Franklin:wght@300;400;500;600;700&display=swap');

body {
  font-family: 'Libre Franklin', sans-serif;
  font-size: 16px;
  line-height: 1.6;
  color: var(--gray-800);
}

h1, h2, h3, h4, h5, h6 {
  font-family: 'Libre Baskerville', serif;
  font-weight: 700;
  color: var(--navy);
}
```

### Component Styling Patterns

**Cards:**
```tsx
// Standard card
className="bg-white border border-gray-200 rounded-xl shadow-card hover:shadow-card-hover hover:-translate-y-1 transition-all duration-300"

// With gradient top bar
className="bg-white border border-gray-200 rounded-xl shadow-card overflow-hidden"
// + child div: className="h-1 bg-gradient-to-r from-navy to-rust"
```

**Buttons:**
```tsx
// Primary (Navy)
className="bg-navy hover:bg-navy-dark text-white font-medium px-6 py-3 rounded-lg shadow-button hover:shadow-button-hover hover:-translate-y-0.5 transition-all duration-200"

// Accent (Rust)
className="bg-rust hover:bg-rust-dark text-white font-medium px-6 py-3 rounded-lg shadow-button hover:shadow-button-hover hover:-translate-y-0.5 transition-all duration-200"

// Secondary/Outline
className="bg-white border-2 border-navy text-navy hover:bg-navy hover:text-white font-medium px-6 py-3 rounded-lg transition-all duration-200"

// With arrow
<button className="group ...">
  Get Started 
  <span className="inline-block ml-2 group-hover:translate-x-1 transition-transform">→</span>
</button>
```

**Section Alternating Backgrounds:**
```tsx
// Alternate between white and cream for visual rhythm
<section className="bg-white py-16 md:py-20">
<section className="bg-cream py-16 md:py-20">
<section className="bg-cream-light py-16 md:py-20">
```

### Logo

- Location: `/public/saint-helen-logo.png`
- Format: White logo on transparent background
- Usage: Display on navy backgrounds, invert/filter for light backgrounds if needed

---

## Database Schema

Use Drizzle ORM. Create schema in `src/db/schema.ts`:

```typescript
import { pgTable, uuid, text, timestamp, boolean, integer, date, time, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const userRoleEnum = pgEnum('user_role', ['super_admin', 'admin', 'peer_minister']);
export const eventTypeEnum = pgEnum('event_type', ['mass', 'clow', 'volunteer', 'ministry', 'other']);
export const recurrenceTypeEnum = pgEnum('recurrence_type', ['none', 'daily', 'weekly', 'biweekly', 'monthly']);

// Users Table
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  phone: text('phone').unique().notNull(),
  email: text('email').unique(), // Only for admins
  passwordHash: text('password_hash'), // Only for admins
  role: userRoleEnum('role').notNull().default('peer_minister'),
  isActive: boolean('is_active').notNull().default(true),
  inviteToken: text('invite_token').unique(), // For invite links
  inviteExpiresAt: timestamp('invite_expires_at'),
  notificationsEnabled: boolean('notifications_enabled').notNull().default(true), // Admin notification preference
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Events Table
export const events = pgTable('events', {
  id: uuid('id').defaultRandom().primaryKey(),
  title: text('title').notNull(),
  description: text('description'),
  eventType: eventTypeEnum('event_type').notNull().default('other'),
  eventDate: date('event_date').notNull(),
  startTime: time('start_time').notNull(),
  endTime: time('end_time'),
  location: text('location'),
  // Recurrence fields
  recurrenceType: recurrenceTypeEnum('recurrence_type').notNull().default('none'),
  recurrenceEndDate: date('recurrence_end_date'), // When recurrence stops
  parentEventId: uuid('parent_event_id').references(() => events.id), // Links recurring instances to parent
  // Metadata
  createdBy: uuid('created_by').references(() => users.id).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Slots Table (roles within an event)
export const slots = pgTable('slots', {
  id: uuid('id').defaultRandom().primaryKey(),
  eventId: uuid('event_id').references(() => events.id, { onDelete: 'cascade' }).notNull(),
  name: text('name').notNull(), // e.g., "Greeter", "Usher", "CLOW Leader"
  capacity: integer('capacity').notNull().default(1),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Assignments Table (peer minister → slot)
export const assignments = pgTable('assignments', {
  id: uuid('id').defaultRandom().primaryKey(),
  slotId: uuid('slot_id').references(() => slots.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  reminderSent: boolean('reminder_sent').notNull().default(false),
  notes: text('notes'),
  createdBy: uuid('created_by').references(() => users.id).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Folders Table (for file organization)
export const folders = pgTable('folders', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  parentId: uuid('parent_id').references(() => folders.id, { onDelete: 'cascade' }),
  createdBy: uuid('created_by').references(() => users.id).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Files Table
export const files = pgTable('files', {
  id: uuid('id').defaultRandom().primaryKey(),
  folderId: uuid('folder_id').references(() => folders.id, { onDelete: 'set null' }),
  name: text('name').notNull(),
  blobUrl: text('blob_url').notNull(),
  fileType: text('file_type').notNull(), // MIME type
  fileSize: integer('file_size').notNull(), // bytes
  uploadedBy: uuid('uploaded_by').references(() => users.id).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Verification Codes Table (SMS login)
export const verificationCodes = pgTable('verification_codes', {
  id: uuid('id').defaultRandom().primaryKey(),
  phone: text('phone').notNull(),
  code: text('code').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Admin Notification Settings
export const adminSettings = pgTable('admin_settings', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull().unique(),
  unfillledSlotsAlert: boolean('unfilled_slots_alert').notNull().default(true),
  alertDaysBefore: integer('alert_days_before').notNull().default(2), // Days before event to alert
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// SMS Log (for tracking sent messages)
export const smsLog = pgTable('sms_log', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id),
  phone: text('phone').notNull(),
  messageType: text('message_type').notNull(), // 'reminder', 'verification', 'admin_alert'
  messageBody: text('message_body').notNull(),
  twilioSid: text('twilio_sid'),
  status: text('status').notNull(), // 'sent', 'failed', 'delivered'
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(users, ({ many, one }) => ({
  assignments: many(assignments),
  createdEvents: many(events),
  uploadedFiles: many(files),
  adminSettings: one(adminSettings),
}));

export const eventsRelations = relations(events, ({ one, many }) => ({
  creator: one(users, { fields: [events.createdBy], references: [users.id] }),
  slots: many(slots),
  parentEvent: one(events, { fields: [events.parentEventId], references: [events.id] }),
  childEvents: many(events),
}));

export const slotsRelations = relations(slots, ({ one, many }) => ({
  event: one(events, { fields: [slots.eventId], references: [events.id] }),
  assignments: many(assignments),
}));

export const assignmentsRelations = relations(assignments, ({ one }) => ({
  slot: one(slots, { fields: [assignments.slotId], references: [slots.id] }),
  user: one(users, { fields: [assignments.userId], references: [users.id] }),
  createdByUser: one(users, { fields: [assignments.createdBy], references: [users.id] }),
}));

export const foldersRelations = relations(folders, ({ one, many }) => ({
  parent: one(folders, { fields: [folders.parentId], references: [folders.id] }),
  children: many(folders),
  files: many(files),
  creator: one(users, { fields: [folders.createdBy], references: [users.id] }),
}));

export const filesRelations = relations(files, ({ one }) => ({
  folder: one(folders, { fields: [files.folderId], references: [folders.id] }),
  uploader: one(users, { fields: [files.uploadedBy], references: [users.id] }),
}));
```

### Database Connection

```typescript
// src/db/index.ts
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

const sql = neon(process.env.DATABASE_URL!);
export const db = drizzle(sql, { schema });
```

### Drizzle Config

```typescript
// drizzle.config.ts
import type { Config } from 'drizzle-kit';

export default {
  schema: './src/db/schema.ts',
  out: './drizzle',
  driver: 'pg',
  dbCredentials: {
    connectionString: process.env.DATABASE_URL!,
  },
} satisfies Config;
```

---

## Authentication System

### Admin Authentication (NextAuth v5)

```typescript
// src/auth.ts
import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      authorize: async (credentials) => {
        if (!credentials?.email || !credentials?.password) return null;
        
        const user = await db.query.users.findFirst({
          where: and(
            eq(users.email, credentials.email as string),
            eq(users.isActive, true)
          ),
        });
        
        if (!user || !user.passwordHash) return null;
        if (user.role !== 'admin' && user.role !== 'super_admin') return null;
        
        const isValid = await bcrypt.compare(credentials.password as string, user.passwordHash);
        if (!isValid) return null;
        
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    jwt: async ({ token, user }) => {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    session: async ({ session, token }) => {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
      }
      return session;
    },
  },
  pages: {
    signIn: '/admin/login',
  },
});
```

### Peer Minister SMS Authentication

Custom implementation using Twilio Verify:

```typescript
// src/lib/twilio.ts
import twilio from 'twilio';

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID!,
  process.env.TWILIO_AUTH_TOKEN!
);

const verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID!;

export async function sendVerificationCode(phone: string): Promise<boolean> {
  try {
    await client.verify.v2
      .services(verifyServiceSid)
      .verifications.create({ to: phone, channel: 'sms' });
    return true;
  } catch (error) {
    console.error('Failed to send verification:', error);
    return false;
  }
}

export async function checkVerificationCode(phone: string, code: string): Promise<boolean> {
  try {
    const verification = await client.verify.v2
      .services(verifyServiceSid)
      .verificationChecks.create({ to: phone, code });
    return verification.status === 'approved';
  } catch (error) {
    console.error('Failed to check verification:', error);
    return false;
  }
}

export async function sendSMS(phone: string, message: string): Promise<string | null> {
  try {
    const result = await client.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER!,
      to: phone,
    });
    return result.sid;
  } catch (error) {
    console.error('Failed to send SMS:', error);
    return null;
  }
}
```

### Session Management for Peer Ministers

Use HTTP-only cookies with signed tokens:

```typescript
// src/lib/peer-session.ts
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const secretKey = new TextEncoder().encode(process.env.PEER_SESSION_SECRET!);

export async function createPeerSession(userId: string, phone: string) {
  const token = await new SignJWT({ userId, phone })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('30d')
    .sign(secretKey);
  
  cookies().set('peer_session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
}

export async function getPeerSession() {
  const token = cookies().get('peer_session')?.value;
  if (!token) return null;
  
  try {
    const { payload } = await jwtVerify(token, secretKey);
    return payload as { userId: string; phone: string };
  } catch {
    return null;
  }
}

export async function clearPeerSession() {
  cookies().delete('peer_session');
}
```

---

## Feature Specifications

### 1. Event Management

**Create Event:**
- Title (required)
- Description (optional)
- Event Type: Mass, CLOW, Volunteer, Ministry, Other
- Date (required)
- Start Time (required)
- End Time (optional)
- Location (optional)
- Recurrence: None, Daily, Weekly, Bi-weekly, Monthly
- Recurrence End Date (if recurring)

**Recurrence Logic:**
- When creating a recurring event, generate all instances up to the end date
- Link child events to parent via `parentEventId`
- Editing parent can optionally update all future instances
- Deleting parent can optionally delete all future instances

**Slots Management:**
- Add multiple slots per event
- Each slot has: Name, Capacity (number needed), Notes
- Examples: "Greeter (need 2)", "Usher (need 3)", "CLOW Leader (need 1)"

### 2. Assignment System

**Assigning Peer Ministers:**
- Select event → See all slots and current assignments
- Click slot → Search/select peer minister(s)
- Show warnings for:
  - Double-booking (same person, same time slot on same day)
  - Over-capacity (more assigned than slot capacity)
- Bulk assign: Select peer minister → Assign to multiple dates/slots

**Viewing Assignments:**
- Calendar view: Month/Week with event dots
- List view: Chronological list of upcoming events
- Filter by: Event type, Date range, Assigned/Unassigned

### 3. Peer Minister Management

**Adding Peer Ministers:**

Option A - Manual Add:
- Name, Phone number
- Automatically set role to 'peer_minister'

Option B - Invite Link:
- Generate unique invite link with token
- Link expires after 7 days
- Peer minister clicks link → Enters their name → Verifies phone → Account created

**Managing Peer Ministers:**
- View all with search/filter
- Edit name, phone
- Deactivate (soft delete) - keeps history
- View assignment history

### 4. File Sharing

**Folder Management (Admin):**
- Create, rename, delete folders
- Nest folders (one level deep recommended)
- Move files between folders

**File Operations (Admin):**
- Upload files (any type, reasonable size limit ~50MB)
- Rename files
- Delete files
- View upload history

**Peer Minister View:**
- Browse folder structure
- View file details (name, type, size, upload date)
- Download files
- Search files

### 5. SMS Reminders

**Automated Reminders:**
- Cron job runs daily at 6:00 PM EST
- Query assignments where event is tomorrow and reminder not sent
- Send personalized SMS:
  ```
  Hi [Name]! Reminder: You're scheduled for [Event Title] tomorrow at [Time] as [Role]. Location: [Location]. See you there! 🙏 - Saint Helen Parish
  ```
- Mark `reminderSent = true`
- Log all SMS in `smsLog` table

**Manual Reminder (Admin):**
- Button to send immediate reminder for specific assignment
- Button to send reminder to all assigned for an event

### 6. Admin Notifications

**Unfilled Slots Alert:**
- Toggle on/off per admin in settings
- Configurable: Alert X days before event (default: 2)
- Daily check: Find events within alert window with unfilled slots
- Send SMS to admins with notifications enabled:
  ```
  Alert: [Event Title] on [Date] has [X] unfilled slots. Please assign peer ministers. - Saint Helen Scheduler
  ```

### 7. CSV Export

**Export Options:**
- Schedule Export: Date range, includes all events/slots/assignments
- Roster Export: All peer ministers with contact info
- Event Export: Single event with all assignments

**CSV Format Example (Schedule):**
```csv
Event Date,Event Time,Event Title,Event Type,Location,Slot,Assigned To,Phone
2025-01-12,10:00 AM,Sunday Mass,Mass,Church,Greeter,John Smith,+19085551234
2025-01-12,10:00 AM,Sunday Mass,Mass,Church,Greeter,Jane Doe,+19085555678
2025-01-12,10:00 AM,Sunday Mass,Mass,Church,Usher,Bob Johnson,+19085559012
```

### 8. Public Schedule View

**Display:**
- Calendar view of all events
- Event cards show: Title, Date, Time, Location, Type
- Do NOT show: Who is assigned, slot details
- Optional: Show "Staffing: 3/4" type indicators

---

## Page Structure & Routes

```
src/app/
├── layout.tsx                    # Root layout
├── page.tsx                      # Public landing page
├── globals.css                   # Global styles
│
├── (public)/                     # Public routes (no auth)
│   ├── schedule/
│   │   └── page.tsx              # Public calendar view
│   └── invite/
│       └── [token]/
│           └── page.tsx          # Invite link handler
│
├── (auth)/                       # Auth pages
│   ├── login/
│   │   └── page.tsx              # Peer minister phone login
│   ├── verify/
│   │   └── page.tsx              # SMS code verification
│   └── admin/
│       └── login/
│           └── page.tsx          # Admin email/password login
│
├── my/                           # Peer minister portal (SMS auth required)
│   ├── layout.tsx                # Peer portal layout
│   ├── page.tsx                  # Redirect to /my/schedule
│   ├── schedule/
│   │   └── page.tsx              # My upcoming assignments
│   └── files/
│       ├── page.tsx              # File browser root
│       └── [...path]/
│           └── page.tsx          # Nested folder view
│
├── admin/                        # Admin portal (NextAuth required)
│   ├── layout.tsx                # Admin layout with sidebar
│   ├── page.tsx                  # Dashboard
│   ├── events/
│   │   ├── page.tsx              # Event list/calendar
│   │   ├── new/
│   │   │   └── page.tsx          # Create event
│   │   └── [id]/
│   │       ├── page.tsx          # Event details + slot management
│   │       └── edit/
│   │           └── page.tsx      # Edit event
│   ├── schedule/
│   │   └── page.tsx              # Full calendar + assignment view
│   ├── people/
│   │   ├── page.tsx              # Peer minister list
│   │   ├── new/
│   │   │   └── page.tsx          # Add peer minister
│   │   ├── invite/
│   │   │   └── page.tsx          # Generate invite link
│   │   └── [id]/
│   │       └── page.tsx          # Edit peer minister
│   ├── files/
│   │   ├── page.tsx              # File manager
│   │   └── [...path]/
│   │       └── page.tsx          # Folder view
│   ├── export/
│   │   └── page.tsx              # CSV export options
│   ├── admins/
│   │   └── page.tsx              # Manage admins (super admin only)
│   └── settings/
│       └── page.tsx              # Admin settings (notifications, etc.)
│
└── api/                          # API routes
    ├── auth/
    │   └── [...nextauth]/
    │       └── route.ts          # NextAuth handlers
    ├── peer-auth/
    │   ├── send-code/
    │   │   └── route.ts          # Send SMS verification
    │   ├── verify/
    │   │   └── route.ts          # Verify SMS code
    │   └── logout/
    │       └── route.ts          # Clear peer session
    ├── events/
    │   ├── route.ts              # GET (list), POST (create)
    │   └── [id]/
    │       └── route.ts          # GET, PUT, DELETE
    ├── slots/
    │   ├── route.ts              # POST (create)
    │   └── [id]/
    │       └── route.ts          # PUT, DELETE
    ├── assignments/
    │   ├── route.ts              # GET, POST
    │   └── [id]/
    │       └── route.ts          # DELETE
    ├── users/
    │   ├── route.ts              # GET (list), POST (create)
    │   ├── [id]/
    │   │   └── route.ts          # GET, PUT, DELETE
    │   └── invite/
    │       └── route.ts          # POST (generate invite)
    ├── folders/
    │   ├── route.ts              # GET, POST
    │   └── [id]/
    │       └── route.ts          # PUT, DELETE
    ├── files/
    │   ├── route.ts              # GET (list)
    │   ├── upload/
    │   │   └── route.ts          # POST (upload to Vercel Blob)
    │   └── [id]/
    │       └── route.ts          # DELETE
    ├── export/
    │   └── route.ts              # GET with query params for export type
    ├── reminders/
    │   ├── send/
    │   │   └── route.ts          # POST (manual reminder)
    │   └── cron/
    │       └── route.ts          # POST (called by Vercel Cron)
    └── admin-alerts/
        └── cron/
            └── route.ts          # POST (admin notification cron)
```

---

## API Routes

### Authentication APIs

```typescript
// POST /api/peer-auth/send-code
// Body: { phone: string }
// Response: { success: boolean, message: string }

// POST /api/peer-auth/verify
// Body: { phone: string, code: string }
// Response: { success: boolean, user?: { id, name, phone } }

// POST /api/peer-auth/logout
// Response: { success: boolean }
```

### Event APIs

```typescript
// GET /api/events
// Query: ?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD&type=mass|clow|...
// Response: Event[]

// POST /api/events
// Body: { title, description?, eventType, eventDate, startTime, endTime?, location?, recurrenceType, recurrenceEndDate? }
// Response: Event (or Event[] if recurring)

// GET /api/events/[id]
// Response: Event with slots and assignments

// PUT /api/events/[id]
// Body: Partial<Event> & { updateFutureInstances?: boolean }
// Response: Event

// DELETE /api/events/[id]
// Query: ?deleteFutureInstances=true
// Response: { success: boolean }
```

### Slot APIs

```typescript
// POST /api/slots
// Body: { eventId, name, capacity, notes? }
// Response: Slot

// PUT /api/slots/[id]
// Body: Partial<Slot>
// Response: Slot

// DELETE /api/slots/[id]
// Response: { success: boolean }
```

### Assignment APIs

```typescript
// GET /api/assignments
// Query: ?userId=xxx&eventId=xxx&startDate=xxx&endDate=xxx
// Response: Assignment[] with related user, slot, event data

// POST /api/assignments
// Body: { slotId, userId, notes? }
// Response: Assignment

// DELETE /api/assignments/[id]
// Response: { success: boolean }
```

### User APIs

```typescript
// GET /api/users
// Query: ?role=peer_minister&search=xxx&active=true
// Response: User[]

// POST /api/users
// Body: { name, phone, email?, role? }
// Response: User

// GET /api/users/[id]
// Response: User with assignment history

// PUT /api/users/[id]
// Body: Partial<User>
// Response: User

// DELETE /api/users/[id] (soft delete - sets isActive = false)
// Response: { success: boolean }

// POST /api/users/invite
// Body: { } (generates new invite)
// Response: { inviteUrl: string, expiresAt: string }
```

### File APIs

```typescript
// GET /api/folders
// Query: ?parentId=xxx (null for root)
// Response: Folder[]

// POST /api/folders
// Body: { name, parentId? }
// Response: Folder

// PUT /api/folders/[id]
// Body: { name?, parentId? }
// Response: Folder

// DELETE /api/folders/[id]
// Response: { success: boolean }

// GET /api/files
// Query: ?folderId=xxx
// Response: File[]

// POST /api/files/upload
// Body: FormData with file and folderId
// Response: File

// DELETE /api/files/[id]
// Response: { success: boolean }
```

### Export API

```typescript
// GET /api/export
// Query: ?type=schedule|roster|event&startDate=xxx&endDate=xxx&eventId=xxx
// Response: CSV file download
```

### Cron APIs

```typescript
// POST /api/reminders/cron
// Headers: Authorization: Bearer CRON_SECRET
// Response: { sent: number, failed: number }

// POST /api/admin-alerts/cron
// Headers: Authorization: Bearer CRON_SECRET
// Response: { alertsSent: number }
```

---

## Component Library

Create reusable components in `src/components/`:

### Layout Components

```
components/
├── layout/
│   ├── Header.tsx              # Public header with logo
│   ├── Footer.tsx              # Public footer
│   ├── AdminSidebar.tsx        # Admin navigation sidebar
│   ├── AdminHeader.tsx         # Admin top bar
│   ├── PeerHeader.tsx          # Peer minister portal header
│   └── Container.tsx           # Max-width container
```

### UI Components (shadcn/ui customized)

```
components/
├── ui/
│   ├── button.tsx
│   ├── input.tsx
│   ├── label.tsx
│   ├── card.tsx
│   ├── dialog.tsx
│   ├── dropdown-menu.tsx
│   ├── select.tsx
│   ├── checkbox.tsx
│   ├── table.tsx
│   ├── tabs.tsx
│   ├── toast.tsx
│   ├── calendar.tsx
│   ├── popover.tsx
│   ├── badge.tsx
│   ├── avatar.tsx
│   ├── skeleton.tsx
│   └── spinner.tsx
```

### Feature Components

```
components/
├── events/
│   ├── EventCard.tsx           # Event display card
│   ├── EventForm.tsx           # Create/edit event form
│   ├── EventCalendar.tsx       # Calendar view component
│   ├── SlotManager.tsx         # Add/edit slots within event
│   └── RecurrenceSelector.tsx  # Recurrence options UI
├── assignments/
│   ├── AssignmentCard.tsx      # Single assignment display
│   ├── AssignmentModal.tsx     # Assign peer minister modal
│   ├── SlotAssignmentRow.tsx   # Slot with assigned people
│   └── BulkAssignModal.tsx     # Bulk assignment interface
├── people/
│   ├── PersonCard.tsx          # Peer minister card
│   ├── PersonForm.tsx          # Add/edit person form
│   ├── PersonSearch.tsx        # Search/filter component
│   └── InviteLinkGenerator.tsx # Generate and display invite
├── files/
│   ├── FolderBrowser.tsx       # Folder tree/list view
│   ├── FileList.tsx            # Files in current folder
│   ├── FileUploader.tsx        # Drag-drop file upload
│   ├── FileIcon.tsx            # Icon based on file type
│   └── Breadcrumbs.tsx         # Folder path breadcrumbs
├── schedule/
│   ├── MonthCalendar.tsx       # Month view calendar
│   ├── WeekCalendar.tsx        # Week view calendar
│   ├── ScheduleList.tsx        # List view of assignments
│   └── PublicEventCard.tsx     # Event card for public view
└── shared/
    ├── PageHeader.tsx          # Page title + actions
    ├── EmptyState.tsx          # No data placeholder
    ├── LoadingState.tsx        # Loading skeleton
    ├── ErrorState.tsx          # Error display
    ├── ConfirmDialog.tsx       # Confirmation modal
    └── SearchInput.tsx         # Search with icon
```

---

## Third-Party Integrations

### Twilio Setup

1. Use existing parish Twilio account
2. Create a Verify Service in Twilio Console for SMS auth
3. Use Messages API for reminders

```typescript
// Required Twilio credentials:
TWILIO_ACCOUNT_SID=ACxxxxx
TWILIO_AUTH_TOKEN=xxxxx
TWILIO_PHONE_NUMBER=+1xxxxxxxxxx
TWILIO_VERIFY_SERVICE_SID=VAxxxxx
```

### Vercel Blob Setup

```typescript
// src/lib/blob.ts
import { put, del, list } from '@vercel/blob';

export async function uploadFile(file: File, folder?: string) {
  const path = folder ? `${folder}/${file.name}` : file.name;
  const blob = await put(path, file, { access: 'public' });
  return blob;
}

export async function deleteFile(url: string) {
  await del(url);
}

export async function listFiles(prefix?: string) {
  const { blobs } = await list({ prefix });
  return blobs;
}
```

### Vercel Cron Setup

```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/reminders/cron",
      "schedule": "0 23 * * *"  // 6 PM EST (23:00 UTC)
    },
    {
      "path": "/api/admin-alerts/cron",
      "schedule": "0 14 * * *"  // 9 AM EST (14:00 UTC)
    }
  ]
}
```

---

## Development Phases

### Phase 1: Project Setup & Foundation

**Tasks:**
1. Initialize Next.js 15 project with TypeScript
2. Configure Tailwind CSS with brand colors/fonts
3. Set up Drizzle ORM and connect to Neon DB
4. Create database schema and run migrations
5. Install and configure shadcn/ui components
6. Create base layout components (Header, Footer, Container)
7. Set up NextAuth for admin authentication
8. Create admin login page
9. Add the Saint Helen logo to `/public/saint-helen-logo.png`
10. Create seed script for initial super admin user

**Deliverables:**
- Working project structure
- Database connected and migrated
- Admin can log in
- Base styling in place

### Phase 2: Admin Portal - Events & Slots

**Tasks:**
1. Create admin layout with sidebar navigation
2. Build admin dashboard with overview stats
3. Create event list page with filtering
4. Build event creation form with recurrence options
5. Implement event detail page with slot management
6. Create event edit functionality
7. Implement event deletion (with cascade options)
8. Build calendar view for events

**Deliverables:**
- Full event CRUD functionality
- Slot management within events
- Recurring events working
- Calendar and list views

### Phase 3: Peer Minister Management

**Tasks:**
1. Create peer minister list page with search
2. Build add peer minister form (manual)
3. Implement invite link generation
4. Create invite acceptance flow
5. Build peer minister edit page
6. Implement deactivate/reactivate functionality
7. Add assignment history view per person

**Deliverables:**
- Full peer minister management
- Both manual add and invite link flows
- Deactivation without data loss

### Phase 4: Assignment System

**Tasks:**
1. Create assignment interface on event detail page
2. Build peer minister search/select component
3. Implement assignment creation
4. Add conflict detection and warnings
5. Build bulk assignment modal
6. Create assignment deletion
7. Add "copy schedule" functionality for recurring events

**Deliverables:**
- Admins can assign peer ministers to slots
- Conflict warnings work
- Bulk operations available

### Phase 5: Peer Minister Portal

**Tasks:**
1. Build SMS authentication flow (send code, verify)
2. Create peer minister layout
3. Build "My Schedule" page with upcoming assignments
4. Implement calendar view for peer ministers
5. Create session management (30-day persistence)
6. Add logout functionality

**Deliverables:**
- Peer ministers can log in via SMS
- See their upcoming schedules
- Session persists for 30 days

### Phase 6: File Sharing

**Tasks:**
1. Set up Vercel Blob integration
2. Create folder management UI (admin)
3. Build file upload component with drag-drop
4. Implement file browser UI
5. Create folder/file CRUD operations
6. Build peer minister file browser (read-only)
7. Add file type icons and metadata display

**Deliverables:**
- Admins can manage folders and files
- Peer ministers can browse and download
- Clean Dropbox-like UI

### Phase 7: Public Schedule & SMS Features

**Tasks:**
1. Build public schedule page (no auth required)
2. Create public event display (without assignment details)
3. Implement SMS reminder cron job
4. Create manual reminder sending
5. Build admin notification system (unfilled slots)
6. Add notification settings page
7. Create SMS logging

**Deliverables:**
- Public can view schedule
- Automated reminders work
- Admin alerts configurable

### Phase 8: Export & Polish

**Tasks:**
1. Implement CSV export functionality
2. Create export page with options
3. Add loading states throughout app
4. Implement error handling and toasts
5. Mobile responsiveness testing and fixes
6. Performance optimization
7. Accessibility review
8. Final testing

**Deliverables:**
- CSV export works
- App is polished and production-ready
- Mobile experience is smooth

---

## Environment Variables

Create `.env.local` for development:

```env
# Database (Neon)
DATABASE_URL=postgresql://user:pass@host/dbname?sslmode=require

# NextAuth
NEXTAUTH_SECRET=generate-a-random-32-char-string
NEXTAUTH_URL=http://localhost:3000

# Peer Session
PEER_SESSION_SECRET=generate-another-random-32-char-string

# Twilio
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxx
TWILIO_PHONE_NUMBER=+19085551234
TWILIO_VERIFY_SERVICE_SID=VAxxxxxxxxxxxxx

# Vercel Blob
BLOB_READ_WRITE_TOKEN=vercel_blob_xxxxx

# Cron Security
CRON_SECRET=generate-another-secret

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

For production, set these in Vercel dashboard.

---

## Deployment

### Vercel Setup

1. Connect GitHub repository to Vercel
2. Set all environment variables
3. Deploy

### Database Migration

```bash
# Generate migration
npx drizzle-kit generate:pg

# Push to database
npx drizzle-kit push:pg
```

### Post-Deployment

1. Run seed script to create super admin
2. Verify Twilio integration
3. Test cron jobs
4. Monitor for errors

---

## Progress Log Instructions

**CRITICAL: Maintain a `PROGRESS_LOG.md` file in the project root.**

### Log Structure

```markdown
# Peer Ministry Scheduler - Progress Log

## Current Status
[One-line summary of where we are]

## Completed Tasks

### Phase 1: Foundation
- [x] Task description (Date completed)
- [x] Task description (Date completed)

### Phase 2: Events
- [x] Task description (Date completed)
- [ ] Task description (In progress)

## In Progress
- [ ] Current task being worked on
  - Sub-task completed
  - Sub-task in progress

## Blocked / Issues
- Issue description and what's needed to resolve

## Next Up
1. Next task to tackle
2. Following task
3. etc.

## Notes
- Important decisions made
- Technical notes for future reference
- Things to remember

## Session Log

### [Date]
**Started:** [Time]
**Ended:** [Time]
**Worked on:**
- Bullet points of what was accomplished

**Challenges:**
- Any issues encountered

**Next session:**
- What to work on next
```

### Update Requirements

1. **Before each work session:** Read the log to understand current state
2. **During work:** Update as tasks are completed
3. **After each session:** Add session log entry
4. **When blocked:** Document the issue clearly

---

## Final Notes

### Code Quality Standards

- Use TypeScript strict mode
- Add JSDoc comments for complex functions
- Use meaningful variable/function names
- Keep components focused and small
- Extract reusable logic into hooks
- Handle loading and error states

### Testing Approach

- Test all auth flows manually
- Test on mobile device/emulator
- Test with slow network (Chrome DevTools)
- Verify all CRUD operations
- Test SMS sending with real phone

### Security Considerations

- Validate all inputs with Zod
- Check auth on every protected route
- Sanitize user-generated content
- Rate limit SMS sending
- Use HTTPS in production
- Protect cron endpoints with secret

---

**Good luck! Update the PROGRESS_LOG.md as you work, and refer back to this document whenever you need guidance on implementation details.**