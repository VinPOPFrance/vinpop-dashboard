import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getTasteKitFollowup, updateTasteKitFollowup } from '@/lib/db';

export const runtime = 'nodejs';

const MAX_BODY_BYTES = 8 * 1024;

export async function GET(request: NextRequest) {
  const identifier = request.nextUrl.searchParams.get('email')?.trim() ?? '';
  if (!identifier || identifier.length > 320) {
    return NextResponse.json({ ok: false, reason: 'invalid-customer' }, { status: 400 });
  }

  const result = await getTasteKitFollowup(identifier);
  return NextResponse.json(result, { status: result.ok ? 200 : result.reason === 'schema-missing' ? 503 : 200 });
}

export async function PUT(request: NextRequest) {
  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) {
    return NextResponse.json({ ok: false, reason: 'payload-too-large' }, { status: 413 });
  }

  let body: { email?: unknown; contactedAt?: unknown; note?: unknown };
  try {
    body = JSON.parse(raw) as { email?: unknown; contactedAt?: unknown; note?: unknown };
  } catch {
    return NextResponse.json({ ok: false, reason: 'invalid-json' }, { status: 400 });
  }

  const identifier = typeof body.email === 'string' ? body.email.trim() : '';
  const contactedAt = body.contactedAt === null ? null : typeof body.contactedAt === 'string' ? body.contactedAt : '';
  const note = body.note === null ? null : typeof body.note === 'string' ? body.note.trim().slice(0, 2000) : null;
  if (!identifier || identifier.length > 320 || (contactedAt && Number.isNaN(Date.parse(contactedAt)))) {
    return NextResponse.json({ ok: false, reason: 'invalid-input' }, { status: 400 });
  }

  const result = await updateTasteKitFollowup(identifier, contactedAt || null, note);
  return NextResponse.json(result, { status: result.ok ? 200 : result.reason === 'schema-missing' ? 503 : 200 });
}
