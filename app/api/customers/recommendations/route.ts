import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getCustomerWineRecommendations } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const identifier = request.nextUrl.searchParams.get('email')?.trim() ?? '';

  if (!identifier || identifier.length > 320) {
    return NextResponse.json({ ok: false, reason: 'invalid-customer' }, { status: 400 });
  }

  const result = await getCustomerWineRecommendations(identifier);
  if (!result.ok) {
    const status = result.reason === 'unknown-customer' ? 404 : 200;
    return NextResponse.json({ ok: false, reason: result.reason }, { status });
  }

  return NextResponse.json(result, { status: 200 });
}