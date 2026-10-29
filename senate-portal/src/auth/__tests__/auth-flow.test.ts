import { prisma } from '@/lib/prisma';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { UsersService } from '@/users/users.service';

jest.setTimeout(20000);

// Mock Supabase for integration tests
jest.mock('@/lib/supabase-server', () => ({
  createServerSupabaseClient: jest.fn(),
}));

// Mock UsersService for signup
jest.mock('@/users/users.service', () => {
  const actual = jest.requireActual('@/users/users.service');
  return {
    ...actual,
    UsersService: {
      ...actual.UsersService,
      getRoleIdByRoleType: jest.fn(),
    },
  };
});

describe('Auth Flow Integration Tests', () => {
  let testRoleId: string;
  let mockSupabaseClient: any;
  const mockSignUp = jest.fn();
  const mockSignIn = jest.fn();
  const mockGetSession = jest.fn();
  const mockSignOut = jest.fn();

  beforeAll(async () => {
    // Create test role
    const role = await prisma.role.create({
      data: { roleType: 'MEMBER' },
    });
    testRoleId = role.roleId;

    // Setup Supabase mocks
    mockSupabaseClient = {
      auth: {
        signUp: mockSignUp,
        signInWithPassword: mockSignIn,
        getSession: mockGetSession,
        signOut: mockSignOut,
      },
    };

    (createServerSupabaseClient as jest.Mock).mockResolvedValue(
      mockSupabaseClient,
    );
    (UsersService.getRoleIdByRoleType as jest.Mock).mockResolvedValue(
      testRoleId,
    );
  });

  afterAll(async () => {
    await UsersService.deleteRole(testRoleId);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Complete Auth Flow: Signup -> Login -> Session', () => {
    const testUser = {
      email: 'flowtest@example.com',
      password: 'password123',
      firstName: 'Flow',
      lastName: 'Test',
      nuid: '001234777',
    };

    const supabaseAuthId = 'test-flow-supabase-id-123';

    it('should complete full auth flow: signup, login, and session check', async () => {
      // Step 1: Signup
      mockSignUp.mockResolvedValueOnce({
        data: {
          user: {
            id: supabaseAuthId,
            email: testUser.email,
          },
        },
        error: null,
      });

      const signupModule = await import('../../app/api/auth/signup/route');
      const signupPOST = signupModule.POST;
      const signupReq = new Request('http://localhost/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testUser),
      });

      const signupResponse = await signupPOST(signupReq);
      const signupData = await signupResponse.json();

      expect(signupResponse.status).toBe(201);
      expect(signupData.user).toBeDefined();
      expect(signupData.user.supabaseAuthId).toBe(supabaseAuthId);
      expect(signupData.user.email).toBe(testUser.email);

      // Verify user was created in database
      const createdUser = await prisma.user.findUnique({
        where: { supabaseAuthId },
        include: { role: true },
      });
      expect(createdUser).toBeDefined();
      expect(createdUser?.email).toBe(testUser.email);

      // Step 2: Login (simulate AuthContext.login behavior)
      mockSignIn.mockResolvedValueOnce({
        data: {
          user: {
            id: supabaseAuthId,
            email: testUser.email,
          },
          session: {
            access_token: 'mock-access-token',
            refresh_token: 'mock-refresh-token',
          },
        },
        error: null,
      });

      // Simulate login by calling Supabase signInWithPassword
      const loginResult = await mockSupabaseClient.auth.signInWithPassword({
        email: testUser.email,
        password: testUser.password,
      });

      expect(loginResult.data.user).toBeDefined();
      expect(loginResult.data.user.id).toBe(supabaseAuthId);
      expect(loginResult.error).toBeNull();

      // Step 3: Fetch user profile by supabaseAuthId (simulate AuthContext.loadUserProfile)
      const getUserModule =
        await import('../../app/api/users/by-supabase-id/[supabaseAuthId]/route');
      const getUserGET = getUserModule.GET;
      const getUserReq = new Request(
        `http://localhost/api/users/by-supabase-id/${supabaseAuthId}`,
      );

      const getUserResponse = await getUserGET(getUserReq, {
        params: Promise.resolve({ supabaseAuthId }),
      });
      const userProfile = await getUserResponse.json();

      expect(getUserResponse.status).toBe(200);
      expect(userProfile.supabaseAuthId).toBe(supabaseAuthId);
      expect(userProfile.email).toBe(testUser.email);
      expect(userProfile.role).toBeDefined();
      expect(userProfile.role.roleType).toBe('MEMBER');

      // Step 4: Session check (simulate middleware/AuthContext session check)
      mockGetSession.mockResolvedValueOnce({
        data: {
          session: {
            user: {
              id: supabaseAuthId,
              email: testUser.email,
            },
            access_token: 'mock-access-token',
          },
        },
        error: null,
      });

      const sessionResult = await mockSupabaseClient.auth.getSession();
      expect(sessionResult.data.session).toBeDefined();
      expect(sessionResult.data.session.user.id).toBe(supabaseAuthId);

      // Step 5: Verify authenticated user can be retrieved
      const apiAuthModule = await import('../../utils/api-auth');
      const getAuthenticatedUser = apiAuthModule.getAuthenticatedUser;

      // Mock getSession for getAuthenticatedUser
      mockGetSession.mockResolvedValueOnce({
        data: {
          session: {
            user: {
              id: supabaseAuthId,
              email: testUser.email,
            },
          },
        },
        error: null,
      });

      const authenticatedUser = await getAuthenticatedUser();
      expect(authenticatedUser).toBeDefined();
      expect(authenticatedUser?.supabaseAuthId).toBe(supabaseAuthId);
      expect(authenticatedUser?.email).toBe(testUser.email);
    });

    it('should handle logout flow', async () => {
      // Ensure role exists (it should from beforeAll, but double-check)
      let roleId = testRoleId;
      const roleExists = await prisma.role.findUnique({ where: { roleId } });
      let newRole;
      if (!roleExists) {
        newRole = await prisma.role.create({
          data: { roleType: 'MEMBER' },
        });
        roleId = newRole.roleId;
      }

      // Create a user first
      const user = await prisma.user.create({
        data: {
          supabaseAuthId: 'test-logout-supabase-id',
          nuid: '001234666',
          email: 'logouttest@example.com',
          firstName: 'Logout',
          lastName: 'Test',
          roleId: roleId,
          password: null,
        },
      });

      // Mock sign out
      mockSignOut.mockResolvedValueOnce({
        error: null,
      });

      // Simulate logout
      const logoutResult = await mockSupabaseClient.auth.signOut();
      expect(logoutResult.error).toBeNull();

      // Verify session is cleared (simulate AuthContext behavior)
      mockGetSession.mockResolvedValueOnce({
        data: { session: null },
        error: null,
      });

      const sessionAfterLogout = await mockSupabaseClient.auth.getSession();
      expect(sessionAfterLogout.data.session).toBeNull();

      // Cleanup
      await prisma.user.delete({ where: { userId: user.userId } });
      if (newRole) {
        await UsersService.deleteRole(newRole.roleId);
      }
    });
  });

  describe('Auth Flow Error Handling', () => {
    it('should handle signup failure gracefully', async () => {
      mockSignUp.mockResolvedValueOnce({
        data: { user: null },
        error: { message: 'Email already exists' },
      });

      const signupModule = await import('../../app/api/auth/signup/route');
      const signupPOST = signupModule.POST;
      const signupReq = new Request('http://localhost/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'existing@example.com',
          password: 'password123',
          firstName: 'Test',
          lastName: 'User',
          nuid: '001234555',
        }),
      });

      const signupResponse = await signupPOST(signupReq);
      const signupData = await signupResponse.json();

      expect(signupResponse.status).toBe(400);
      expect(signupData.error).toBe('Email already exists');
    });

    it('should handle login failure gracefully', async () => {
      mockSignIn.mockResolvedValueOnce({
        data: { user: null, session: null },
        error: { message: 'Invalid email or password' },
      });

      const loginResult = await mockSupabaseClient.auth.signInWithPassword({
        email: 'wrong@example.com',
        password: 'wrongpassword',
      });

      expect(loginResult.error).toBeDefined();
      expect(loginResult.error.message).toBe('Invalid email or password');
      expect(loginResult.data.user).toBeNull();
    });

    it('should handle session expiration', async () => {
      mockGetSession.mockResolvedValueOnce({
        data: { session: null },
        error: { message: 'Session expired' },
      });

      const sessionResult = await mockSupabaseClient.auth.getSession();
      expect(sessionResult.data.session).toBeNull();
      expect(sessionResult.error).toBeDefined();
    });
  });

  describe('Auth Flow Edge Cases', () => {
    it('should handle user profile not found after successful Supabase auth', async () => {
      // Create session with Supabase ID that doesn't exist in our database
      mockGetSession.mockResolvedValueOnce({
        data: {
          session: {
            user: {
              id: 'non-existent-supabase-id',
              email: 'notindb@example.com',
            },
          },
        },
        error: null,
      });

      const apiAuthModule = await import('../../utils/api-auth');
      const getAuthenticatedUser = apiAuthModule.getAuthenticatedUser;
      const user = await getAuthenticatedUser();

      expect(user).toBeNull();
    });

    it('should handle multiple concurrent signups', async () => {
      // Ensure role exists for concurrent signups
      let roleId = testRoleId;
      const roleExists = await prisma.role.findUnique({ where: { roleId } });
      let newRole;
      if (!roleExists) {
        newRole = await prisma.role.create({
          data: { roleType: 'MEMBER' },
        });
        roleId = newRole.roleId;
      }
      (UsersService.getRoleIdByRoleType as jest.Mock).mockResolvedValue(roleId);

      const users = [
        {
          email: 'concurrent1@example.com',
          nuid: '001234111',
          supabaseId: 'concurrent-1',
        },
        {
          email: 'concurrent2@example.com',
          nuid: '001234222',
          supabaseId: 'concurrent-2',
        },
        {
          email: 'concurrent3@example.com',
          nuid: '001234333',
          supabaseId: 'concurrent-3',
        },
      ];

      const signupModule = await import('../../app/api/auth/signup/route');
      const signupPOST = signupModule.POST;

      const signupPromises = users.map((user, index) => {
        mockSignUp.mockResolvedValueOnce({
          data: {
            user: {
              id: user.supabaseId,
              email: user.email,
            },
          },
          error: null,
        });

        return signupPOST(
          new Request('http://localhost/api/auth/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: user.email,
              password: 'password123',
              firstName: 'Concurrent',
              lastName: `User${index + 1}`,
              nuid: user.nuid,
            }),
          }),
        );
      });

      const responses = await Promise.all(signupPromises);

      for (const response of responses) {
        expect(response.status).toBe(201);
        const data = await response.json();
        expect(data.user).toBeDefined();
      }

      // Cleanup
      await prisma.user.deleteMany({
        where: {
          supabaseAuthId: { in: users.map((u) => u.supabaseId) },
        },
      });
      if (newRole) {
        await UsersService.deleteRole(newRole.roleId);
      }
    });
  });
});
