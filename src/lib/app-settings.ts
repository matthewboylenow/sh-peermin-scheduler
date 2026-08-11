import { db } from '@/db';
import { appSettings } from '@/db/schema';
import { asc } from 'drizzle-orm';

/**
 * App-wide preferences, stored as a single row.
 *
 * Only the sign-ups layout lives here today. It exists because the folder view
 * is a judgement call about what the teens find easiest, not a fact — so a
 * super admin can put it back to the flat list without a deploy if the folders
 * turn out to be more clicks than they are worth.
 */

export const SIGNUPS_LAYOUTS = ['folders', 'list'] as const;
export type SignupsLayout = (typeof SIGNUPS_LAYOUTS)[number];

export const DEFAULT_SIGNUPS_LAYOUT: SignupsLayout = 'folders';

export function isSignupsLayout(value: unknown): value is SignupsLayout {
  return SIGNUPS_LAYOUTS.includes(value as SignupsLayout);
}

/**
 * Fixed id for the one settings row.
 *
 * The row is created lazily on first read, so a cold deploy can have several
 * requests racing to create it. Inserting a known id instead of a random one
 * turns that race into a primary key conflict the database resolves for us:
 * one insert wins, the rest do nothing, and there is exactly one row.
 */
const SINGLETON_ID = '00000000-0000-4000-8000-0000000000a5';

/**
 * Read the settings row, creating it on first use so the rest of the app never
 * has to deal with "no row yet".
 *
 * Ordered by id rather than left to the planner. There should only ever be one
 * row, but if an older deploy left a stray one behind, a stable ordering means
 * reads and writes still agree on which is authoritative — otherwise the
 * toggle could appear not to stick.
 */
export async function getAppSettings() {
  const existing = await db.query.appSettings.findFirst({
    orderBy: [asc(appSettings.id)],
  });
  if (existing) return existing;

  await db
    .insert(appSettings)
    .values({ id: SINGLETON_ID })
    .onConflictDoNothing();

  // Re-read rather than trusting the insert: if another request won the race,
  // ours did nothing and this returns theirs.
  const created = await db.query.appSettings.findFirst({
    orderBy: [asc(appSettings.id)],
  });
  if (!created) {
    throw new Error('Could not create the app settings row');
  }
  return created;
}

/** The configured layout, falling back to the default if the row is odd. */
export async function getSignupsLayout(): Promise<SignupsLayout> {
  try {
    const settings = await getAppSettings();
    return isSignupsLayout(settings?.signupsLayout)
      ? settings.signupsLayout
      : DEFAULT_SIGNUPS_LAYOUT;
  } catch (error) {
    // A missing table on a half-migrated deploy shouldn't take the page down.
    console.error('Error reading app settings:', error);
    return DEFAULT_SIGNUPS_LAYOUT;
  }
}
