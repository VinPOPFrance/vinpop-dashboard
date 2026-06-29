import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { AUTH_COOKIE_NAME, getExpectedAuthToken } from '@/lib/dashboard-auth';

const publicPaths = new Set(['/login']);

function isPublicPath(pathname: string): boolean {
  if (publicPaths.has(pathname)) {
    return true;
  }

  return pathname.startsWith('/api/login') || pathname.startsWith('/api/logout');
}

function isAssetPath(pathname: string): boolean {
  return (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.startsWith('/robots.txt') ||
    pathname.startsWith('/sitemap.xml')
  );
}

function getSafeNextPath(pathname: string, search: string): string {
  const target = `${pathname}${search}`;
  if (!target.startsWith('/')) {
    return '/';
  }

  return target;
}

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (isAssetPath(pathname) || isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const expectedToken = await getExpectedAuthToken();
  if (!expectedToken) {
    return NextResponse.redirect(new URL('/login?error=config', request.url));
  }

  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  if (token === expectedToken) {
    return NextResponse.next();
  }

  const redirectUrl = new URL('/login', request.url);
  redirectUrl.searchParams.set('next', getSafeNextPath(pathname, search));

  return NextResponse.redirect(redirectUrl);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image).*)'],
};
