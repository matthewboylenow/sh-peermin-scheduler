import { pgTable, uuid, text, timestamp, boolean, integer, date, time, pgEnum, type AnyPgColumn } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const userRoleEnum = pgEnum('user_role', ['super_admin', 'admin', 'peer_minister']);
export const eventTypeEnum = pgEnum('event_type', ['mass', 'clow', 'volunteer', 'ministry', 'other']);
export const recurrenceTypeEnum = pgEnum('recurrence_type', ['none', 'daily', 'weekly', 'biweekly', 'monthly']);

// Users Table
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  phone: text('phone').unique(), // Optional for admins who use email/password
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
  // Volunteer sign-up (e.g. a SignUpGenius page). When present, the event is
  // surfaced to peer ministers as a self-serve volunteer opportunity.
  signupUrl: text('signup_url'),
  signupSource: text('signup_source'), // 'signupgenius' | 'manual' | null
  // Recurrence fields
  recurrenceType: recurrenceTypeEnum('recurrence_type').notNull().default('none'),
  recurrenceEndDate: date('recurrence_end_date'), // When recurrence stops
  parentEventId: uuid('parent_event_id').references((): AnyPgColumn => events.id), // Links recurring instances to parent
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
  remindersSent: text('reminders_sent').notNull().default('[]'), // JSON array of reminder days sent, e.g., "[1, 3]"
  notes: text('notes'),
  createdBy: uuid('created_by').references(() => users.id).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Folders Table (for file organization)
