import { cache } from 'react';
import { headers } from 'next/headers';
import { createSgauthClient, type SgaSession } from '@nusgaops/sgauth';
import { prisma } from '@/lib/prisma';
import { capabilitiesFor, type Capability } from '@/lib/permissions';

/**
 * Sign-in through SGAuth, the SGA Operations single sign-on service.
 *
 * Server-only. SGAuth sets one session cookie for *.northeasternsga.com; the
 * SDK validates it with SGAuth (cached for 60 s per instance) and gives back
 * who the person is and which SGA positions they hold. Those positions are
 * the only source of authority (src/lib/permissions.ts). The portal keeps its
 * own User row for everything SGAuth deliberately does not hold, NUID above
 * all, keyed by the SGAuth user id -- but only for people on the roster; staff
 * who only administer the portal need no profile.
 */

// Built on first use so a build without SGAUTH_URL does not throw at import.
// onError never receives the cookie or the token, and neither does this log.
let client: ReturnType<typeof createSgauthClient> | null = null;
function sgauthClient() {
  client ??= createSgauthClient({
    onError: ({ kind, status, servedStale }) =>
      console.warn('sgauth upstream failure', { kind, status, servedStale }),
  });
  return client;
}

/** The SGAuth session for this request, or null. One lookup per request. */
export const getSgauthSession = cache(async (): Promise<SgaSession | null> => {
  const requestHeaders = await headers();
  return sgauthClient().getSession({ headers: requestHeaders });
});

export type PortalUser = NonNullable<
  Awaited<ReturnType<typeof findBySgauthId>>
>;

/** Who is making this request, and what their positions let them do. */
export type Actor = {
  session: SgaSession;
  capabilities: ReadonlySet<Capability>;
  /** Their portal profile, or null for staff who have none. */
  user: PortalUser | null;
};

export type ActorResult =
  | { status: 'none' }
  /** Signed in, but no position that gives portal access and no profile. */
  | { status: 'no-access'; session: SgaSession }
  /** On the roster but no profile yet: they owe an NUID (POST /api/auth/register). */
  | { status: 'unregistered'; actor: Actor }
  | { status: 'ok'; actor: Actor };

function findBySgauthId(sgauthUserId: string) {
  return prisma.user.findUnique({ where: { sgauthUserId } });
}

function sameKeys(a: readonly string[], b: readonly string[]) {
  return a.length === b.length && a.every((key, i) => key === b[i]);
}

/**
 * The portal profile behind this session, linking a pre-SGAuth row by email
 * on first sign-in. Linking never moves an SGAuth id from one row to another,
 * and nothing a client sends can set it.
 */
async function findOrLinkUser(session: SgaSession) {
  const sgauthUserId = session.user.id;
  const user = await findBySgauthId(sgauthUserId);
  if (user) return user;
  try {
    await prisma.user.updateMany({
      where: {
        email: { equals: session.user.email.trim(), mode: 'insensitive' },
        sgauthUserId: null,
        deletedAt: null,
      },
      data: { sgauthUserId },
    });
  } catch (error: any) {
    // Two first requests raced; the re-read below picks up the winner.
    if (error?.code !== 'P2002') throw error;
  }
  return findBySgauthId(sgauthUserId);
}

/**
 * The actor behind this request's SGAuth session. Their position keys are
 * copied onto their profile when they change, which is how the roster knows
 * who holds a seat. A soft-deleted profile is treated as signed out.
 */
export const resolveActor = cache(async (): Promise<ActorResult> => {
  const session = await getSgauthSession();
  if (!session) return { status: 'none' };

  const positionKeys = session.positions.map(({ key }) => key).sort();
  const capabilities = new Set(capabilitiesFor(positionKeys));
  let user = await findOrLinkUser(session);
  if (user?.deletedAt) return { status: 'none' };

  if (
    user &&
    (!user.positionsSyncedAt || !sameKeys(user.positionKeys, positionKeys))
  ) {
    user = await prisma.user.update({
      where: { userId: user.userId },
      data: { positionKeys, positionsSyncedAt: new Date() },
    });
  }

  const actor: Actor = { session, capabilities, user };
  if (user) return { status: 'ok', actor };
  if (capabilities.has('roster')) return { status: 'unregistered', actor };
  if (capabilities.size > 0) return { status: 'ok', actor };
  return { status: 'no-access', session };
});
