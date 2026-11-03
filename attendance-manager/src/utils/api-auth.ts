import { NextResponse } from 'next/server';
import type { Capability } from '@/lib/permissions';
import { resolveActor, type Actor, type PortalUser } from '@/lib/sgauth';

/**
 * Route guards. Authority comes from SGAuth positions only
 * (src/lib/permissions.ts); the portal has no roles of its own.
 */

export function can(actor: Actor, capability: Capability): boolean {
  return actor.capabilities.has(capability);
}

/**
 * How an actor is recorded in updatedBy columns: their portal user id, or
 * their SGAuth id for staff without a profile. Never taken from a request body.
 */
export function actorId(actor: Actor): string {
  return actor.user?.userId ?? `sgauth:${actor.session.user.id}`;
}

export function forbidden() {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}

function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

type Guarded<T> = ({ error: null } & T) | { error: NextResponse };

/**
 * The signed-in actor, or a 401 to return as-is. Staff without a portal
 * profile pass (actor.user is null); people with no portal access do not.
 */
export async function requireAuth(): Promise<Guarded<{ actor: Actor }>> {
  try {
    const result = await resolveActor();
    if (result.status === 'ok' || result.status === 'unregistered') {
      return { actor: result.actor, error: null };
    }
    if (result.status === 'no-access') return { error: forbidden() };
  } catch (error) {
    console.error('Error resolving authenticated user', error);
  }
  return { error: unauthorized() };
}

/** Like requireAuth, but answers 403 without `capability`. */
export async function requireCapability(
  capability: Capability,
): Promise<Guarded<{ actor: Actor }>> {
  const auth = await requireAuth();
  if (auth.error) return auth;
  if (!can(auth.actor, capability)) return { error: forbidden() };
  return auth;
}

/**
 * For routes about the signed-in person's own records: they need a portal
 * profile. 403 for staff without one, who have no records of their own.
 */
export async function requireProfile(): Promise<
  Guarded<{ actor: Actor; user: PortalUser }>
> {
  const auth = await requireAuth();
  if (auth.error) return auth;
  if (!auth.actor.user) return { error: forbidden() };
  return { actor: auth.actor, user: auth.actor.user, error: null };
}

/**
 * For one member's records: 403 unless the actor is that member or holds
 * `capability`.
 */
export async function requireSelfOr(
  userId: string,
  capability: Capability,
): Promise<Guarded<{ actor: Actor }>> {
  const auth = await requireAuth();
  if (auth.error) return auth;
  if (auth.actor.user?.userId !== userId && !can(auth.actor, capability)) {
    return { error: forbidden() };
  }
  return auth;
}

/** The portal profile for this request, or null. */
export async function getAuthenticatedUser(): Promise<PortalUser | null> {
  const auth = await requireAuth();
  return auth.error ? null : auth.actor.user;
}
