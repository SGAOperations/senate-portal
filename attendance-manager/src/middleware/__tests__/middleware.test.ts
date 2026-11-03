import { NextRequest } from 'next/server';

jest.setTimeout(20000);

// Read when the proxy module loads, so set before importing it.
process.env.SGAUTH_URL = 'https://auth.example.test';
delete process.env.SGAUTH_COOKIE_NAME;
const COOKIE = '__Secure-sgauth.session_token';

async function loadProxy() {
  return (await import('../../proxy')).proxy;
}

function request(
  pathname: string,
  {
    method = 'GET',
    signedIn = false,
    origin,
  }: { method?: string; signedIn?: boolean; origin?: string } = {},
) {
  const headers: Record<string, string> = { host: 'senate.example.test' };
  if (signedIn) headers.cookie = `${COOKIE}=token`;
  if (origin) headers.origin = origin;
  return new NextRequest(new URL(`https://senate.example.test${pathname}`), {
    method,
    headers,
  });
}

describe('Proxy', () => {
  describe('SGAuth sign-in redirect', () => {
    it.each([
      '/dashboard',
      '/meetings',
      '/attendance',
      '/profile',
      '/homepage',
    ])('redirects %s to SGAuth sign-in without the cookie', async (route) => {
      const proxy = await loadProxy();
      const response = proxy(request(route));

      expect(response.status).toBe(307);
      const location = new URL(response.headers.get('location')!);
      expect(location.origin).toBe('https://auth.example.test');
      expect(location.searchParams.get('redirect')).toBe(
        `https://senate.example.test${route}`,
      );
    });

    it('lets a request with the cookie through', async () => {
      const proxy = await loadProxy();
      const response = proxy(request('/homepage', { signedIn: true }));

      expect(response.status).toBe(200);
      expect(response.headers.get('location')).toBeNull();
    });

    it.each(['/', '/login', '/api/users/me'])(
      'leaves public path %s alone without the cookie',
      async (route) => {
        const proxy = await loadProxy();
        const response = proxy(request(route));

        expect(response.status).toBe(200);
        expect(response.headers.get('location')).toBeNull();
      },
    );
  });

  describe('cross-origin API writes', () => {
    it.each(['POST', 'PUT', 'PATCH', 'DELETE'])(
      'refuses %s with no Origin header',
      async (method) => {
        const proxy = await loadProxy();
        const response = proxy(
          request('/api/users/abc', { method, signedIn: true }),
        );
        expect(response.status).toBe(403);
      },
    );

    it.each([
      ['another site', 'https://evil.example.com'],
      ['another SGA subdomain', 'https://chambers.example.test'],
      ['a malformed origin', 'null'],
    ])('refuses a write from %s', async (_label, origin) => {
      const proxy = await loadProxy();
      const response = proxy(
        request('/api/voting-record', {
          method: 'POST',
          signedIn: true,
          origin,
        }),
      );
      expect(response.status).toBe(403);
    });

    it('allows a same-origin write', async () => {
      const proxy = await loadProxy();
      const response = proxy(
        request('/api/voting-record', {
          method: 'POST',
          signedIn: true,
          origin: 'https://senate.example.test',
        }),
      );
      expect(response.status).toBe(200);
    });

    it('does not check Origin on reads', async () => {
      const proxy = await loadProxy();
      const response = proxy(request('/api/meeting', { signedIn: true }));
      expect(response.status).toBe(200);
    });
  });
});