export const folders = pgTable('folders', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  parentId: uuid('parent_id').references((): AnyPgColumn => folders.id, { onDelete: 'cascade' }),
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
  // Pinned to the top of the peer minister dashboard — used for the parish
  // calendar, which people look at far more often than they browse folders.
  isFeatured: boolean('is_featured').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Folders for grouping sign-up links, named by whoever runs the ministry.
//
// Deliberately free-form rather than a fixed list of categories: "Mass
// Ministries" and "MS Large Group & EDGE" are the groupings that made sense to
// the youth minister, and the next person to hold the job will want different
// ones. Renaming a folder should not require a deploy.
export const signupFolders = pgTable('signup_folders', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Standing sign-up links (SignUpGenius and friends).
//
// Deliberately dateless: a sign-up like "MS Small/Large Group Session" covers
// six dates across two months with different times, and the provider's page
// already owns that detail. Modelling each date here would duplicate it and
// let the two drift apart, so we store what the sign-up *is* and link out.
export const signups = pgTable('signups', {
  id: uuid('id').defaultRandom().primaryKey(),
  title: text('title').notNull(),
  description: text('description'),
  url: text('url').notNull(),
  // Null means the sign-up sits loose at the top level rather than inside a
  // folder — deleting a folder leaves its sign-ups there rather than with them.
  folderId: uuid('folder_id').references(() => signupFolders.id, {
    onDelete: 'set null',
  }),
  // Free text, e.g. "Sept 9, 16, 23 and Nov 4, 11, 18" — a human hint, not
  // something the app parses or schedules against.
  scheduleNote: text('schedule_note'),
  sortOrder: integer('sort_order').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
  createdBy: uuid('created_by').references(() => users.id).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// App-wide preferences that are not per-admin. Singleton: one row, read by
// everyone, written only by a super admin.
export const appSettings = pgTable('app_settings', {
  id: uuid('id').defaultRandom().primaryKey(),
  // 'folders' | 'list' — how the peer minister sign-ups page is laid out.
  signupsLayout: text('signups_layout').notNull().default('folders'),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  updatedBy: uuid('updated_by').references(() => users.id),
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
  unfilledSlotsAlert: boolean('unfilled_slots_alert').notNull().default(true),
  alertDaysBefore: integer('alert_days_before').notNull().default(2), // Days before event to alert
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Global SMS Settings (singleton - one row for entire app)
export const smsSettings = pgTable('sms_settings', {
  id: uuid('id').defaultRandom().primaryKey(),
  reminderDays: text('reminder_days').notNull().default('[1]'), // JSON array of days before event to send reminders
  messageTemplate: text('message_template').notNull().default(
    'Hi {name}! Reminder: You\'re scheduled for "{role}" at {event} on {date} at {time} at {location}. Thank you for serving! - Saint Helen Parish'
  ),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  updatedBy: uuid('updated_by').references(() => users.id),
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
  assignments: many(assignments, { relationName: 'assignedUser' }),
  createdAssignments: many(assignments, { relationName: 'assignmentCreator' }),
  createdEvents: many(events),
  uploadedFiles: many(files),
  adminSettings: one(adminSettings),
}));

export const eventsRelations = relations(events, ({ one, many }) => ({
  creator: one(users, { fields: [events.createdBy], references: [users.id] }),
  slots: many(slots),
  parentEvent: one(events, { fields: [events.parentEventId], references: [events.id], relationName: 'eventRecurrence' }),
  childEvents: many(events, { relationName: 'eventRecurrence' }),
}));

export const slotsRelations = relations(slots, ({ one, many }) => ({
  event: one(events, { fields: [slots.eventId], references: [events.id] }),
  assignments: many(assignments),
}));

export const assignmentsRelations = relations(assignments, ({ one }) => ({
  slot: one(slots, { fields: [assignments.slotId], references: [slots.id] }),
  user: one(users, { fields: [assignments.userId], references: [users.id], relationName: 'assignedUser' }),
  createdByUser: one(users, { fields: [assignments.createdBy], references: [users.id], relationName: 'assignmentCreator' }),
}));

export const foldersRelations = relations(folders, ({ one, many }) => ({
  parent: one(folders, { fields: [folders.parentId], references: [folders.id], relationName: 'folderHierarchy' }),
  children: many(folders, { relationName: 'folderHierarchy' }),
  files: many(files),
  creator: one(users, { fields: [folders.createdBy], references: [users.id] }),
}));

export const signupsRelations = relations(signups, ({ one }) => ({
  creator: one(users, { fields: [signups.createdBy], references: [users.id] }),
  folder: one(signupFolders, {
    fields: [signups.folderId],
    references: [signupFolders.id],
  }),
}));

export const signupFoldersRelations = relations(signupFolders, ({ many }) => ({
  signups: many(signups),
}));

export const filesRelations = relations(files, ({ one }) => ({
  folder: one(folders, { fields: [files.folderId], references: [folders.id] }),
  uploader: one(users, { fields: [files.uploadedBy], references: [users.id] }),
}));

export const adminSettingsRelations = relations(adminSettings, ({ one }) => ({
  user: one(users, { fields: [adminSettings.userId], references: [users.id] }),
}));

// Type exports
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Event = typeof events.$inferSelect;
export type NewEvent = typeof events.$inferInsert;
export type Slot = typeof slots.$inferSelect;
export type NewSlot = typeof slots.$inferInsert;
export type Assignment = typeof assignments.$inferSelect;
export type NewAssignment = typeof assignments.$inferInsert;
export type Folder = typeof folders.$inferSelect;
export type NewFolder = typeof folders.$inferInsert;
export type File = typeof files.$inferSelect;
export type NewFile = typeof files.$inferInsert;
export type VerificationCode = typeof verificationCodes.$inferSelect;
export type NewVerificationCode = typeof verificationCodes.$inferInsert;
export type AdminSettings = typeof adminSettings.$inferSelect;
export type NewAdminSettings = typeof adminSettings.$inferInsert;
export type SmsSettings = typeof smsSettings.$inferSelect;
export type NewSmsSettings = typeof smsSettings.$inferInsert;
export type SmsLog = typeof smsLog.$inferSelect;
export type NewSmsLog = typeof smsLog.$inferInsert;
export type Signup = typeof signups.$inferSelect;
export type NewSignup = typeof signups.$inferInsert;
export type SignupFolder = typeof signupFolders.$inferSelect;
export type NewSignupFolder = typeof signupFolders.$inferInsert;
export type AppSettings = typeof appSettings.$inferSelect;
