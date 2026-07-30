/**
 * Centralized date/time formatting.
 *
 * The parish runs on Eastern Time and everything the user sees is 12-hour
 * AM/PM. Never render a raw `startTime` / `createdAt` value in the UI --
 * route it through one of these helpers instead.
 */

export const TIME_ZONE = "America/New_York";

/**
 * "14:30" or "14:30:00" -> "2:30 PM". Returns "" for empty input so callers
 * can safely interpolate.
 */
export function formatTime(time?: string | null): string {
  if (!time) return "";
  const [rawHours, rawMinutes] = time.split(":");
  const hours = Number(rawHours);
  const minutes = Number(rawMinutes ?? 0);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return time;

  const period = hours >= 12 ? "PM" : "AM";
  const hour12 = hours % 12 || 12;
  return `${hour12}:${minutes.toString().padStart(2, "0")} ${period}`;
}

/** "9:00 AM – 10:30 AM", or just "9:00 AM" when there is no end time. */
export function formatTimeRange(
  start?: string | null,
  end?: string | null
): string {
  const startLabel = formatTime(start);
  const endLabel = formatTime(end);
  if (!startLabel) return "";
  return endLabel ? `${startLabel} – ${endLabel}` : startLabel;
}

/**
 * Parse a `yyyy-MM-dd` column value as a local calendar date. Using `new
 * Date("2026-07-30")` would parse as UTC midnight and render as the previous
 * day west of Greenwich.
 */
export function parseDateOnly(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, (month ?? 1) - 1, day ?? 1);
}

const DATE_STYLES = {
  short: { month: "short", day: "numeric" },
  medium: { month: "short", day: "numeric", year: "numeric" },
  long: { weekday: "long", month: "long", day: "numeric", year: "numeric" },
  weekday: { weekday: "long", month: "short", day: "numeric" },
} satisfies Record<string, Intl.DateTimeFormatOptions>;

export type DateStyle = keyof typeof DATE_STYLES;

/** Format a `yyyy-MM-dd` event date, e.g. "Thursday, Jul 30". */
export function formatEventDate(
  dateStr: string,
  style: DateStyle = "medium"
): string {
  return new Intl.DateTimeFormat("en-US", DATE_STYLES[style]).format(
    parseDateOnly(dateStr)
  );
}

/** Individual pieces of a `yyyy-MM-dd` date, for calendar-style date badges. */
export function eventDateParts(dateStr: string): {
  month: string;
  day: string;
  weekday: string;
} {
  const date = parseDateOnly(dateStr);
  const part = (options: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat("en-US", options).format(date);

  return {
    month: part({ month: "short" }),
    day: part({ day: "numeric" }),
    weekday: part({ weekday: "short" }),
  };
}

/** Format an event's date and time together, e.g. "Jul 30 at 9:00 AM". */
export function formatEventDateTime(
  dateStr: string,
  startTime?: string | null,
  style: DateStyle = "medium"
): string {
  const date = formatEventDate(dateStr, style);
  const time = formatTime(startTime);
  return time ? `${date} at ${time}` : date;
}

/**
 * Format a stored timestamp (ISO string or Date) in Eastern Time.
 * Timestamps come back from the API as UTC ISO strings.
 */
export function formatTimestamp(
  value: string | Date,
  style: DateStyle = "medium"
): string {
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", {
    ...DATE_STYLES[style],
    timeZone: TIME_ZONE,
  }).format(date);
}

/** Format a stored timestamp with its time, e.g. "Jul 30, 2026, 2:15 PM". */
export function formatTimestampWithTime(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: TIME_ZONE,
  }).format(date);
}

/**
 * Today's date as `yyyy-MM-dd` in Eastern Time. Comparing event dates against
 * `new Date().toISOString()` would roll over to tomorrow at 8 PM ET.
 */
export function todayInEastern(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  return parts; // en-CA yields yyyy-MM-dd
}

/** Add whole days to a `yyyy-MM-dd` string, returning `yyyy-MM-dd`. */
export function addDaysToDateOnly(dateStr: string, days: number): string {
  const date = parseDateOnly(dateStr);
  date.setDate(date.getDate() + days);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** "Today" / "Tomorrow" / "Thursday, Jul 30" for an event date. */
export function relativeEventDate(dateStr: string): string {
  const today = todayInEastern();
  if (dateStr === today) return "Today";
  if (dateStr === addDaysToDateOnly(today, 1)) return "Tomorrow";
  if (dateStr === addDaysToDateOnly(today, -1)) return "Yesterday";
  return formatEventDate(dateStr, "weekday");
}
