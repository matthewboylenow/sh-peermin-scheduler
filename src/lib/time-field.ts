import { z } from 'zod';

/**
 * Time-of-day field for event payloads.
 *
 * Postgres `time` columns come back as `HH:MM:SS`, so an event fetched from
 * the API and saved again round-trips the seconds. A pattern that only
 * accepted `HH:MM` rejected that, which made editing any existing event fail
 * validation — open it, change the title, save, and the request was refused
 * over a time field nobody had touched.
 *
 * Accept either shape and store `HH:MM`, matching what the form produces.
 */
export const timeField = z
  .string()
  .regex(/^\d{2}:\d{2}(:\d{2})?$/, 'Invalid time format')
  .transform((value) => value.slice(0, 5));
