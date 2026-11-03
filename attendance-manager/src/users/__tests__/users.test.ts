import { UsersService, isOnRoster } from '../users.service';
import { UsersController } from '../users.controller';
import { prisma } from '../../lib/prisma';
import { NextResponse } from 'next/server';
import {
  createTestGroup,
  deleteTestGroup,
  sgauthSession,
} from '@/utils/test-helpers';

jest.setTimeout(20000);

// SGAuth: every route resolves the signed-in user from this mock session.
const mockGetSession = jest.fn();
jest.mock('@nusgaops/sgauth', () => ({
  ...jest.requireActual('@nusgaops/sgauth'),
  createSgauthClient: () => ({ getSession: () => mockGetSession() }),
}));
jest.mock('next/headers', () => ({ headers: async () => new Headers() }));

const USERS_TEST_NUIDS = [
  '001234567',
  '001234568',
  '001234570',
  '001234571',
  '002000001',
  '002000002',
  '002000003',
  '002000004',
  '002000005',
  '002000006',
  '002000007',
  '002000008',
  '002000009',
  '002000010',
  '002000011',
  '002000012',
  '003000001',
  '004000001',
  '005000001',
  '006000001',
  '006000002',
];

const USERS_TEST_SGAUTH_IDS = [
  'test-sgauth-id-users-1',
  'test-sgauth-id-users-2',
  'test-sgauth-id-users-3',
  'test-sgauth-id-users-4',
  'test-sgauth-id-users-5',
  'test-sgauth-id-users-validate',
  'test-sgauth-id-users-route',
  'test-sgauth-id-users-eboard',
  'test-sgauth-id-users-signup-1',
  'test-sgauth-id-users-signup-2',
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

async function cleanupUsersBySgauthIds(sgauthUserIds: string[]) {
  const users = await prisma.user.findMany({
    where: { sgauthUserId: { in: sgauthUserIds } },
    select: { nuid: true },
  });

  await cleanupUsersAndAttendanceByNuids(users.map(({ nuid }) => nuid));
}

describe('UsersService', () => {
  let testRoleId: string;

  beforeAll(async () => {
    // Clean up any leftover data from previous runs
    await cleanupUsersAndAttendanceByNuids(USERS_TEST_NUIDS);
    await cleanupUsersBySgauthIds(USERS_TEST_SGAUTH_IDS);

    const role = await createTestGroup();
    testRoleId = role.roleId;

    await UsersService.createUser({
      userId: 'test-user-id-1',
      nuid: USERS_TEST_NUIDS[0],
      email: 'jdoe@northeastern.edu',
      firstName: 'John',
      lastName: 'Doe',
      positionKeys: [testRoleId],
    });
  });

  afterAll(async () => {
    await cleanupUsersAndAttendanceByNuids(USERS_TEST_NUIDS);
    await cleanupUsersBySgauthIds(USERS_TEST_SGAUTH_IDS);
    await deleteTestGroup(testRoleId);
  });

  it('keeps users who have not signed in since SGAuth on the roster', async () => {
    const roster = await UsersService.getRoster();
    expect(roster.some((user) => user.userId === 'test-user-id-1')).toBe(true);
  });

  it('puts a user on the roster by their recorded positions', async () => {
    const synced = { positionsSyncedAt: new Date() };
    expect(isOnRoster({ ...synced, positionKeys: ['senator'] })).toBe(true);
    expect(
      isOnRoster({
        ...synced,
        positionKeys: ['vice-president-of-campus-affairs'],
      }),
    ).toBe(true);
    expect(
      isOnRoster({ ...synced, positionKeys: ['speaker-of-the-senate'] }),
    ).toBe(false);
    expect(isOnRoster({ ...synced, positionKeys: [] })).toBe(false);
    expect(isOnRoster({ positionsSyncedAt: null, positionKeys: [] })).toBe(
      true,
    );
  });

  it('should create a new user', async () => {
    const newUser = await UsersService.createUser({
      userId: 'test-user-id-2',
      nuid: USERS_TEST_NUIDS[1],
      email: 'jdoe2@northeastern.edu',
      firstName: 'Jane',
      lastName: 'Doe',
      positionKeys: [testRoleId],
    });

    expect(newUser).toBeDefined();
    expect(newUser.email).toBe('jdoe2@northeastern.edu');
    expect(newUser.nuid).toBe(USERS_TEST_NUIDS[1]);
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
      nuid: USERS_TEST_NUIDS[2],
      email: 'jdoe3@northeastern.edu',
      firstName: 'Jane',
      lastName: 'Doe',
      positionKeys: [testRoleId],
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
      nuid: USERS_TEST_NUIDS[3],
      email: 'jdoe4@northeastern.edu',
      firstName: 'Jane',
      lastName: 'Doe',
      positionKeys: [testRoleId],
    });
    await UsersService.deleteUser(newUser.userId);
    const deletedUser = await UsersService.getUserById(newUser.userId);
    expect(deletedUser).toBeNull();
  });
});

