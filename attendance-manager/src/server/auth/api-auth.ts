import { NextResponse } from 'next/server';
import type { Capability } from '@/lib/permissions';
import {
  resolveActor,
  type Actor,
  type PortalUser,
} from '@/server/auth/sgauth';

/**
 * Route guards. Authority comes from SGAuth positions only
 * (src/lib/permissions.ts); the portal has no roles of its own.
 */

export function can(actor: Actor, capability: Capability): boolean {
  return actor.capabilities.has(capability);
}

/** Whether the actor holds at least one of `capabilities`. */
export function canAny(
  actor: Actor,
  ...capabilities: readonly Capability[]
): boolean {
  return capabilities.some((capability) => can(actor, capability));
}

/** Whether `userId` is the actor's own portal profile. */
export function isSelf(actor: Actor, userId: string): boolean {
  return actor.user !== null && actor.user.userId === userId;
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

/** Like requireAuth, but answers 403 without at least one of `capabilities`. */
export async function requireAnyCapability(
  ...capabilities: readonly Capability[]
): Promise<Guarded<{ actor: Actor }>> {
  const auth = await requireAuth();
  if (auth.error) return auth;
  if (!canAny(auth.actor, ...capabilities)) return { error: forbidden() };
  return auth;
}

/**
 * Like requireAuth, but answers 403 unless `userId` is the actor's own
 * profile or they hold one of `capabilities`. For per-member records:
 * members see their own, staff see everyone's.
 */
export async function requireSelfOrCapability(
  userId: string,
  ...capabilities: readonly Capability[]
): Promise<Guarded<{ actor: Actor }>> {
  const auth = await requireAuth();
  if (auth.error) return auth;
  if (!isSelf(auth.actor, userId) && !canAny(auth.actor, ...capabilities)) {
    return { error: forbidden() };
  }
  return auth;
}

/** The portal profile for this request, or null. */
export async function getAuthenticatedUser(): Promise<PortalUser | null> {
  const auth = await requireAuth();
  return auth.error ? null : auth.actor.user;
}
