import Anthropic from '@anthropic-ai/sdk';

/**
 * Pulls the useful bits out of a SignUpGenius page so an admin can turn a
 * pasted link into a volunteer opportunity without retyping anything.
 *
 * The page is fetched server-side, reduced to plain text, and handed to Claude
 * with a strict output schema. If no API key is configured (or the model call
 * fails) we fall back to regex heuristics — the admin still gets a partly
 * filled form rather than a dead end.
 */

export interface ExtractedOpportunity {
  title: string;
  description: string;
  /** `yyyy-MM-dd`, or "" when the page doesn't state one. */
  eventDate: string;
  /** 24-hour `HH:MM`, or "". The form converts these for display. */
  startTime: string;
  endTime: string;
  location: string;
  /** Further dates covered by the same sign-up, if it spans several. */
  additionalDates: string[];
}

export interface ExtractionResult extends ExtractedOpportunity {
  /** How the fields were derived, so the UI can set expectations. */
  source: 'ai' | 'heuristic';
  warnings: string[];
}

const EMPTY: ExtractedOpportunity = {
  title: '',
  description: '',
  eventDate: '',
  startTime: '',
  endTime: '',
  location: '',
  additionalDates: [],
};

export function isSignUpGeniusUrl(rawUrl: string): boolean {
  try {
    const { hostname, protocol } = new URL(rawUrl);
    if (protocol !== 'https:' && protocol !== 'http:') return false;
    return (
      hostname === 'signupgenius.com' || hostname.endsWith('.signupgenius.com')
    );
  } catch {
    return false;
  }
}

/** Fetch the page and reduce it to readable text. */
export async function fetchPageText(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      // SignUpGenius serves a stripped page to unrecognised clients.
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml',
    },
    signal: AbortSignal.timeout(20_000),
    redirect: 'follow',
  });

  if (!response.ok) {
    throw new Error(`SignUpGenius returned ${response.status}`);
  }

  return htmlToText(await response.text());
}

export function htmlToText(html: string): string {
  // Keep structured-data blocks — they often carry the date/time cleanly —
  // and drop everything else that isn't visible copy.
  const structuredData = [
    ...html.matchAll(
      /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
    ),
  ]
    .map((match) => match[1].trim())
    .join('\n');

  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<(br|\/p|\/div|\/li|\/tr|\/h[1-6])[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n\s*\n+/g, '\n\n')
    .trim();

  const combined = structuredData
    ? `${text}\n\nSTRUCTURED DATA:\n${structuredData}`
    : text;

  // Plenty of context for the model without paying for boilerplate.
  return combined.slice(0, 24_000);
}

const OPPORTUNITY_SCHEMA = {
  type: 'object',
  properties: {
    title: {
      type: 'string',
      description:
        'Short name for the volunteer opportunity, e.g. "Parish Food Pantry Sorting". Empty string if unknown.',
    },
    description: {
      type: 'string',
      description:
        'One or two plain sentences describing what volunteers will do. Empty string if unknown.',
    },
    eventDate: {
      type: 'string',
      description:
        'The earliest date volunteers are needed, formatted yyyy-MM-dd. Empty string if the page states no date.',
    },
    startTime: {
      type: 'string',
      description:
        'Start time in 24-hour HH:MM format. Empty string if the page states no time.',
    },
    endTime: {
      type: 'string',
      description:
        'End time in 24-hour HH:MM format. Empty string if there is no end time.',
    },
    location: {
      type: 'string',
      description: 'Where volunteers should go. Empty string if unknown.',
    },
    additionalDates: {
      type: 'array',
      description:
        'Any further dates the same sign-up covers, formatted yyyy-MM-dd, excluding eventDate. Empty array if there are none.',
      items: { type: 'string' },
    },
  },
  required: [
    'title',
    'description',
    'eventDate',
    'startTime',
    'endTime',
    'location',
    'additionalDates',
  ],
  additionalProperties: false,
} as const;

const SYSTEM_PROMPT = `You extract volunteer opportunity details from the text of a SignUpGenius sign-up page for a Catholic parish peer ministry program.

Rules:
- Only report what the page actually says. Never invent a date, time, or location.
- If a field is not stated on the page, return an empty string (or an empty array for additionalDates).
- Dates must be yyyy-MM-dd and times must be 24-hour HH:MM.
- If the sign-up covers several dates, put the earliest in eventDate and the rest in additionalDates.
- Keep the description to one or two sentences a teenager can skim.
- Ignore navigation text, cookie banners, marketing copy, and the SignUpGenius product itself.`;

