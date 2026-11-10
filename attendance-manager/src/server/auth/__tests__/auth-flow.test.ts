import { prisma } from '@/server/db/prisma';
import { requireAuth } from '@/server/auth/api-auth';
import { sgauthSession } from '@/test/helpers';

jest.setTimeout(20000);

const mockGetSession = jest.fn();
jest.mock('@nusgaops/sgauth', () => ({
  ...jest.requireActual('@nusgaops/sgauth'),
  createSgauthClient: () => ({ getSession: () => mockGetSession() }),
}));
jest.mock('next/headers', () => ({ headers: async () => new Headers() }));

const FLOW_SGAUTH = 'test-sgauth-id-flow';
const FLOW_EMAIL = 'flow@example.com';
const FLOW_NUID = '009876543';

function signInAs(id: string, positions: string[], email = FLOW_EMAIL) {
  mockGetSession.mockResolvedValue(
    sgauthSession({ id, email, name: 'Flow User', positions }),
  );
}

/**
 * The whole sign-in flow through SGAuth: a first sign-in with no portal
 * profile, giving an NUID, then a normal signed-in session, then sign-out.
 * What anyone may do comes from their SGAuth positions alone.
 */
describe('SGAuth sign-in flow', () => {
  async function me() {
    const { GET } = await import('@/app/api/users/me/route');
    return GET();
  }

  async function register(body: unknown) {
    const { POST } = await import('@/app/api/auth/register/route');
    return POST(
      new Request('http://localhost/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }),
    );
  }

  beforeAll(async () => {
    await prisma.user.deleteMany({
      where: { OR: [{ sgauthUserId: FLOW_SGAUTH }, { nuid: FLOW_NUID }] },
    });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { sgauthUserId: FLOW_SGAUTH } });
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('walks a new senator from first sign-in to sign-out', async () => {
    // 1. Signed out: nothing.
    mockGetSession.mockResolvedValue(null);
    expect((await me()).status).toBe(401);

    // 2. Signed in to SGAuth with a seat, no profile yet: asked for an NUID.
    signInAs(FLOW_SGAUTH, ['senator']);
    const unregistered = await me();
    expect(unregistered.status).toBe(404);
    expect(await unregistered.json()).toMatchObject({
      status: 'unregistered',
      email: FLOW_EMAIL,
    });

    // 3. Gives their NUID.
    const created = await register({
      nuid: FLOW_NUID,
      firstName: 'Flow',
      lastName: 'User',
    });
    expect(created.status).toBe(201);

    // 4. Signed in with a profile; capabilities come from the position.
    const profile = await me();
    expect(profile.status).toBe(200);
    const { user } = await profile.json();
    expect(user.email).toBe(FLOW_EMAIL);
    expect(user.capabilities.sort()).toEqual(['roster', 'vote']);
    expect(user.nuid).toBeUndefined();

    const stored = await prisma.user.findUnique({
      where: { sgauthUserId: FLOW_SGAUTH },
    });
    expect(stored?.positionKeys).toEqual(['senator']);

    // 5. Signed out of SGAuth (or revoked there): every route is closed again.
    mockGetSession.mockResolvedValue(null);
    expect((await me()).status).toBe(401);
    expect((await requireAuth()).error?.status).toBe(401);
  });

  it('follows the position when it changes', async () => {
    signInAs(FLOW_SGAUTH, ['parliamentarian']);
    const { user } = await (await me()).json();
    expect(user.capabilities).toEqual(['roster']);
    const stored = await prisma.user.findUnique({
      where: { sgauthUserId: FLOW_SGAUTH },
    });
    expect(stored?.positionKeys).toEqual(['parliamentarian']);
  });

  it('lets staff in without a profile', async () => {
    signInAs(
      'test-sgauth-id-flow-speaker',
      ['speaker-of-the-senate'],
      'speaker@example.com',
    );
    const response = await me();
    expect(response.status).toBe(200);
    const { user } = await response.json();
    expect(user.userId).toBeNull();
    expect(user.capabilities).toContain('manageAttendance');
  });

  it('does not let staff off the roster create a profile', async () => {
    signInAs(
      'test-sgauth-id-flow-speaker',
      ['speaker-of-the-senate'],
      'speaker@example.com',
    );
    const response = await register({
      nuid: '009876544',
      firstName: 'Speaker',
      lastName: 'Flow',
    });
    expect(response.status).toBe(403);
  });

  it('answers 403 to someone no position gives access', async () => {
    signInAs(
      'test-sgauth-id-flow-none',
      ['t-shirt-team-member'],
      'none@example.com',
    );
    const response = await me();
    expect(response.status).toBe(403);
    expect((await response.json()).status).toBe('no-access');
  });

  it('sends a profile with no SGAuth positions to the no-access screen', async () => {
    const NOPOS_SGAUTH = 'test-sgauth-id-flow-nopositions';
    const NOPOS_NUID = '009876545';
    await prisma.user.deleteMany({ where: { nuid: NOPOS_NUID } });
    await prisma.user.create({
      data: {
        sgauthUserId: NOPOS_SGAUTH,
        nuid: NOPOS_NUID,
        email: 'flow-nopositions@example.com',
        firstName: 'No',
        lastName: 'Positions',
      },
    });
    try {
      signInAs(NOPOS_SGAUTH, [], 'flow-nopositions@example.com');
      const response = await me();
      expect(response.status).toBe(403);
      expect((await response.json()).status).toBe('no-access');
      expect((await requireAuth()).error?.status).toBe(403);
    } finally {
      await prisma.user.deleteMany({ where: { nuid: NOPOS_NUID } });
    }
  });

  describe('a removed (soft-deleted) profile', () => {
    const REMOVED_SGAUTH = 'test-sgauth-id-flow-removed';
    const REMOVED_EMAIL = 'flow-removed@example.com';
    const REMOVED_NUID = '009876544';

    beforeEach(async () => {
      await prisma.user.deleteMany({ where: { nuid: REMOVED_NUID } });
    });

    afterAll(async () => {
      await prisma.user.deleteMany({ where: { nuid: REMOVED_NUID } });
    });

    const removedProfile = (linked: boolean) =>
      prisma.user.create({
        data: {
          sgauthUserId: linked ? REMOVED_SGAUTH : null,
          nuid: REMOVED_NUID,
          email: REMOVED_EMAIL,
          firstName: 'Removed',
          lastName: 'Member',
          deletedAt: new Date(),
        },
      });

    it('comes back when SGAuth still puts them on the roster', async () => {
      const { userId } = await removedProfile(true);
      signInAs(REMOVED_SGAUTH, ['senator'], REMOVED_EMAIL);

      const response = await me();
      expect(response.status).toBe(200);
      expect((await response.json()).user.userId).toBe(userId);
      const stored = await prisma.user.findUnique({ where: { userId } });
      expect(stored?.deletedAt).toBeNull();
    });

    it('comes back on first SGAuth sign-in too, linked by email', async () => {
      const { userId } = await removedProfile(false);
      signInAs(REMOVED_SGAUTH, ['senator'], REMOVED_EMAIL.toUpperCase());

      expect((await (await me()).json()).user.userId).toBe(userId);
      const stored = await prisma.user.findUnique({ where: { userId } });
      expect(stored?.sgauthUserId).toBe(REMOVED_SGAUTH);
      expect(stored?.deletedAt).toBeNull();
    });

    it('stays removed for staff, who sign in without it', async () => {
      const { userId } = await removedProfile(true);
      signInAs(REMOVED_SGAUTH, ['speaker-of-the-senate'], REMOVED_EMAIL);

      const response = await me();
      expect(response.status).toBe(200);
      expect((await response.json()).user.userId).toBeNull();
      const stored = await prisma.user.findUnique({ where: { userId } });
      expect(stored?.deletedAt).not.toBeNull();
    });

    it('stays removed, with no access, for someone no position covers', async () => {
      const { userId } = await removedProfile(true);
      signInAs(REMOVED_SGAUTH, [], REMOVED_EMAIL);

      expect((await me()).status).toBe(403);
      const stored = await prisma.user.findUnique({ where: { userId } });
      expect(stored?.deletedAt).not.toBeNull();
    });
  });

  it('rejects an invalid NUID', async () => {
    signInAs('test-sgauth-id-flow-2', ['senator'], 'flow2@example.com');
    const response = await register({
      nuid: '12345',
      firstName: 'Flow',
      lastName: 'Two',
    });
    expect(response.status).toBe(400);
  });
});
