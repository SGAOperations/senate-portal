import {
  getAuthenticatedUser,
  requireAnyCapability,
  requireAuth,
  requireCapability,
  requireSelfOrCapability,
} from '../api-auth';
import { prisma } from '@/server/db/prisma';
import { sgauthSession } from '@/test/helpers';

jest.setTimeout(20000);

const mockGetSession = jest.fn();
jest.mock('@nusgaops/sgauth', () => ({
  ...jest.requireActual('@nusgaops/sgauth'),
  createSgauthClient: () => ({ getSession: () => mockGetSession() }),
}));
jest.mock('next/headers', () => ({ headers: async () => new Headers() }));

const SENATOR_SGAUTH = 'test-sgauth-id-api-senator';
const OTHER_SGAUTH = 'test-sgauth-id-api-other';
const SPEAKER_SGAUTH = 'test-sgauth-id-api-speaker';

function signInAs(id: string, positions: string[]) {
  mockGetSession.mockResolvedValue(
    sgauthSession({ id, email: `${id}@example.com`, positions }),
  );
}

describe('API Auth Utilities', () => {
  let senatorId: string;
  let otherId: string;

  beforeAll(async () => {
    await prisma.user.deleteMany({
      where: { sgauthUserId: { in: [SENATOR_SGAUTH, OTHER_SGAUTH] } },
    });
    senatorId = (
      await prisma.user.create({
        data: {
          sgauthUserId: SENATOR_SGAUTH,
          nuid: '001234888',
          email: 'apitest@example.com',
          firstName: 'API',
          lastName: 'Test',
        },
      })
    ).userId;
    otherId = (
      await prisma.user.create({
        data: {
          sgauthUserId: OTHER_SGAUTH,
          nuid: '001234889',
          email: 'apiother@example.com',
          firstName: 'API',
          lastName: 'Other',
        },
      })
    ).userId;
  });

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: { userId: { in: [senatorId, otherId] } },
    });
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('requireAuth', () => {
    it('returns the actor, profile and capabilities when signed in', async () => {
      signInAs(SENATOR_SGAUTH, ['senator']);
      const auth = await requireAuth();

      expect(auth.error).toBeNull();
      if (auth.error) return;
      expect(auth.actor.user?.userId).toBe(senatorId);
      expect([...auth.actor.capabilities].sort()).toEqual(['roster', 'vote']);
    });

    it('records the session positions on the profile', async () => {
      signInAs(SENATOR_SGAUTH, ['senator', 'parliamentarian']);
      await requireAuth();
      const stored = await prisma.user.findUnique({
        where: { userId: senatorId },
      });
      expect(stored?.positionKeys).toEqual(['parliamentarian', 'senator']);
      expect(stored?.positionsSyncedAt).not.toBeNull();
    });

    it('lets staff with no profile through, with user null', async () => {
      signInAs(SPEAKER_SGAUTH, ['speaker-of-the-senate']);
      const auth = await requireAuth();

      expect(auth.error).toBeNull();
      if (auth.error) return;
      expect(auth.actor.user).toBeNull();
      expect(auth.actor.capabilities.has('manageAttendance')).toBe(true);
      expect(auth.actor.capabilities.has('vote')).toBe(false);
    });

    it('returns 401 when signed out', async () => {
      mockGetSession.mockResolvedValue(null);
      expect((await requireAuth()).error?.status).toBe(401);
    });

    it('returns 403 for someone no position gives access', async () => {
      signInAs('test-sgauth-id-api-nobody', ['t-shirt-team-member']);
      expect((await requireAuth()).error?.status).toBe(403);
    });

    it('restores a removed profile while SGAuth keeps them on the roster', async () => {
      await prisma.user.update({
        where: { userId: otherId },
        data: { deletedAt: new Date() },
      });
      try {
        signInAs(OTHER_SGAUTH, ['senator']);
        const auth = await requireAuth();
        expect(auth.error).toBeNull();
        if (auth.error) return;
        expect(auth.actor.user?.userId).toBe(otherId);
      } finally {
        await prisma.user.update({
          where: { userId: otherId },
          data: { deletedAt: null },
        });
      }
    });

    it('keeps a removed profile removed for someone off the roster', async () => {
      await prisma.user.update({
        where: { userId: otherId },
        data: { deletedAt: new Date() },
      });
      try {
        signInAs(OTHER_SGAUTH, []);
        expect((await requireAuth()).error?.status).toBe(403);
        const stored = await prisma.user.findUnique({
          where: { userId: otherId },
        });
        expect(stored?.deletedAt).not.toBeNull();
      } finally {
        await prisma.user.update({
          where: { userId: otherId },
          data: { deletedAt: null },
        });
      }
    });

    it('returns 401 when the session lookup throws', async () => {
      mockGetSession.mockRejectedValue(new Error('config'));
      const errorSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      try {
        expect((await requireAuth()).error?.status).toBe(401);
      } finally {
        errorSpy.mockRestore();
      }
    });
  });

  describe('requireCapability', () => {
    it('returns 403 without the capability', async () => {
      signInAs(SENATOR_SGAUTH, ['senator']);
      expect((await requireCapability('manageAttendance')).error?.status).toBe(
        403,
      );
    });

    it('allows a holder of the capability', async () => {
      signInAs(SPEAKER_SGAUTH, ['speaker-of-the-senate']);
      expect((await requireCapability('manageAttendance')).error).toBeNull();
    });

    it('lets a superadmin manage but not vote', async () => {
      signInAs('test-sgauth-id-api-admin', ['digital-innovation-manager']);
      expect((await requireCapability('hostVotes')).error).toBeNull();
      expect((await requireCapability('vote')).error?.status).toBe(403);
    });
  });

  describe('requireAnyCapability', () => {
    it('allows a holder of any listed capability', async () => {
      signInAs(SPEAKER_SGAUTH, ['speaker-of-the-senate']);
      expect(
        (await requireAnyCapability('vote', 'manageAttendance')).error,
      ).toBeNull();
    });

    it('returns 403 without any of them', async () => {
      signInAs(SENATOR_SGAUTH, ['senator']);
      expect(
        (await requireAnyCapability('manageAttendance', 'readRecords')).error
          ?.status,
      ).toBe(403);
    });

    it('returns 401 when signed out', async () => {
      mockGetSession.mockResolvedValue(null);
      expect((await requireAnyCapability('vote')).error?.status).toBe(401);
    });
  });

  describe('requireSelfOrCapability', () => {
    it('allows a member their own record', async () => {
      signInAs(SENATOR_SGAUTH, ['senator']);
      expect(
        (await requireSelfOrCapability(senatorId, 'manageAttendance')).error,
      ).toBeNull();
    });

    it("returns 403 for someone else's record", async () => {
      signInAs(SENATOR_SGAUTH, ['senator']);
      expect(
        (await requireSelfOrCapability(otherId, 'manageAttendance')).error
          ?.status,
      ).toBe(403);
    });

    it("allows staff with the capability anyone's record", async () => {
      signInAs(SPEAKER_SGAUTH, ['speaker-of-the-senate']);
      expect(
        (await requireSelfOrCapability(otherId, 'manageAttendance')).error,
      ).toBeNull();
    });

    it('returns 401 when signed out', async () => {
      mockGetSession.mockResolvedValue(null);
      expect(
        (await requireSelfOrCapability(senatorId, 'manageAttendance')).error
          ?.status,
      ).toBe(401);
    });
  });

  describe('getAuthenticatedUser', () => {
    it('returns the profile for a member', async () => {
      signInAs(SENATOR_SGAUTH, ['senator']);
      expect((await getAuthenticatedUser())?.userId).toBe(senatorId);
    });

    it('returns null for staff without a profile', async () => {
      signInAs(SPEAKER_SGAUTH, ['speaker-of-the-senate']);
      expect(await getAuthenticatedUser()).toBeNull();
    });
  });
});
