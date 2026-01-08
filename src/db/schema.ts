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
  reminderSent: boolean('reminder_sent').notNull().default(false),
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
  unfilledSlotsAlert: boolean('unfilled_slots_alert').notNull().default(true),
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
  parentEvent: one(events, { fields: [events.parentEventId], references: [events.id], relationName: 'eventRecurrence' }),
  childEvents: many(events, { relationName: 'eventRecurrence' }),
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
  parent: one(folders, { fields: [folders.parentId], references: [folders.id], relationName: 'folderHierarchy' }),
  children: many(folders, { relationName: 'folderHierarchy' }),
  files: many(files),
  creator: one(users, { fields: [folders.createdBy], references: [users.id] }),
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
export type SmsLog = typeof smsLog.$inferSelect;
export type NewSmsLog = typeof smsLog.$inferInsert;
