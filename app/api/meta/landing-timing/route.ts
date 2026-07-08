import { NextResponse } from 'next/server';
import { getDateRangeFromSearchParams } from '@/lib/analytics/dateRanges';
import { getLandingPageArrivals } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const range = getDateRangeFromSearchParams({
      period: url.searchParams.get('period') ?? undefined,
      range: url.searchParams.get('range') ?? undefined,
    });

    const result = await getLandingPageArrivals(range);

    if (!result.ok) {
      return NextResponse.json({ ok: false, reason: result.reason }, { status: 200 });
    }

    return NextResponse.json({ ok: true, metrics: result.metrics }, { status: 200 });
  } catch {
    return NextResponse.json({ ok: false, reason: 'connection-failed' }, { status: 200 });
  }
}
