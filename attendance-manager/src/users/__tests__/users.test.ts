import { UsersService } from '../users.service';
import { UsersController } from '../users.controller';
import { prisma } from '../../lib/prisma';
import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { RoleType } from '@/generated/prisma';

jest.setTimeout(20000);

// Mock Supabase for signup tests
jest.mock('@/lib/supabase-server', () => ({
  createServerSupabaseClient: jest.fn(),
}));

// Mock UsersService for signup tests
jest.mock('../users.service', () => {
  const actual = jest.requireActual('../users.service');
  return {
    ...actual,
    UsersService: {
      ...actual.UsersService,
      getRoleIdByRoleType: jest.fn(),
    },
  };
});

describe('UsersService', () => {
  let testRoleId: string;

  beforeAll(async () => {
    // Clean up any leftover data from previous runs
    await prisma.user.deleteMany({
      where: {
        nuid: { in: ['001234567', '001234568', '001234570', '001234571'] }
      }
    });

    const role = await prisma.role.create({
      data: { roleType: 'MEMBER' },
    });
    testRoleId = role.roleId;

    await UsersService.createUser({
      userId: 'test-user-id-1',
      supabaseAuthId: 'test-supabase-auth-id-1',
      nuid: '001234567',
      email: 'jdoe@northeastern.edu',
      firstName: 'John',
      lastName: 'Doe',
      roleId: testRoleId,
      roleType: RoleType.MEMBER,
      isVotingMember: true,
      password: null
    });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: {
        nuid: { in: ['001234567', '001234568', '001234570', '001234571'] },
      },
    });
    await UsersService.deleteRole(testRoleId);
  });

  it('should fetch users by role type', async () => {
    const users = await UsersService.getUsersByRole(RoleType.MEMBER);
    expect(users.length).toBeGreaterThan(0);
    expect(users[0].roleType).toBe(RoleType.MEMBER);
  });

  it('should create a new user', async () => {
    const newUser = await UsersService.createUser({
      userId: 'test-user-id-2',
      supabaseAuthId: 'test-supabase-auth-id-2',
      nuid: '001234568',
      email: 'jdoe2@northeastern.edu',
      firstName: 'Jane',
      lastName: 'Doe',
      roleId: testRoleId,
      roleType: RoleType.MEMBER,
      isVotingMember: true
    });

    expect(newUser).toBeDefined();
    expect(newUser.email).toBe('jdoe2@northeastern.edu');
    expect(newUser.nuid).toBe('001234568');
  });

  it('should fetch all users', async () => {
    const users = await UsersService.getAllUsers();
    expect(Array.isArray(users)).toBe(true);
  });

  it('should fetch a user by id', async () => {
    const [user] = await UsersService.getAllUsers();
    const fetchedUser = await UsersService.getUserById(user.userId);
    expect(fetchedUser?.userId).toBe(user.userId);
  });

  it('should update a user', async () => {
    const newUser = await UsersService.createUser({
      userId: 'test-user-id-4',
      supabaseAuthId: 'test-supabase-auth-id-4',
      nuid: '001234570',
      email: 'jdoe3@northeastern.edu',
      firstName: 'Jane',
      lastName: 'Doe',
      roleId: testRoleId,
      roleType: RoleType.MEMBER,
      isVotingMember: true
    });

    const updatedUser = await UsersService.updateUser(newUser.userId, {
      email: 'updated@northeastern.edu',
      firstName: 'Updated',
      lastName: 'User',
    });

    expect(updatedUser.email).toBe('updated@northeastern.edu');
    expect(updatedUser.firstName).toBe('Updated');
    expect(updatedUser.lastName).toBe('User');
  });

  it('should delete a user', async () => {
    const newUser = await UsersService.createUser({
      userId: 'test-user-id-5',
      supabaseAuthId: 'test-supabase-auth-id-5',
      nuid: '001234571',
      email: 'jdoe4@northeastern.edu',
      firstName: 'Jane',
      lastName: 'Doe',
      roleId: testRoleId,
      roleType: RoleType.MEMBER,
      isVotingMember: true
    });
    await UsersService.deleteUser(newUser.userId);
    const deletedUser = await UsersService.getUserById(newUser.userId);
    expect(deletedUser).toBeNull();
  });
});

