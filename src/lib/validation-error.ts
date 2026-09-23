import { NextResponse } from 'next/server';
import { z } from 'zod';

/**
 * A 400 the person on the other end can act on.
 *
 * These responses used to say only "Validation error". That is all an admin
 * ever saw — no field, no reason, nothing to try differently — and the one
 * time it fired in anger the report that came back was a photograph of the
 * screen. Zod already knows which field and why, so say it.
 *
 * `details` keeps the raw issues, unchanged, for anything reading them.
 */
export function validationError(error: z.ZodError) {
  const message = error.issues.map(describe).join('; ');

  return NextResponse.json(
    { error: message || 'Validation error', details: error.issues },
    { status: 400 }
  );
}

function describe(issue: z.core.$ZodIssue): string {
  const field = fieldLabel(issue.path);
  return field ? `${field}: ${issue.message}` : issue.message;
}

/** `additionalDates.0.startTime` reads as `Additional Dates → Start Time`. */
function fieldLabel(path: ReadonlyArray<PropertyKey>): string {
  return path
    .filter((part) => typeof part === 'string')
    .map((part) =>
      (part as string)
        // camelCase to words, then capitalise each one.
        .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
        .replace(/^./, (c) => c.toUpperCase())
    )
    .join(' → ');
}
