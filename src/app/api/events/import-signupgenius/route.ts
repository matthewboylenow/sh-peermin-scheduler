import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';
import { importFromSignUpGenius, isSignUpGeniusUrl } from '@/lib/signupgenius';
import { todayInEastern } from '@/lib/datetime';

// Fetching the page and running the extraction can take a few seconds.
export const maxDuration = 60;

const importSchema = z.object({
  url: z.string().url('Enter a valid URL'),
});

/**
 * POST /api/events/import-signupgenius
 *
 * Takes a SignUpGenius link and returns pre-filled event fields for the
 * "Create Event" form. Nothing is written to the database here — the admin
 * still reviews and submits the form.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { url } = importSchema.parse(body);

    if (!isSignUpGeniusUrl(url)) {
      return NextResponse.json(
        { error: 'That does not look like a SignUpGenius link.' },
        { status: 400 }
      );
    }

    const result = await importFromSignUpGenius(url, todayInEastern());

    return NextResponse.json({ ...result, signupUrl: url });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? 'Invalid request' },
        { status: 400 }
      );
    }

    console.error('Error importing SignUpGenius page:', error);
    return NextResponse.json(
      {
        error:
          "Couldn't read that sign-up page. Check the link is public, or enter the details manually.",
      },
      { status: 502 }
    );
  }
}
