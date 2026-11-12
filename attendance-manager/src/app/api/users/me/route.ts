import { NextResponse } from 'next/server';
import { resolveActor } from '@/server/auth/sgauth';

/**
 * The signed-in user and what they may do
 * @description 200 with their capabilities (from SGAuth positions) and their
 * portal profile, or profile null for staff who have none; 404 when they are
 * on the roster but have no profile yet (the client then asks for an NUID);
 * 403 when no position gives them access; 401 when signed out.
 */
export async function GET() {
  try {
    const result = await resolveActor();
    if (result.status === 'none') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (result.status === 'no-access') {
      return NextResponse.json(
        {
          status: 'no-access',
          email: result.session.user.email,
          name: result.session.user.name,
        },
        { status: 403 },
      );
    }
    const { session, user, capabilities } = result.actor;
    if (result.status === 'unregistered') {
      return NextResponse.json(
        {
          status: 'unregistered',
          email: session.user.email,
          name: session.user.name,
        },
        { status: 404 },
      );
    }
    return NextResponse.json({
      status: 'ok',
      user: {
        userId: user?.userId ?? null,
        email: user?.email ?? session.user.email,
        firstName: user?.firstName ?? null,
        lastName: user?.lastName ?? null,
        name: session.user.preferredName ?? session.user.name,
        positions: session.positions.map(({ name }) => name),
        capabilities: [...capabilities],
      },
    });
  } catch (error) {
    console.error('Error loading current user', error);
    return NextResponse.json({ error: 'Failed to load user' }, { status: 500 });
  }
}