describe('UsersController.validateNuid', () => {
  let testRoleId: string;
  let testUserId: string;

  beforeAll(async () => {
    const role = await prisma.role.create({
      data: { roleType: 'MEMBER' },
    });
    testRoleId = role.roleId;

    // Create a test user for validation
    const user = await UsersService.createUser({
      userId: 'test-user-id-validate-1',
      supabaseAuthId: 'test-supabase-auth-id-validate-1',
      nuid: '001234567',
      email: 'jdoe@northeastern.edu',
      firstName: 'John',
      lastName: 'Doe',
      roleId: testRoleId,
      password: null,
      roleType: RoleType.MEMBER,
      isVotingMember: true
    });
    testUserId = user.userId;
  });

  afterAll(async () => {
    await prisma.user.delete({ where: { userId: testUserId } });
    await UsersService.deleteRole(testRoleId);
  });

  it('should validate correct NUID and name combination', async () => {
    const response = await UsersController.validateNuid({
      nuid: '001234567',
      firstName: 'John',
      lastName: 'Doe',
    });

    expect(response).toBeInstanceOf(NextResponse);
    const data = await response.json();
    expect(data.valid).toBe(true);
    expect(data.message).toBe(
      'NUID format is valid and matches the provided name',
    );
    expect(data.user).toBeDefined();
    expect(data.user.nuid).toBe('001234567');
    expect(data.user.firstName).toBe('John');
    expect(data.user.lastName).toBe('Doe');
    expect(data.user.email).toBe('jdoe@northeastern.edu');
  });

  it('should reject missing required fields', async () => {
    const response = await UsersController.validateNuid({
      nuid: '',
      firstName: 'John',
      lastName: 'Doe',
    });

    expect(response).toBeInstanceOf(NextResponse);
    const data = await response.json();
    expect(data.valid).toBe(false);
    expect(data.error).toBe(
      'Missing required fields: nuid, firstName, lastName',
    );
  });

  it('should reject invalid NUID format', async () => {
    const response = await UsersController.validateNuid({
      nuid: '123',
      firstName: 'John',
      lastName: 'Doe',
    });

    expect(response).toBeInstanceOf(NextResponse);
    const data = await response.json();
    expect(data.valid).toBe(false);
    expect(data.error).toBe('Invalid NUID format. Must be exactly 9 digits.');
  });

  it('should reject non-existent NUID', async () => {
    const getUserByNuid = jest
      .spyOn(UsersService, 'getUserByNuid')
      .mockResolvedValue(null);

    try {
      const response = await UsersController.validateNuid({
        nuid: '999999999',
        firstName: 'John',
        lastName: 'Doe',
      });

      expect(response).toBeInstanceOf(NextResponse);
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.valid).toBe(false);
      expect(data.error).toBe('No user found with this NUID');
    } finally {
      getUserByNuid.mockRestore();
    }
  });

  it('should reject mismatched name', async () => {
    const response = await UsersController.validateNuid({
      nuid: '001234567',
      firstName: 'Jane',
      lastName: 'Smith',
    });

    expect(response).toBeInstanceOf(NextResponse);
    const data = await response.json();
    expect(data.valid).toBe(false);
    expect(data.error).toBe('NUID does not match the provided name');
  });
});

describe('GET /api/users/by-supabase-id/[supabaseAuthId]', () => {
  let routeTestRoleId: string;
  let routeTestUserId: string;
  let routeTestSupabaseAuthId: string;

  beforeAll(async () => {
    // Create a test role
    const role = await prisma.role.create({
      data: { roleType: 'MEMBER' },
    });
    routeTestRoleId = role.roleId;

    // Create a test user with supabaseAuthId
    const user = await prisma.user.create({
      data: {
        supabaseAuthId: 'test-supabase-auth-id-route-1',
        nuid: '001234888',
        email: 'routeuser@example.com',
        firstName: 'Route',
        lastName: 'User',
        roleId: routeTestRoleId,
        roleType: RoleType.MEMBER,
        isVotingMember: true,
        password: null
      }
    });
    routeTestUserId = user.userId;
    routeTestSupabaseAuthId = user.supabaseAuthId!;
  });

  afterAll(async () => {
    await prisma.user.delete({ where: { userId: routeTestUserId } });
    await UsersService.deleteRole(routeTestRoleId);
  });

  it('should fetch user by supabaseAuthId successfully', async () => {
    const { GET } =
      await import('../../app/api/users/by-supabase-id/[supabaseAuthId]/route');
    const req = new Request(
      `http://localhost/api/users/by-supabase-id/${routeTestSupabaseAuthId}`,
    );

    const params = Promise.resolve({ supabaseAuthId: routeTestSupabaseAuthId });
    const response = await GET(req, { params });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toBeDefined();
    expect(data.userId).toBe(routeTestUserId);
    expect(data.supabaseAuthId).toBe(routeTestSupabaseAuthId);
    expect(data.email).toBe('routeuser@example.com');
    expect(data.firstName).toBe('Route');
    expect(data.lastName).toBe('User');
    expect(data.nuid).toBe('001234888');
    expect(data.roleType).toBe('MEMBER');
  });

  it('should return 404 when user is not found', async () => {
    const { GET } =
      await import('../../app/api/users/by-supabase-id/[supabaseAuthId]/route');
    const req = new Request(
      'http://localhost/api/users/by-supabase-id/non-existent-id',
    );

    const params = Promise.resolve({ supabaseAuthId: 'non-existent-id' });
    const response = await GET(req, { params });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('User not found');
  });

  it('should include role information in response', async () => {
    const { GET } =
      await import('../../app/api/users/by-supabase-id/[supabaseAuthId]/route');
    // Create a user with EBOARD role
    const eboardRole = await prisma.role.create({
      data: { roleType: 'EBOARD' },
    });

    const eboardUser = await prisma.user.create({
      data: {
        supabaseAuthId: 'test-supabase-auth-id-eboard',
        nuid: '001234887',
        email: 'eboardroute@example.com',
        firstName: 'Eboard',
        lastName: 'Route',
        roleId: eboardRole.roleId,
        roleType: RoleType.EBOARD,
        password: null
      }
    });

    const req = new Request(
      'http://localhost/api/users/by-supabase-id/test-supabase-auth-id-eboard',
    );

    const params = Promise.resolve({
      supabaseAuthId: 'test-supabase-auth-id-eboard',
    });
    const response = await GET(req, { params });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.roleType).toBe('EBOARD');

    await prisma.user.delete({ where: { userId: eboardUser.userId } });
    await prisma.role.delete({ where: { roleId: eboardRole.roleId } });
  });
});

