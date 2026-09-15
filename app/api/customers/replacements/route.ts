import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getCustomerWineReplacements } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const identifier = request.nextUrl.searchParams.get('email')?.trim() ?? '';
  const productId = request.nextUrl.searchParams.get('productId')?.trim() ?? '';
  if (!identifier || identifier.length > 320 || !productId || productId.length > 80) {
    return NextResponse.json({ ok: false, reason: 'invalid-customer' }, { status: 400 });
  }

  const result = await getCustomerWineReplacements(identifier, productId);
  return NextResponse.json(result, { status: result.ok ? 200 : 200 });
}