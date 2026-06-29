import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import {
  AUTH_COOKIE_MAX_AGE_SECONDS,
  AUTH_COOKIE_NAME,
  getExpectedAuthToken,
  isValidPassword,
} from '@/lib/dashboard-auth';

function getSafeRedirectPath(rawNext: string | null): string {
  if (!rawNext || !rawNext.startsWith('/')) {
    return '/';
  }

  if (rawNext.startsWith('//')) {
    return '/';
  }

  return rawNext;
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const password = String(formData.get('password') ?? '');
  const nextPath = getSafeRedirectPath(formData.get('next')?.toString() ?? null);

  const expectedToken = await getExpectedAuthToken();
  if (!expectedToken) {
    return NextResponse.redirect(new URL('/login?error=config', request.url));
  }

  const isPasswordValid = await isValidPassword(password);
  if (!isPasswordValid) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('error', 'invalid');
    loginUrl.searchParams.set('next', nextPath);
    return NextResponse.redirect(loginUrl);
  }

  const response = NextResponse.redirect(new URL(nextPath, request.url));
  response.cookies.set({
    name: AUTH_COOKIE_NAME,
    value: expectedToken,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: AUTH_COOKIE_MAX_AGE_SECONDS,
    path: '/',
  });

  return response;
}
