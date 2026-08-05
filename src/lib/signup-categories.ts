/**
 * Groupings for the standing sign-up links.
 *
 * Kept as plain strings rather than a Postgres enum so a new ministry can be
 * added here without a schema migration.
 */

export const SIGNUP_CATEGORIES = [
  {
    value: 'peer_ministry',
    label: 'Peer Ministry',
    hint: 'Small and large group sessions, retreats, service',
  },
  {
    value: 'hospitality',
    label: 'Hospitality',
    hint: 'Greeting and welcoming at Mass',
  },
  {
    value: 'parish',
    label: 'Parish Ministries',
    hint: 'Lector, media, Eucharistic Minister',
  },
  {
    value: 'other',
    label: 'Other',
    hint: 'Anything that does not fit above',
  },
] as const;

export type SignupCategory = (typeof SIGNUP_CATEGORIES)[number]['value'];

export const SIGNUP_CATEGORY_VALUES = SIGNUP_CATEGORIES.map(
  (category) => category.value
) as [SignupCategory, ...SignupCategory[]];

export function categoryLabel(value: string): string {
  return (
    SIGNUP_CATEGORIES.find((category) => category.value === value)?.label ??
    'Other'
  );
}

/** Category order for display, so groups always appear in the same sequence. */
export function categoryRank(value: string): number {
  const index = SIGNUP_CATEGORIES.findIndex(
    (category) => category.value === value
  );
  return index === -1 ? SIGNUP_CATEGORIES.length : index;
}
