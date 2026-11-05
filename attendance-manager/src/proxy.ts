import { NextResponse, type NextRequest } from 'next/server';
import { createSgaProxy } from '@nusgaops/sgauth/proxy';

/**
 * Sends signed-out visitors to SGAuth sign-in, and refuses cross-site writes
 * to the API.
 *
 * The SGAuth redirect only checks that the cookie is present -- it never calls
 * SGAuth -- so it is a redirect for people, not a lock. Every API route checks
 * the session itself (src/server/auth/api-auth.ts), and that is what refuses a bad
 * cookie.
 *
 * Public paths:
 *   /        redirects to /login
 *   /login   offers SGAuth sign-in, and the NUID form for a first sign-in
 *   /api     every route answers 401 JSON itself; a redirect to an HTML
 *            sign-in page would only confuse the fetch() that asked
 */
const sgaProxy = createSgaProxy({
  publicPaths: ['/', '/login', '/api'],
});

const safeMethods = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Whether a state-changing API request came from this origin. The SGAuth
 * cookie is sent to every *.northeasternsga.com site, so SameSite alone does
 * not stop another SGA subdomain from posting here. Browsers always send
 * Origin on a cross-origin or non-GET fetch, so a missing one is refused too.
 */
export function isSameOriginRequest(request: NextRequest): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return false;
  const host =
    request.headers.get('x-forwarded-host') ?? request.headers.get('host');
  try {
    return new URL(origin).host === (host ?? request.nextUrl.host);
  } catch {
    return false;
  }
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (
    (pathname === '/api' || pathname.startsWith('/api/')) &&
    !safeMethods.has(request.method) &&
    !isSameOriginRequest(request)
  ) {
    return NextResponse.json(
      { error: 'Cross-origin request refused' },
      { status: 403 },
    );
  }
  return sgaProxy(request);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
