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
  /**
   * The page builds itself in the browser, so the URL alone yielded nothing.
   * The UI should ask the admin to paste the details instead.
   */
  needsPastedDetails?: boolean;
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

export interface FetchedPage {
  text: string;
  /** From og:title — present even when the body renders client-side. */
  title: string;
}

/** Fetch the page and reduce it to readable text. */
export async function fetchPage(url: string): Promise<FetchedPage> {
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

  const html = await response.text();
  return { text: htmlToText(html), title: readPageTitle(html) };
}

function decodeEntities(value: string): string {
  return value
    .replace(/&nbsp;/g, ' ')
    .replace(/&#0?39;|&apos;|&rsquo;/g, "'")
    .replace(/&quot;|&ldquo;|&rdquo;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&amp;/g, '&');
}

/**
 * Pull a `<meta>` value by name or property.
 *
 * The quote character is captured and back-referenced — matching `[^"']*`
 * would stop at the apostrophe in a title like "St. Joseph's Food Truck".
 */
function readMeta(html: string, key: string): string {
  const patterns = [
    new RegExp(
      `<meta[^>]+(?:name|property)=["']${key}["'][^>]*content=(["'])([\\s\\S]*?)\\1`,
      'i'
    ),
    new RegExp(
      `<meta[^>]+content=(["'])([\\s\\S]*?)\\1[^>]*(?:name|property)=["']${key}["']`,
      'i'
    ),
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[2]) return decodeEntities(match[2]).trim();
  }
  return '';
}

/** The page title, which survives even when the body is rendered client-side. */
export function readPageTitle(html: string): string {
  const og = readMeta(html, 'og:title');
  if (og) return og;
  const title = html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]?.trim() ?? '';
  // "SignUpGenius" alone is the app shell's title, not the sign-up's.
  return /^signupgenius/i.test(title) ? '' : title;
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
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n\s*\n+/g, '\n\n')
    .trim();

  const decoded = decodeEntities(text);

  // og:* tags are server-rendered even on single-page apps, so they're often
  // the only real signal we get.
  const meta = [
    readPageTitle(html) && `TITLE: ${readPageTitle(html)}`,
    readMeta(html, 'og:description') && `SUMMARY: ${readMeta(html, 'og:description')}`,
  ]
    .filter(Boolean)
    .join('\n');

  const combined = [meta, decoded, structuredData && `STRUCTURED DATA:\n${structuredData}`]
    .filter(Boolean)
    .join('\n\n');

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
  const lines = pageText.split('\n').map((line) => line.trim());

  // htmlToText prefixes the og:title with a marker; prefer it over guessing
  // at the first short-looking line (which would otherwise be the marker).
  const marked = lines.find((line) => line.startsWith('TITLE: '));
  const title = marked
    ? marked.slice('TITLE: '.length).trim()
    : lines.find(
        (line) =>
          line.length > 3 && line.length < 90 && !line.startsWith('SUMMARY: ')
      );

  const currentYear = Number(today.slice(0, 4));
  let eventDate = '';

  // "August 15, 2026" / "August 15"
  const namedMatch = pageText.match(
    /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s+(\d{4}))?/i
  );
  if (namedMatch) {
    const monthIndex = MONTHS.indexOf(namedMatch[1].toLowerCase());
    const day = Number(namedMatch[2]);
    const year = namedMatch[3] ? Number(namedMatch[3]) : currentYear;
    if (monthIndex >= 0 && day >= 1 && day <= 31) {
      eventDate = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }

  // "08/15/2026" / "8/15/26" — how SignUpGenius prints its Date field.
  if (!eventDate) {
    const numericMatch = pageText.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})\b/);
    if (numericMatch) {
      const month = Number(numericMatch[1]);
      const day = Number(numericMatch[2]);
      const rawYear = Number(numericMatch[3]);
      const year = rawYear < 100 ? 2000 + rawYear : rawYear;
      if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
        eventDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      }
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

/**
 * Run the extraction over whatever text we managed to get hold of.
 * Shared by the URL path and the paste-the-details path.
 */
async function extractFrom(
  pageText: string,
  url: string,
  today: string,
  fallbackTitle = '',
  isPaste = false
): Promise<ExtractionResult> {
  const warnings: string[] = [];
  let extracted: ExtractedOpportunity;
  let source: ExtractionResult['source'] = 'ai';

  if (!process.env.ANTHROPIC_API_KEY) {
    extracted = extractHeuristically(pageText, today);
    source = 'heuristic';
    warnings.push(
      'Automatic detail extraction is not configured, so these fields were guessed from the text. Please review them.'
    );
  } else {
    try {
      extracted = await extractWithClaude(pageText, url, today);
    } catch (error) {
      console.error('SignUpGenius AI extraction failed:', error);
      extracted = extractHeuristically(pageText, today);
      source = 'heuristic';
      warnings.push(
        "Couldn't read the details automatically, so these fields were guessed. Please review them."
      );
    }
  }

  if (!extracted.title && fallbackTitle) {
    extracted = { ...extracted, title: fallbackTitle };
  }

  // SignUpGenius renders its sign-up pages in the browser, so a fetch only
  // sees the summary tags. When those don't carry a date or time, the reliable
  // move is to let the admin paste the page rather than guess.
  const needsPastedDetails = !extracted.eventDate || !extracted.startTime;
  if (needsPastedDetails && !isPaste) {
    warnings.push(
      "Some details weren't in the page's summary — paste the sign-up text below, or fill them in by hand."
    );
  } else {
    if (!extracted.eventDate) {
      warnings.push('No date was found — please enter one.');
    }
    if (!extracted.startTime) {
      warnings.push('No start time was found — please enter one.');
    }
  }
  if (extracted.additionalDates.length > 0) {
    warnings.push(
      `This sign-up also covers ${extracted.additionalDates.join(', ')}. Only the first date is filled in — create additional events or set a recurrence if you need the rest.`
    );
  }

  return { ...extracted, source, warnings, needsPastedDetails };
}

/**
 * Import from a URL.
 *
 * SignUpGenius renders its sign-up pages in the browser, so a plain fetch sees
 * only the og:title and og:description tags. Those usually carry the title and
 * the descriptive text (often including the date and time in prose), which is
 * enough. When it isn't, the result asks the caller to collect a paste.
 */
export async function importFromSignUpGenius(
  url: string,
  today: string
): Promise<ExtractionResult> {
  const page = await fetchPage(url);
  return extractFrom(page.text, url, today, page.title);
}

/** Import from text the admin copied off the sign-up page. */
export async function importFromPastedText(
  pastedText: string,
  url: string,
  today: string
): Promise<ExtractionResult> {
  return extractFrom(pastedText, url, today, '', true);
}
