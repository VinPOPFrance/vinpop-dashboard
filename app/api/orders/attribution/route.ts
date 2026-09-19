import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { isManualAttributionChannel, removeOrderChannelOverride, setOrderChannelOverride } from '@/lib/db';

export const runtime = 'nodejs';

const MAX_BODY_BYTES = 4 * 1024;

export async function PUT(request: NextRequest) {
  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) {
    return NextResponse.json({ ok: false, reason: 'payload-too-large' }, { status: 413 });
  }

  let body: { orderId?: unknown; channel?: unknown; note?: unknown };
  try {
    body = JSON.parse(raw) as { orderId?: unknown; channel?: unknown; note?: unknown };
  } catch {
    return NextResponse.json({ ok: false, reason: 'invalid-json' }, { status: 400 });
  }

  const orderId = typeof body.orderId === 'string' ? body.orderId.trim() : '';
  const channel = typeof body.channel === 'string' ? body.channel : '';
  const note = body.note === null ? null : typeof body.note === 'string' ? body.note.trim().slice(0, 500) : null;

  if (!orderId || orderId.length > 64 || !isManualAttributionChannel(channel)) {
    return NextResponse.json({ ok: false, reason: 'invalid-input' }, { status: 400 });
  }

  const result = await setOrderChannelOverride(orderId, channel, note);
  return NextResponse.json(result, { status: result.ok ? 200 : result.reason === 'schema-missing' ? 503 : 200 });
}

export async function DELETE(request: NextRequest) {
  const orderId = request.nextUrl.searchParams.get('orderId')?.trim() ?? '';
  if (!orderId || orderId.length > 64) {
    return NextResponse.json({ ok: false, reason: 'invalid-input' }, { status: 400 });
  }

  const result = await removeOrderChannelOverride(orderId);
  return NextResponse.json(result, { status: result.ok ? 200 : result.reason === 'schema-missing' ? 503 : 200 });
}