describe('POST /api/auth/signup', () => {
  let signupTestRoleId: string;

  beforeAll(async () => {
    // Create a test role
    const role = await prisma.role.create({
      data: { roleType: 'MEMBER' },
    });
    signupTestRoleId = role.roleId;

    // Mock UsersService.getRoleIdByRoleType
    (UsersService.getRoleIdByRoleType as jest.Mock).mockResolvedValue(
      signupTestRoleId,
    );
  });

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: {
        supabaseAuthId: {
          in: ['test-supabase-auth-id-123', 'test-supabase-auth-id-456'],
        },
      },
    });
    await UsersService.deleteRole(signupTestRoleId);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create a new user successfully', async () => {
    const { POST } = await import('../../app/api/auth/signup/route');
    const mockSupabaseClient = {
      auth: {
        signUp: jest.fn().mockResolvedValue({
          data: {
            user: {
              id: 'test-supabase-auth-id-123',
              email: 'newuser@example.com',
            },
          },
          error: null,
        }),
      },
    };

    (createServerSupabaseClient as jest.Mock).mockResolvedValue(
      mockSupabaseClient,
    );

    const requestBody = {
      email: 'newuser@example.com',
      password: 'password123',
      firstName: 'New',
      lastName: 'User',
      nuid: '001234999',
    };

    const req = new Request('http://localhost/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.message).toBe('User created successfully');
    expect(data.user).toBeDefined();
    expect(data.user.email).toBe('newuser@example.com');
    expect(data.user.supabaseAuthId).toBe('test-supabase-auth-id-123');
    expect(data.user.firstName).toBe('New');
    expect(data.user.lastName).toBe('User');
    expect(data.user.nuid).toBe('001234999');
    expect(data.user.roleId).toBe(signupTestRoleId);

    // Verify user was created in database
    const createdUser = await prisma.user.findUnique({
      where: { supabaseAuthId: 'test-supabase-auth-id-123' },
    });
    expect(createdUser).toBeDefined();
    expect(createdUser?.email).toBe('newuser@example.com');
  });

  it('should return 400 when required fields are missing', async () => {
    const { POST } = await import('../../app/api/auth/signup/route');
    const requestBody = {
      email: 'test@example.com',
      // Missing password, firstName, lastName, nuid
    };

    const req = new Request('http://localhost/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Missing required fields');
  });

  it('should return 400 when Supabase signup fails', async () => {
    const { POST } = await import('../../app/api/auth/signup/route');
    const mockSupabaseClient = {
      auth: {
        signUp: jest.fn().mockResolvedValue({
          data: { user: null },
          error: { message: 'Email already registered' },
        }),
      },
    };

    (createServerSupabaseClient as jest.Mock).mockResolvedValue(
      mockSupabaseClient,
    );

    const requestBody = {
      email: 'existing@example.com',
      password: 'password123',
      firstName: 'Existing',
      lastName: 'User',
      nuid: '001234998',
    };

    const req = new Request('http://localhost/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Email already registered');
  });

  it('should default to MEMBER role when roleId is not provided', async () => {
    const { POST } = await import('../../app/api/auth/signup/route');
    const mockSupabaseClient = {
      auth: {
        signUp: jest.fn().mockResolvedValue({
          data: {
            user: {
              id: 'test-supabase-auth-id-456',
              email: 'member@example.com',
            },
          },
          error: null,
        }),
      },
    };

    (createServerSupabaseClient as jest.Mock).mockResolvedValue(
      mockSupabaseClient,
    );

    const requestBody = {
      email: 'member@example.com',
      password: 'password123',
      firstName: 'Member',
      lastName: 'User',
      nuid: '001234996',
      // roleId not provided
    };

    const req = new Request('http://localhost/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.user.roleId).toBe(signupTestRoleId);
    expect(UsersService.getRoleIdByRoleType).toHaveBeenCalledWith(
      RoleType.MEMBER,
    );
  });
});