/** Ask Claude to pull structured fields out of the page text. */
export async function extractWithClaude(
  pageText: string,
  url: string,
  today: string
): Promise<ExtractedOpportunity> {
  const client = new Anthropic();

  const response = await client.messages.create({
    model: 'claude-opus-5',
    // Headroom for thinking plus the JSON payload — thinking is on by default.
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    output_config: {
      effort: 'low',
      format: { type: 'json_schema', schema: OPPORTUNITY_SCHEMA },
    },
    messages: [
      {
        role: 'user',
        content: `Today's date is ${today} (America/New_York). Extract the volunteer opportunity details from this SignUpGenius page.

URL: ${url}

PAGE TEXT:
${pageText}`,
      },
    ],
  });

  const textBlock = response.content.find((block) => block.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('Model returned no content');
  }

  return normalize(JSON.parse(textBlock.text));
}

/**
 * Best-effort parse used when the model is unavailable. Catches the common
 * "Saturday, March 14, 2026" / "9:00am - 12:00pm" shapes.
 */
export function extractHeuristically(
  pageText: string,
  today: string
): ExtractedOpportunity {
  const title = pageText.split('\n').map((line) => line.trim()).find(
    (line) => line.length > 3 && line.length < 90
  );

  const currentYear = Number(today.slice(0, 4));
  const dateMatch = pageText.match(
    /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s+(\d{4}))?/i
  );

  let eventDate = '';
  if (dateMatch) {
    const monthIndex = MONTHS.indexOf(dateMatch[1].toLowerCase());
    const day = Number(dateMatch[2]);
    const year = dateMatch[3] ? Number(dateMatch[3]) : currentYear;
    if (monthIndex >= 0 && day >= 1 && day <= 31) {
      eventDate = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }

  const timeMatches = [
    ...pageText.matchAll(/\b(\d{1,2})(?::(\d{2}))?\s*([ap])\.?m\.?/gi),
  ];
  const times = timeMatches.slice(0, 2).map((match) => {
    let hours = Number(match[1]) % 12;
    if (match[3].toLowerCase() === 'p') hours += 12;
    return `${String(hours).padStart(2, '0')}:${match[2] ?? '00'}`;
  });

  return {
    ...EMPTY,
    title: title ?? '',
    eventDate,
    startTime: times[0] ?? '',
    endTime: times[1] ?? '',
  };
}

const MONTHS = [
  'january',
  'february',
  'march',
  'april',
  'may',
  'june',
  'july',
  'august',
  'september',
  'october',
  'november',
  'december',
];

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^\d{2}:\d{2}$/;

/** Discard anything the model returned in an unexpected shape. */
function normalize(raw: unknown): ExtractedOpportunity {
  const value = (raw ?? {}) as Record<string, unknown>;
  const str = (key: string) =>
    typeof value[key] === 'string' ? (value[key] as string).trim() : '';

  const eventDate = str('eventDate');
  const startTime = str('startTime');
  const endTime = str('endTime');
  const additionalDates = Array.isArray(value.additionalDates)
    ? (value.additionalDates as unknown[])
        .filter((date): date is string => typeof date === 'string')
        .map((date) => date.trim())
        .filter((date) => DATE_PATTERN.test(date))
    : [];

  return {
    title: str('title').slice(0, 200),
    description: str('description').slice(0, 1000),
    eventDate: DATE_PATTERN.test(eventDate) ? eventDate : '',
    startTime: TIME_PATTERN.test(startTime) ? startTime : '',
    endTime: TIME_PATTERN.test(endTime) ? endTime : '',
    location: str('location').slice(0, 200),
    additionalDates,
  };
}

/** Everything glued together, with warnings the admin should see. */
export async function importFromSignUpGenius(
  url: string,
  today: string
): Promise<ExtractionResult> {
  const pageText = await fetchPageText(url);
  const warnings: string[] = [];

  if (pageText.length < 200) {
    warnings.push(
      "This sign-up page returned very little text — it may be private or require a login. Double-check the details below."
    );
  }

  let extracted: ExtractedOpportunity;
  let source: ExtractionResult['source'] = 'ai';

  if (!process.env.ANTHROPIC_API_KEY) {
    extracted = extractHeuristically(pageText, today);
    source = 'heuristic';
    warnings.push(
      'Automatic detail extraction is not configured, so these fields were guessed from the page text. Please review them.'
    );
  } else {
    try {
      extracted = await extractWithClaude(pageText, url, today);
    } catch (error) {
      console.error('SignUpGenius AI extraction failed:', error);
      extracted = extractHeuristically(pageText, today);
      source = 'heuristic';
      warnings.push(
        "Couldn't read the page automatically, so these fields were guessed. Please review them."
      );
    }
  }

  if (!extracted.eventDate) {
    warnings.push('No date was found on the page — please enter one.');
  }
  if (!extracted.startTime) {
    warnings.push('No start time was found on the page — please enter one.');
  }
  if (extracted.additionalDates.length > 0) {
    warnings.push(
      `This sign-up also covers ${extracted.additionalDates.join(', ')}. Only the first date is filled in — create additional events or set a recurrence if you need the rest.`
    );
  }

  return { ...extracted, source, warnings };
}
