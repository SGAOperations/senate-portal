import { NextRequest } from 'next/server';
import { middleware } from '../../middleware';
import { createServerClient } from '@supabase/ssr';

jest.setTimeout(20000);

// Mock @supabase/ssr
jest.mock('@supabase/ssr', () => ({
  createServerClient: jest.fn(),
}));

describe('Middleware', () => {
  const mockGetSession = jest.fn();
  let mockSupabaseClient: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockSupabaseClient = {
      auth: {
        getSession: mockGetSession,
      },
    };

    (createServerClient as jest.Mock).mockReturnValue(mockSupabaseClient);
  });

  const createMockRequest = (pathname: string, cookies: any[] = []) => {
    const url = new URL(`http://localhost${pathname}`);
    const request = new NextRequest(url, {
      headers: {
        cookie: cookies.map((c) => `${c.name}=${c.value}`).join('; '),
      },
    });

    // Mock cookies.getAll
    request.cookies.getAll = jest.fn().mockReturnValue(cookies);
    request.cookies.set = jest.fn();

    return request;
  };

  describe('Protected routes', () => {
    const protectedRoutes = [
      '/dashboard',
      '/meetings',
      '/attendance',
      '/profile',
      '/homepage',
    ];

    protectedRoutes.forEach((route) => {
      it(`should redirect to /login when accessing ${route} without session`, async () => {
        mockGetSession.mockResolvedValue({
          data: { session: null },
          error: null,
        });

        const request = createMockRequest(route);
        const response = await middleware(request);

        expect(response.status).toBe(307); // Redirect status
        expect(response.headers.get('location')).toBe('http://localhost/login');
      });

      it(`should allow access to ${route} when session exists`, async () => {
        mockGetSession.mockResolvedValue({
          data: {
            session: {
              user: { id: 'test-user-id', email: 'test@example.com' },
            },
          },
          error: null,
        });

        const request = createMockRequest(route);
        const response = await middleware(request);

        expect(response.status).toBe(200);
        expect(response.headers.get('location')).toBeNull();
      });
    });

    it('should protect nested protected routes', async () => {
      mockGetSession.mockResolvedValue({
        data: { session: null },
        error: null,
      });

      const request = createMockRequest('/dashboard/settings');
      const response = await middleware(request);

      expect(response.status).toBe(307);
      expect(response.headers.get('location')).toBe('http://localhost/login');
    });
  });

  describe('Login page redirect', () => {
    it('should redirect to /homepage when accessing /login with active session', async () => {
      mockGetSession.mockResolvedValue({
        data: {
          session: {
            user: { id: 'test-user-id', email: 'test@example.com' },
          },
        },
        error: null,
      });

      const request = createMockRequest('/login');
      const response = await middleware(request);

      expect(response.status).toBe(307);
      expect(response.headers.get('location')).toBe(
        'http://localhost/homepage',
      );
    });

    it('should allow access to /login when no session exists', async () => {
      mockGetSession.mockResolvedValue({
        data: { session: null },
        error: null,
      });

      const request = createMockRequest('/login');
      const response = await middleware(request);

      expect(response.status).toBe(200);
      expect(response.headers.get('location')).toBeNull();
    });
  });

  describe('Public routes', () => {
    it('should allow access to public routes without session', async () => {
      mockGetSession.mockResolvedValue({
        data: { session: null },
        error: null,
      });

      const publicRoutes = ['/', '/about', '/contact'];

      for (const route of publicRoutes) {
        const request = createMockRequest(route);
        const response = await middleware(request);

        expect(response.status).toBe(200);
        expect(response.headers.get('location')).toBeNull();
      }
    });
  });

  describe('Session handling', () => {
    it('should handle session errors gracefully', async () => {
      mockGetSession.mockResolvedValue({
        data: { session: null },
        error: { message: 'Session error' },
      });

      const request = createMockRequest('/homepage');
      const response = await middleware(request);

      // Should redirect to login on error
      expect(response.status).toBe(307);
      expect(response.headers.get('location')).toBe('http://localhost/login');
    });

    it('should create Supabase client with correct configuration', async () => {
      mockGetSession.mockResolvedValue({
        data: { session: null },
        error: null,
      });

      const request = createMockRequest('/homepage');
      await middleware(request);

      expect(createServerClient).toHaveBeenCalledWith(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        expect.objectContaining({
          cookies: expect.objectContaining({
            getAll: expect.any(Function),
            setAll: expect.any(Function),
          }),
        }),
      );
    });
  });
});
