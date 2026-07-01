import { createHash } from 'node:crypto';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { insertSiteEvent } from '@/lib/db';

const MAX_BODY_BYTES = 32 * 1024;

const allowedEventNames = new Set([
  'vinpop_quiz_started',
  'vinpop_quiz_completed',
  'vinpop_email_submitted',
  'vinpop_taste_kit_viewed',
  'vinpop_taste_kit_added_to_cart',
  'vinpop_wine_rated_love',
  'vinpop_wine_rated_like',
  'vinpop_wine_rated_dislike',
  'vinpop_smart_box_viewed',
  'vinpop_smart_box_purchased',
]);

const exactAllowedOrigins = new Set([
  'https://www.vinpop.nl',
  'https://vinpop.nl',
  'https://ivmtpi-7a.myshopify.com',
]);

const allowedHeaders = {
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Max-Age': '86400',
  Vary: 'Origin',
};

function getCorsHeaders(origin: string | null): Headers {
  const headers = new Headers(allowedHeaders);

  if (origin && isAllowedOrigin(origin)) {
    headers.set('Access-Control-Allow-Origin', origin);
  }

  return headers;
}

function isAllowedOrigin(origin: string): boolean {
  return exactAllowedOrigins.has(origin);
}

function readOptionalString(source: Record<string, unknown>, key: string, maxLength = 1024): string | null {
  const value = source[key];
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  return trimmed.slice(0, maxLength);
}

function getNestedPayload(source: Record<string, unknown>): Record<string, unknown> | null {
  const payload = source.payload;

  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return null;
  }

  return payload as Record<string, unknown>;
}

function readOptionalStringWithPayloadFallback(
  source: Record<string, unknown>,
  key: string,
  maxLength = 1024,
): string | null {
  const direct = readOptionalString(source, key, maxLength);
  if (direct) {
    return direct;
  }

  const nestedPayload = getNestedPayload(source);
  if (!nestedPayload) {
    return null;
  }

  return readOptionalString(nestedPayload, key, maxLength);
}

function normalizeEventTime(rawValue: unknown): string {
  if (typeof rawValue === 'string' || typeof rawValue === 'number') {
    const parsed = new Date(rawValue);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
  }

  return new Date().toISOString();
}

function hashEmail(email: string): string {
  return createHash('sha256').update(email).digest('hex');
}

function isSensitivePayloadKey(key: string): boolean {
  return /(^|_|-)(email|phone|address|street|postal|zip)(_|-|$)/i.test(key);
}

function sanitizePayloadValue(value: unknown, depth = 0): unknown {
  if (depth > 6) {
    return '[max-depth]';
  }

  if (Array.isArray(value)) {
    return value.slice(0, 100).map((entry) => sanitizePayloadValue(entry, depth + 1));
  }

  if (typeof value === 'object' && value !== null) {
    const objectValue = value as Record<string, unknown>;
    const result: Record<string, unknown> = {};

    for (const [key, entry] of Object.entries(objectValue)) {
      if (isSensitivePayloadKey(key)) {
        continue;
      }

      result[key] = sanitizePayloadValue(entry, depth + 1);
    }

    return result;
  }

  if (typeof value === 'string') {
    return value.length > 4000 ? value.slice(0, 4000) : value;
  }

  if (typeof value === 'number' || typeof value === 'boolean' || value === null) {
    return value;
  }

  return String(value);
}

function getExtraPayload(body: Record<string, unknown>): Record<string, unknown> | null {
  const reservedKeys = new Set([
    'event_name',
    'event_time',
    'visitor_id',
    'session_id',
    'customer_id',
    'email',
    'email_hash',
    'page_url',
    'referrer',
    'utm_source',
    'utm_medium',
    'utm_campaign',
    'utm_content',
    'utm_term',
    'fbclid',
  ]);

  const payload: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(body)) {
    if (reservedKeys.has(key) || isSensitivePayloadKey(key)) {
      continue;
    }

    payload[key] = sanitizePayloadValue(value);
  }

  return Object.keys(payload).length > 0 ? payload : null;
}

function toJsonError(status: number, origin: string | null, error: string): NextResponse {
  return NextResponse.json(
    { error },
    {
      status,
      headers: getCorsHeaders(origin),
    },
  );
}

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin');

  if (origin && !isAllowedOrigin(origin)) {
    return new NextResponse(null, { status: 403, headers: getCorsHeaders(null) });
  }

  return new NextResponse(null, { status: 204, headers: getCorsHeaders(origin) });
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin');

  if (origin && !isAllowedOrigin(origin)) {
    return toJsonError(403, null, 'origin_not_allowed');
  }

  const contentLengthHeader = request.headers.get('content-length');
  const contentLength = contentLengthHeader ? Number(contentLengthHeader) : null;
  if (contentLength !== null && Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    return toJsonError(413, origin, 'payload_too_large');
  }

  let requestBodyText = '';
  try {
    requestBodyText = await request.text();
  } catch {
    return toJsonError(400, origin, 'invalid_body');
  }

  if (Buffer.byteLength(requestBodyText, 'utf8') > MAX_BODY_BYTES) {
    return toJsonError(413, origin, 'payload_too_large');
  }

  let parsedBody: unknown;
  try {
    parsedBody = JSON.parse(requestBodyText);
  } catch {
    return toJsonError(400, origin, 'invalid_json');
  }

  if (!parsedBody || typeof parsedBody !== 'object' || Array.isArray(parsedBody)) {
    return toJsonError(400, origin, 'invalid_payload');
  }

  const body = parsedBody as Record<string, unknown>;

  const eventName = readOptionalString(body, 'event_name', 100);
  if (!eventName || !allowedEventNames.has(eventName)) {
    return toJsonError(400, origin, 'invalid_event_name');
  }

  const email = readOptionalString(body, 'email', 320);
  const providedEmailHash = readOptionalString(body, 'email_hash', 128);
  const normalizedEmail = email ? email.toLowerCase() : null;
  const emailHash = providedEmailHash || (normalizedEmail ? hashEmail(normalizedEmail) : null);
  const storableEmail = eventName === 'vinpop_email_submitted' ? normalizedEmail : null;

  const result = await insertSiteEvent({
    eventName,
    eventTime: normalizeEventTime(body.event_time),
    visitorId: readOptionalStringWithPayloadFallback(body, 'visitor_id', 255),
    sessionId: readOptionalStringWithPayloadFallback(body, 'session_id', 255),
    customerId: readOptionalString(body, 'customer_id', 255),
    email: storableEmail,
    emailHash,
    pageUrl: readOptionalStringWithPayloadFallback(body, 'page_url', 2048),
    referrer: readOptionalString(body, 'referrer', 2048),
    utmSource: readOptionalString(body, 'utm_source', 255),
    utmMedium: readOptionalString(body, 'utm_medium', 255),
    utmCampaign: readOptionalString(body, 'utm_campaign', 255),
    utmContent: readOptionalString(body, 'utm_content', 255),
    utmTerm: readOptionalString(body, 'utm_term', 255),
    fbclid: readOptionalString(body, 'fbclid', 255),
    payload: getExtraPayload(body),
  });

  if (!result.ok && process.env.NODE_ENV !== 'production') {
    console.error('Event accepted but not persisted', { reason: result.reason, eventName });
  }

  return new NextResponse(null, { status: 204, headers: getCorsHeaders(origin) });
}
