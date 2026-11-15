import { prisma } from '@/server/db/prisma';
import { signInAsActor, testActor, uniqueUserFields } from '@/test/helpers';
import { GET as getUser } from '@/app/api/users/[id]/route';
import { GET as listNames } from '@/app/api/users/only-name/route';
import { GET as getByNuid } from '@/app/api/users/get-user-by-nuid/[nuid]/route';
import { GET as getByEmail } from '@/app/api/users/get-user-by-email/[email]/route';
import { GET as validateNuid } from '@/app/api/users/validate-nuid/route';

jest.setTimeout(20000);

// User lookups: names for anyone signed in, full profiles for the member
// themselves or staff, NUID and email lookups for whoever takes attendance.

let member: { userId: string; nuid: string; email: string };
let other: { userId: string; nuid: string; email: string };

const asMember = () =>
  signInAsActor(
    testActor({ userId: member.userId, capabilities: ['roster', 'vote'] }),
  );
const asManager = () =>
  signInAsActor(
    testActor({ userId: null, capabilities: ['manageAttendance'] }),
  );
const req = (url = 'http://localhost/api/users') => new Request(url);

beforeAll(async () => {
  const create = (lastName: string) =>
    prisma.user.create({
      data: {
        ...uniqueUserFields(),
        firstName: 'Lookup',
        lastName,
        positionKeys: ['senator'],
      },
    });
  member = await create('RouteMember');
  other = await create('RouteOther');
});

afterEach(() => jest.restoreAllMocks());

afterAll(async () => {
  await prisma.user.deleteMany({
    where: { userId: { in: [member.userId, other.userId] } },
  });
});

describe('GET /api/users/[id]', () => {
  const get = (userId: string) =>
    getUser(req(), { params: Promise.resolve({ id: userId }) });

  it('returns 401 when signed out', async () => {
    signInAsActor(null);
    expect((await get(member.userId)).status).toBe(401);
  });

  it('returns a member their own profile without SGAuth fields', async () => {
    asMember();
    const response = await get(member.userId);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.userId).toBe(member.userId);
    expect(body.isSenator).toBe(true);
    expect(body).not.toHaveProperty('sgauthUserId');
    expect(body).not.toHaveProperty('positionKeys');
  });

  it("returns 403 for someone else's profile", async () => {
    asMember();
    expect((await get(other.userId)).status).toBe(403);
  });

  it("lets staff read anyone's", async () => {
    asManager();
    expect((await get(other.userId)).status).toBe(200);
  });
});

describe('GET /api/users/only-name', () => {
  const find = (users: any[], userId: string) =>
    users.find((u) => u.userId === userId);

  it('returns 401 when signed out', async () => {
    signInAsActor(null);
    expect((await listNames()).status).toBe(401);
  });

  it('gives members names and seats only', async () => {
    asMember();
    const row = find(await (await listNames()).json(), other.userId);
    expect(row).toEqual({
      userId: other.userId,
      firstName: 'Lookup',
      lastName: 'RouteOther',
      isSenator: true,
    });
  });

  it('adds NUIDs for whoever takes attendance', async () => {
    asManager();
    const row = find(await (await listNames()).json(), other.userId);
    expect(row.nuid).toBe(other.nuid);
    expect(row).not.toHaveProperty('email');
  });
});

describe('lookups that need manageAttendance', () => {
  const lookups = [
    [
      'get-user-by-nuid',
      () => getByNuid(req(), { params: Promise.resolve({ nuid: other.nuid }) }),
    ],
    [
      'get-user-by-email',
      () =>
        getByEmail(req(), {
          params: Promise.resolve({ email: other.email }),
        }),
    ],
    [
      'validate-nuid',
      () =>
        validateNuid(
          req(
            `http://localhost/api/users/validate-nuid?nuid=${other.nuid}&firstName=Lookup&lastName=RouteOther`,
          ),
        ),
    ],
  ] as const;

  it.each(lookups)('%s: 401 when signed out', async (_name, call) => {
    signInAsActor(null);
    expect((await call()).status).toBe(401);
  });

  it.each(lookups)('%s: 403 for a member', async (_name, call) => {
    asMember();
    expect((await call()).status).toBe(403);
  });

  it.each(lookups)('%s: allowed for a manager', async (_name, call) => {
    asManager();
    expect((await call()).status).toBe(200);
  });
});
