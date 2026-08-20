/**
 * The kinds of event, their labels, and the colour each one wears.
 *
 * Single source of truth. These used to be redeclared in six components, so a
 * new kind meant finding all six and one of them silently kept the old list.
 *
 * Order here is the order they appear in pickers and the calendar legend.
 */
export const EVENT_TYPES = [
  { value: 'mass', label: 'Mass', badge: 'bg-navy text-white', dot: 'bg-navy' },
  { value: 'clow', label: 'CLOW', badge: 'bg-rust text-white', dot: 'bg-rust' },
  {
    value: 'adoration',
    label: 'Adoration',
    // Pink, chosen so it stops blending into the blues around it.
    badge: 'bg-pink-500 text-white',
    dot: 'bg-pink-500',
  },
  {
    value: 'service',
    label: 'Service',
    // Dark orange, for service opportunities.
    badge: 'bg-amber-700 text-white',
    dot: 'bg-amber-700',
  },
  {
    value: 'volunteer',
    label: 'Volunteer',
    badge: 'bg-success text-white',
    dot: 'bg-success',
  },
  {
    value: 'ministry',
    label: 'Ministry',
    badge: 'bg-info text-white',
    dot: 'bg-info',
  },
  {
    value: 'other',
    label: 'Other',
    badge: 'bg-gray-500 text-white',
    dot: 'bg-gray-500',
  },
] as const;

export type EventType = (typeof EVENT_TYPES)[number]['value'];

export const EVENT_TYPE_VALUES = EVENT_TYPES.map((t) => t.value) as [
  EventType,
  ...EventType[],
];

const byValue = new Map(EVENT_TYPES.map((t) => [t.value as string, t]));

/** Label for a stored type, falling back to the raw value rather than blank. */
export function eventTypeLabel(value: string): string {
  return byValue.get(value)?.label ?? value;
}

/** Badge classes (background + text) for a stored type. */
export function eventTypeBadge(value: string): string {
  return byValue.get(value)?.badge ?? 'bg-gray-500 text-white';
}

/** Background class for a small dot or bar. */
export function eventTypeDot(value: string): string {
  return byValue.get(value)?.dot ?? 'bg-gray-500';
}
