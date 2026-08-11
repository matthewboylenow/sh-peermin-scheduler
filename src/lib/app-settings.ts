import { db } from '@/db';
import { appSettings } from '@/db/schema';

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
 * Read the settings row, creating it on first use so the rest of the app never
 * has to deal with "no row yet".
 */
export async function getAppSettings() {
  const existing = await db.query.appSettings.findFirst();
  if (existing) return existing;

  const [created] = await db.insert(appSettings).values({}).returning();
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