describe('UsersController.createUser', () => {
  let createUserTestRoleId: string;

  let nuidCounter = 0;

  // userId, nuid and email are all unique, so each created user needs its own.
  const newNuid = () => {
    nuidCounter += 1;
    if (nuidCounter > USERS_TEST_NUIDS.length) {
      throw new Error(
        `Exhausted USERS_TEST_NUIDS after ${USERS_TEST_NUIDS.length} generated values`,
      );
    }
    return {
      userId: `create-user-test-id-${nuidCounter}`,
      nuid: USERS_TEST_NUIDS[nuidCounter - 1],
      email: `create-user-${nuidCounter}@northeastern.edu`,
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
    ...newNuid(),
    firstName: 'Valid',
    lastName: 'Body',
    ...overrides,
  });

  beforeAll(async () => {
    await cleanupUsersAndAttendanceByNuids(USERS_TEST_NUIDS);
    await cleanupUsersBySgauthIds(USERS_TEST_SGAUTH_IDS);
    const role = await createTestGroup();
    createUserTestRoleId = role.roleId;
  });

  afterAll(async () => {
    await cleanupUsersAndAttendanceByNuids(USERS_TEST_NUIDS);
    await cleanupUsersBySgauthIds(USERS_TEST_SGAUTH_IDS);
    await deleteTestGroup(createUserTestRoleId);
  });

  beforeEach(() => {
    jest.clearAllMocks();
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
    expect((await postCreateUser(validBody({ firstName: '' }))).status).toBe(
      400,
    );
    expect((await postCreateUser(validBody({ lastName: '' }))).status).toBe(
      400,
    );
  });

  // --- fields the caller may not set -------------------------------------

  it.each([
    ['password', { password: 'a-supplied-password' }],
    ['sgauthUserId', { sgauthUserId: 'someone-elses-sgauth-id' }],
    ['roleId', { roleId: 'eboard-role-id' }],
    ['positionKeys', { positionKeys: ['speaker-of-the-senate'] }],
  ])('rejects a body that sets %s', async (_label, field) => {
    const body = validBody(field);
    const response = await postCreateUser(body);

    expect(response.status).toBe(400);
    expect(
      await prisma.user.findUnique({ where: { userId: body.userId } }),
    ).toBeNull();
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
    expect(data.positionKeys).toEqual([]);
    expect(data.createdAt).toBeDefined();
  });
});

describe('UsersController.validateNuid', () => {
  let testRoleId: string;
  let testUserId: string;

  beforeAll(async () => {
    await cleanupUsersAndAttendanceByNuids(USERS_TEST_NUIDS);
    await cleanupUsersBySgauthIds(USERS_TEST_SGAUTH_IDS);
    const role = await createTestGroup();
    testRoleId = role.roleId;

    // Create a test user for validation
    const user = await UsersService.createUser({
      userId: 'test-user-id-validate-1',
      nuid: USERS_TEST_NUIDS[0],
      email: 'jdoe@northeastern.edu',
      firstName: 'John',
      lastName: 'Doe',
      positionKeys: [testRoleId],
    });
    testUserId = user.userId;
  });

  afterAll(async () => {
    await cleanupUsersAndAttendanceByNuids(USERS_TEST_NUIDS);
    await cleanupUsersBySgauthIds(USERS_TEST_SGAUTH_IDS);
    await deleteTestGroup(testRoleId);
  });

  it('should validate correct NUID and name combination', async () => {
    const response = await UsersController.validateNuid({
      nuid: USERS_TEST_NUIDS[0],
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
    expect(data.user.nuid).toBe(USERS_TEST_NUIDS[0]);
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
      nuid: USERS_TEST_NUIDS[0],
      firstName: 'Jane',
      lastName: 'Smith',
    });

    expect(response).toBeInstanceOf(NextResponse);
    const data = await response.json();
    expect(data.valid).toBe(false);
    expect(data.error).toBe('NUID does not match the provided name');
  });
});

