import { getAuthenticatedUser, requireAuth } from '../api-auth';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { UsersService } from '@/users/users.service';

jest.setTimeout(20000);

// Mock Supabase server client
jest.mock('@/lib/supabase-server', () => ({
  createServerSupabaseClient: jest.fn(),
}));

describe('API Auth Utilities', () => {
  let testRoleId: string;
  let testUserId: string;
  let testSupabaseAuthId: string;
  const mockGetSession = jest.fn();
  let mockSupabaseClient: any;

  beforeAll(async () => {
    // Create test role
    const role = await prisma.role.create({
      data: { roleType: 'MEMBER' },
    });
    testRoleId = role.roleId;

    // Create test user
    const user = await prisma.user.create({
      data: {
        supabaseAuthId: 'test-supabase-auth-id-api',
        nuid: '001234888',
        email: 'apitest@example.com',
        firstName: 'API',
        lastName: 'Test',
        roleId: testRoleId,
        password: null,
      },
    });
    testUserId = user.userId;
    testSupabaseAuthId = user.supabaseAuthId!;
  });

  afterAll(async () => {
    await prisma.user.delete({ where: { userId: testUserId } });
    await UsersService.deleteRole(testRoleId);
  });

  beforeEach(() => {
    jest.clearAllMocks();

    mockSupabaseClient = {
      auth: {
        getSession: mockGetSession,
      },
    };

    (createServerSupabaseClient as jest.Mock).mockResolvedValue(
      mockSupabaseClient,
    );
  });

  describe('getAuthenticatedUser', () => {
    it('should return user when valid session exists', async () => {
      mockGetSession.mockResolvedValue({
        data: {
          session: {
            user: {
              id: testSupabaseAuthId,
              email: 'apitest@example.com',
            },
          },
        },
        error: null,
      });

      const user = await getAuthenticatedUser();

      expect(user).toBeDefined();
      expect(user?.userId).toBe(testUserId);
      expect(user?.supabaseAuthId).toBe(testSupabaseAuthId);
      expect(user?.email).toBe('apitest@example.com');
      expect(user?.role).toBeDefined();
      expect(user?.role.roleType).toBe('MEMBER');
    });

    it('should return null when no session exists', async () => {
      mockGetSession.mockResolvedValue({
        data: { session: null },
        error: null,
      });

      const user = await getAuthenticatedUser();

      expect(user).toBeNull();
    });

    it('should return null when session error occurs', async () => {
      mockGetSession.mockResolvedValue({
        data: { session: null },
        error: { message: 'Session error' },
      });

      const user = await getAuthenticatedUser();

      expect(user).toBeNull();
    });

    it('should return null when user profile not found in database', async () => {
      mockGetSession.mockResolvedValue({
        data: {
          session: {
            user: {
              id: 'non-existent-supabase-id',
              email: 'notfound@example.com',
            },
          },
        },
        error: null,
      });

      const user = await getAuthenticatedUser();

      expect(user).toBeNull();
    });

    it('should handle database errors gracefully', async () => {
      mockGetSession.mockResolvedValue({
        data: {
          session: {
            user: {
              id: testSupabaseAuthId,
              email: 'apitest@example.com',
            },
          },
        },
        error: null,
      });

      // Mock prisma to throw an error
      const originalFindUnique = prisma.user.findUnique;
      prisma.user.findUnique = jest
        .fn()
        .mockRejectedValue(new Error('Database error'));

      const user = await getAuthenticatedUser();

      expect(user).toBeNull();

      // Restore original method
      prisma.user.findUnique = originalFindUnique;
    });
  });

  describe('requireAuth', () => {
    it('should return user when authenticated', async () => {
      mockGetSession.mockResolvedValue({
        data: {
          session: {
            user: {
              id: testSupabaseAuthId,
              email: 'apitest@example.com',
            },
          },
        },
        error: null,
      });

      const result = await requireAuth();

      expect(result.user).toBeDefined();
      expect(result.user?.userId).toBe(testUserId);
      expect(result.error).toBeNull();
    });

    it('should return error response when not authenticated', async () => {
      mockGetSession.mockResolvedValue({
        data: { session: null },
        error: null,
      });

      const result = await requireAuth();

      expect(result.user).toBeNull();
      expect(result.error).toBeDefined();

      const errorResponse = result.error as NextResponse;
      expect(errorResponse.status).toBe(401);

      const errorData = await errorResponse.json();
      expect(errorData.error).toBe('Unauthorized');
    });

    it('should return error response when session error occurs', async () => {
      mockGetSession.mockResolvedValue({
        data: { session: null },
        error: { message: 'Session error' },
      });

      const result = await requireAuth();

      expect(result.user).toBeNull();
      expect(result.error).toBeDefined();

      const errorResponse = result.error as NextResponse;
      expect(errorResponse.status).toBe(401);
    });

    it('should return error response when user profile not found', async () => {
      mockGetSession.mockResolvedValue({
        data: {
          session: {
            user: {
              id: 'non-existent-supabase-id',
              email: 'notfound@example.com',
            },
          },
        },
        error: null,
      });

      const result = await requireAuth();

      expect(result.user).toBeNull();
      expect(result.error).toBeDefined();

      const errorResponse = result.error as NextResponse;
      expect(errorResponse.status).toBe(401);
    });
  });

  // ensuring that soft delete worked
  describe('UsersService.deleteUser', () => {
    it('should soft delete a user by setting deletedAt', async () => {
      await UsersService.deleteUser(testUserId);
      const user = await prisma.user.findUnique({
        where: { userId: testUserId },
      });

      expect(user).toBeDefined();
      expect(user?.deletedAt).not.toBeNull();
      expect(user?.deletedAt).toBeInstanceOf(Date);
    });

    it('should not return soft deleted user from getAllUsers', async () => {
      const users = await UsersService.getAllUsers();
      const deletedUser = users.find((u) => u.userId === testUserId);

      expect(deletedUser).toBeUndefined();
    });
  });
});
