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

const USERS_SERVICE_TEST_NUIDS = [
  '001234567',
  '001234568',
  '001234570',
  '001234571',
];

async function cleanupUsersAndAttendanceByNuids(nuids: string[]) {
  const users = await prisma.user.findMany({
    where: { nuid: { in: nuids } },
    select: { userId: true },
  });

  if (users.length === 0) return;

  const userIds = users.map(({ userId }) => userId);

  await prisma.request.deleteMany({
    where: {
      attendance: {
        userId: { in: userIds },
      },
    },
  });

  await prisma.attendance.deleteMany({
    where: {
      userId: { in: userIds },
    },
  });

  await prisma.user.deleteMany({
    where: {
      userId: { in: userIds },
    },
  });
}

describe('UsersService', () => {
  let testRoleId: string;

  beforeAll(async () => {
    // Clean up any leftover data from previous runs
    await cleanupUsersAndAttendanceByNuids(USERS_SERVICE_TEST_NUIDS);

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
    await cleanupUsersAndAttendanceByNuids(USERS_SERVICE_TEST_NUIDS);
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

describe('UsersController.createUser', () => {
  let createUserTestRoleId: string;

  // Every nuid this block creates shares this prefix, so cleanup can match on it.
  const NUID_PREFIX = '0020000';
  let nuidCounter = 0;

  // userId, nuid and email are all unique, so each created user needs its own.
  const freshIdentity = () => {
    nuidCounter += 1;
    const n = String(nuidCounter).padStart(2, '0');
    return {
      userId: `create-user-test-id-${n}`,
      nuid: `${NUID_PREFIX}${n}`,
      email: `create-user-${n}@northeastern.edu`,
    };
  };

  const postCreateUser = (body: unknown) =>
    UsersController.createUser(
      new Request('http://localhost/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }),
    );

  // A complete, valid body. Spread and override per test.
  const validBody = (overrides: Record<string, unknown> = {}) => ({
    ...freshIdentity(),
    firstName: 'Valid',
    lastName: 'Body',
    ...overrides,
  });

  // routed through the shared helper so dependent rows go first
  const cleanupThisBlock = async () => {
    const stale = await prisma.user.findMany({
      where: { nuid: { startsWith: NUID_PREFIX } },
      select: { nuid: true },
    });
    await cleanupUsersAndAttendanceByNuids(stale.map(({ nuid }) => nuid));
  };

  beforeAll(async () => {
    await cleanupThisBlock();
    const role = await prisma.role.create({ data: { roleType: 'MEMBER' } });
    createUserTestRoleId = role.roleId;
  });

  afterAll(async () => {
    await cleanupThisBlock();
    await UsersService.deleteRole(createUserTestRoleId);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    (UsersService.getRoleIdByRoleType as jest.Mock).mockResolvedValue(
      createUserTestRoleId,
    );
  });

  // --- rejected bodies ---------------------------------------------------

  it('rejects a body with no userId', async () => {
    const { userId: _userId, ...body } = validBody();
    const response = await postCreateUser(body);

    expect(response.status).toBe(400);
    // nothing was written. email is namespaced to this block, so unlike nuid
    // below it cannot collide with unrelated rows in the shared test database.
    expect(
      await prisma.user.findFirst({ where: { email: body.email } }),
    ).toBeNull();
  });

  it.each([
    ['too short', '00123456'],
    ['too long', '0012345678'],
    ['non-digits', '00123456a'],
    ['right length, all letters', 'abcdefghi'],
    ['empty', ''],
  ])('rejects a nuid that is %s', async (_label, nuid) => {
    const body = validBody({ nuid });
    const response = await postCreateUser(body);

    expect(response.status).toBe(400);
    // These nuids are deliberately outside this block's namespace, and the
    // shared test database already contains unrelated rows with values like
    // ''. Assert on the userId we generated, which is unique to this request.
    expect(
      await prisma.user.findUnique({ where: { userId: body.userId } }),
    ).toBeNull();
  });

  it('accepts a nuid with a leading zero as a string', async () => {
    // guards against the regex being swapped for a numeric check
    const body = validBody();
    const response = await postCreateUser(body);

    expect(response.status).toBe(201);
    expect(body.nuid.startsWith('0')).toBe(true);
    expect((await response.json()).nuid).toBe(body.nuid);
  });

  it('rejects a body missing firstName', async () => {
    const { firstName: _firstName, ...body } = validBody();
    expect((await postCreateUser(body)).status).toBe(400);
  });

  it('rejects a body missing lastName', async () => {
    const { lastName: _lastName, ...body } = validBody();
    expect((await postCreateUser(body)).status).toBe(400);
  });

  it('rejects an empty firstName or lastName', async () => {
    expect((await postCreateUser(validBody({ firstName: '' }))).status).toBe(400);
    expect((await postCreateUser(validBody({ lastName: '' }))).status).toBe(400);
  });

  // --- field stripping ---------------------------------------------------

  it('ignores server-owned fields sent by the client', async () => {
    const response = await postCreateUser(
      validBody({
        // all of these are the server's decision, not the caller's
        roleType: RoleType.SUPER_ADMIN,
        isVotingMember: true,
        supabaseAuthId: 'injected-supabase-auth-id',
        deletedAt: new Date().toISOString(),
      }),
    );

    expect(response.status).toBe(201);
    const data = await response.json();

    expect(data.roleType).toBe(RoleType.MEMBER);
    expect(data.isVotingMember).toBe(false);
    expect(data.supabaseAuthId).toBeNull();
    expect(data.deletedAt).toBeNull();

    // and the same once read back from the database
    const stored = await prisma.user.findUnique({
      where: { userId: data.userId },
    });
    expect(stored?.roleType).toBe(RoleType.MEMBER);
    expect(stored?.isVotingMember).toBe(false);
    expect(stored?.supabaseAuthId).toBeNull();
  });

  it('ignores fields that are not columns at all', async () => {
    const response = await postCreateUser(
      validBody({ notAColumn: 'should be dropped' }),
    );

    expect(response.status).toBe(201);
    expect(await response.json()).not.toHaveProperty('notAColumn');
  });

  it('overrides a client-supplied roleId with the MEMBER role', async () => {
    const otherRole = await prisma.role.create({
      data: { roleType: 'SUPER_ADMIN' },
    });

    const body = validBody({ roleId: otherRole.roleId });

    try {
      const response = await postCreateUser(body);

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.roleId).toBe(createUserTestRoleId);
      expect(data.roleId).not.toBe(otherRole.roleId);
    } finally {
      // the created user holds a FK to createUserTestRoleId, not otherRole,
      // but clear it anyway so otherRole can be deleted cleanly
      await prisma.user.deleteMany({ where: { nuid: body.nuid } });
      await UsersService.deleteRole(otherRole.roleId);
    }
  });

  // --- password ----------------------------------------------------------

  it('preserves a password when one is supplied', async () => {
    const response = await postCreateUser(
      validBody({ password: 'a-supplied-password' }),
    );

    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data.password).toBe('a-supplied-password');

    const stored = await prisma.user.findUnique({
      where: { userId: data.userId },
    });
    expect(stored?.password).toBe('a-supplied-password');
  });

  it.each([
    ['omitted', {}],
    ['explicitly null', { password: null }],
  ])('stores a null password when it is %s', async (_label, passwordField) => {
    const response = await postCreateUser(
      validBody({ ...passwordField }),
    );

    expect(response.status).toBe(201);
    expect((await response.json()).password).toBeNull();
  });

  // --- happy path --------------------------------------------------------

  it('returns 201 and preserves every caller-owned field', async () => {
    const body = validBody();
    const response = await postCreateUser(body);

    expect(response.status).toBe(201);
    const data = await response.json();

    expect(data.userId).toBe(body.userId);
    expect(data.nuid).toBe(body.nuid);
    expect(data.email).toBe(body.email);
    expect(data.firstName).toBe(body.firstName);
    expect(data.lastName).toBe(body.lastName);

    // server-decided fields are present on the response
    expect(data.roleId).toBe(createUserTestRoleId);
    expect(data.roleType).toBe(RoleType.MEMBER);
    expect(data.isVotingMember).toBe(false);
    expect(data.createdAt).toBeDefined();
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