// --- signed-in routes -------------------------------------------------------

function signInAs(id: string, email: string, positions: string[] = []) {
  mockGetSession.mockResolvedValue(sgauthSession({ id, email, positions }));
}

function signOut() {
  mockGetSession.mockResolvedValue(null);
}

function jsonRequest(url: string, method: string, body: unknown) {
  return new Request(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('signed-in user routes', () => {
  let memberRoleId: string;
  let memberId: string;
  let otherMemberId: string;
  let eboardId: string;

  const MEMBER_SGAUTH = USERS_TEST_SGAUTH_IDS[6];
  const OTHER_SGAUTH = USERS_TEST_SGAUTH_IDS[7];
  const EBOARD_SGAUTH = USERS_TEST_SGAUTH_IDS[8];

  beforeAll(async () => {
    await cleanupUsersAndAttendanceByNuids(USERS_TEST_NUIDS);
    await cleanupUsersBySgauthIds(USERS_TEST_SGAUTH_IDS);
    memberRoleId = (await createTestGroup()).roleId;

    memberId = (
      await prisma.user.create({
        data: {
          sgauthUserId: MEMBER_SGAUTH,
          nuid: USERS_TEST_NUIDS[16],
          email: 'member-route@example.com',
          firstName: 'Member',
          lastName: 'Route',
          positionKeys: [memberRoleId],
        },
      })
    ).userId;
    otherMemberId = (
      await prisma.user.create({
        data: {
          sgauthUserId: OTHER_SGAUTH,
          nuid: USERS_TEST_NUIDS[17],
          email: 'other-route@example.com',
          firstName: 'Other',
          lastName: 'Route',
          positionKeys: [memberRoleId],
        },
      })
    ).userId;
    eboardId = (
      await prisma.user.create({
        data: {
          sgauthUserId: EBOARD_SGAUTH,
          nuid: USERS_TEST_NUIDS[18],
          email: 'eboard-route@example.com',
          firstName: 'Eboard',
          lastName: 'Route',
          positionKeys: [memberRoleId],
        },
      })
    ).userId;
  });

  afterAll(async () => {
    await cleanupUsersAndAttendanceByNuids(USERS_TEST_NUIDS);
    await cleanupUsersBySgauthIds(USERS_TEST_SGAUTH_IDS);
    await prisma.user.deleteMany({
      where: {
        email: { in: ['legacy-route@example.com', 'new-route@example.com'] },
      },
    });
    await deleteTestGroup(memberRoleId);
  });

  describe('GET /api/users/me', () => {
    it('returns 401 when signed out', async () => {
      const { GET } = await import('../../app/api/users/me/route');
      signOut();
      expect((await GET()).status).toBe(401);
    });

    it('returns the profile, without NUID, and what they may do', async () => {
      const { GET } = await import('../../app/api/users/me/route');
      signInAs(MEMBER_SGAUTH, 'member-route@example.com', ['senator']);
      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.user.userId).toBe(memberId);
      expect(data.user.capabilities.sort()).toEqual(['roster', 'vote']);
      expect(data.user.nuid).toBeUndefined();
    });

    it('links an existing row by email on first SGAuth sign-in', async () => {
      const { GET } = await import('../../app/api/users/me/route');
      const legacy = await prisma.user.create({
        data: {
          nuid: USERS_TEST_NUIDS[15],
          email: 'legacy-route@example.com',
          firstName: 'Legacy',
          lastName: 'Route',
          positionKeys: [memberRoleId],
        },
      });
      signInAs(USERS_TEST_SGAUTH_IDS[5], 'Legacy-Route@Example.com', [
        'senator',
      ]);
      const response = await GET();

      expect(response.status).toBe(200);
      expect((await response.json()).user.userId).toBe(legacy.userId);
      const stored = await prisma.user.findUnique({
        where: { userId: legacy.userId },
      });
      expect(stored?.sgauthUserId).toBe(USERS_TEST_SGAUTH_IDS[5]);
    });

    it('never relinks a row already linked to another SGAuth account', async () => {
      const { GET } = await import('../../app/api/users/me/route');
      signInAs('attacker-sgauth-id', 'member-route@example.com', ['senator']);
      const response = await GET();

      expect(response.status).toBe(404);
      const stored = await prisma.user.findUnique({
        where: { userId: memberId },
      });
      expect(stored?.sgauthUserId).toBe(MEMBER_SGAUTH);
    });
  });

  describe('POST /api/auth/register', () => {
    const register = async (body: unknown) => {
      const { POST } = await import('../../app/api/auth/register/route');
      return POST(
        jsonRequest('http://localhost/api/auth/register', 'POST', body),
      );
    };

    it('returns 401 when signed out', async () => {
      signOut();
      expect(
        (
          await register({
            nuid: USERS_TEST_NUIDS[14],
            firstName: 'New',
            lastName: 'Route',
          })
        ).status,
      ).toBe(401);
    });

    it('rejects positions in the body instead of honouring them', async () => {
      signInAs(USERS_TEST_SGAUTH_IDS[9], 'new-route@example.com', ['senator']);
      const response = await register({
        nuid: USERS_TEST_NUIDS[14],
        firstName: 'New',
        lastName: 'Route',
        positionKeys: ['speaker-of-the-senate'],
      });
      expect(response.status).toBe(400);
    });

    it('creates a profile keyed by the session, with its email and positions', async () => {
      signInAs(USERS_TEST_SGAUTH_IDS[9], 'new-route@example.com', ['senator']);
      const response = await register({
        nuid: USERS_TEST_NUIDS[14],
        firstName: 'New',
        lastName: 'Route',
      });
      expect(response.status).toBe(201);

      const created = await prisma.user.findUnique({
        where: { sgauthUserId: USERS_TEST_SGAUTH_IDS[9] },
      });
      expect(created?.email).toBe('new-route@example.com');
      expect(created?.positionKeys).toEqual(['senator']);
    });

    it('returns 409 for someone who already has a profile', async () => {
      signInAs(MEMBER_SGAUTH, 'member-route@example.com', ['senator']);
      const response = await register({
        nuid: USERS_TEST_NUIDS[13],
        firstName: 'Member',
        lastName: 'Route',
      });
      expect(response.status).toBe(409);
    });
  });

  describe('PUT /api/users/[id]', () => {
    const put = async (id: string, body: unknown) => {
      const { PUT } = await import('../../app/api/users/[id]/route');
      return PUT(jsonRequest(`http://localhost/api/users/${id}`, 'PUT', body), {
        params: Promise.resolve({ id }),
      });
    };

    it('returns 401 when signed out', async () => {
      signOut();
      expect((await put(memberId, { firstName: 'Hacked' })).status).toBe(401);
    });

    it('forbids anyone but a superadmin, even a member editing themselves', async () => {
      signInAs(MEMBER_SGAUTH, 'member-route@example.com', ['senator']);
      expect((await put(memberId, { firstName: 'Hacked' })).status).toBe(403);
      signInAs('test-sgauth-id-users-speaker', 'speaker@example.com', [
        'speaker-of-the-senate',
      ]);
      expect((await put(memberId, { firstName: 'Hacked' })).status).toBe(403);
      const stored = await prisma.user.findUnique({
        where: { userId: memberId },
      });
      expect(stored?.firstName).toBe('Member');
    });

    it('rejects positionKeys even from a superadmin', async () => {
      signInAs(EBOARD_SGAUTH, 'eboard-route@example.com', [
        'digital-innovation-manager',
      ]);
      expect(
        (await put(memberId, { positionKeys: ['speaker-of-the-senate'] }))
          .status,
      ).toBe(400);
    });

    it('rejects sgauthUserId even from a superadmin', async () => {
      signInAs(EBOARD_SGAUTH, 'eboard-route@example.com', [
        'digital-innovation-manager',
      ]);
      expect(
        (await put(otherMemberId, { sgauthUserId: EBOARD_SGAUTH })).status,
      ).toBe(400);
      const stored = await prisma.user.findUnique({
        where: { userId: otherMemberId },
      });
      expect(stored?.sgauthUserId).toBe(OTHER_SGAUTH);
    });

    it('lets a superadmin change a name', async () => {
      signInAs(EBOARD_SGAUTH, 'eboard-route@example.com', [
        'digital-innovation-manager',
      ]);
      const response = await put(otherMemberId, { firstName: 'Renamed' });
      expect(response.status).toBe(200);
      expect((await response.json()).firstName).toBe('Renamed');
    });
  });

  describe('member lookups (staff capabilities)', () => {
    it('GET /api/users is Executive Board only', async () => {
      const { GET } = await import('../../app/api/users/route');
      signOut();
      expect((await GET()).status).toBe(401);
      signInAs(MEMBER_SGAUTH, 'member-route@example.com', ['senator']);
      expect((await GET()).status).toBe(403);
      signInAs(EBOARD_SGAUTH, 'eboard-route@example.com', [
        'digital-innovation-manager',
      ]);
      expect((await GET()).status).toBe(200);
    });

    it('GET /api/users/get-user-by-nuid is Executive Board only', async () => {
      const { GET } =
        await import('../../app/api/users/get-user-by-nuid/[nuid]/route');
      const call = () =>
        GET(new Request('http://localhost'), {
          params: Promise.resolve({ nuid: USERS_TEST_NUIDS[17] }),
        });
      signInAs(MEMBER_SGAUTH, 'member-route@example.com', ['senator']);
      expect((await call()).status).toBe(403);
      signInAs(EBOARD_SGAUTH, 'eboard-route@example.com', [
        'digital-innovation-manager',
      ]);
      expect((await (await call()).json()).userId).toBe(otherMemberId);
    });

    it('GET /api/users/[id] is self or Executive Board', async () => {
      const { GET } = await import('../../app/api/users/[id]/route');
      const call = (id: string) =>
        GET(new Request('http://localhost'), {
          params: Promise.resolve({ id }),
        });
      signInAs(MEMBER_SGAUTH, 'member-route@example.com', ['senator']);
      expect((await call(memberId)).status).toBe(200);
      expect((await call(otherMemberId)).status).toBe(403);
    });
  });

  describe('PUT /api/users/attendance_update', () => {
    let meetingId: string;

    beforeAll(async () => {
      const date = new Date('2099-03-02T18:00:00.000Z');
      const { semesterIdFor } = await import('@/utils/test-helpers');
      meetingId = (
        await prisma.meeting.create({
          data: {
            name: 'Attendance update route meeting',
            date,
            startTime: date,
            endTime: new Date(date.getTime() + 60 * 60 * 1000),
            notes: '',
            type: 'REGULAR',
            semesterId: await semesterIdFor(date),
          },
        })
      ).meetingId;
    });

    afterAll(async () => {
      await prisma.attendance.deleteMany({ where: { meetingId } });
      await prisma.meeting.delete({ where: { meetingId } });
    });

    const update = async (body: unknown) => {
      const { PUT } =
        await import('../../app/api/users/attendance_update/route');
      return PUT(
        jsonRequest(
          'http://localhost/api/users/attendance_update',
          'PUT',
          body,
        ),
      );
    };

    it('returns 401 when signed out', async () => {
      signOut();
      expect(
        (await update({ userId: memberId, meetingId, status: 'PRESENT' }))
          .status,
      ).toBe(401);
    });

    it('lets a member mark only their own attendance PENDING', async () => {
      signInAs(MEMBER_SGAUTH, 'member-route@example.com', ['senator']);
      expect(
        (await update({ userId: memberId, meetingId, status: 'PENDING' }))
          .status,
      ).toBe(200);
      expect(
        (
          await update({
            userId: memberId,
            meetingId,
            status: 'EXCUSED_ABSENCE',
          })
        ).status,
      ).toBe(403);
      expect(
        (
          await update({
            userId: otherMemberId,
            meetingId,
            status: 'UNEXCUSED_ABSENCE',
          })
        ).status,
      ).toBe(403);
    });

    it('does not let a member clear a recorded absence', async () => {
      signInAs(EBOARD_SGAUTH, 'eboard-route@example.com', [
        'digital-innovation-manager',
      ]);
      expect(
        (
          await update({
            userId: memberId,
            meetingId,
            status: 'UNEXCUSED_ABSENCE',
          })
        ).status,
      ).toBe(200);

      signInAs(MEMBER_SGAUTH, 'member-route@example.com', ['senator']);
      expect(
        (await update({ userId: memberId, meetingId, status: 'PENDING' }))
          .status,
      ).toBe(409);
    });

    it('rejects a status outside the enum', async () => {
      signInAs(EBOARD_SGAUTH, 'eboard-route@example.com', [
        'digital-innovation-manager',
      ]);
      expect(
        (
          await update({
            userId: memberId,
            meetingId,
            status: 'PENDING_ABSENCE',
          })
        ).status,
      ).toBe(400);
    });
  });
});
