import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { resolveActor } from '@/lib/sgauth';
import { toErrorResponse } from '@/utils/api-errors';

const RegisterSchema = z.strictObject({
  nuid: z.string().regex(/^\d{9}$/),
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
});

/**
 * Create the portal profile for a first SGAuth sign-in
 * @description Replaces the old Supabase signup. Identity and email come from
 * the SGAuth session, never the body. Only people whose SGAuth positions put
 * them on the roster need, or may create, a profile; what they may do comes
 * from those positions, never from the profile.
 */
export async function POST(request: Request) {
  try {
    const result = await resolveActor();
    if (result.status === 'none') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (result.status === 'ok' && result.actor.user) {
      return NextResponse.json(
        { error: 'You already have a portal profile' },
        { status: 409 },
      );
    }
    if (result.status !== 'unregistered') {
      return NextResponse.json(
        { error: 'Only roster members have a portal profile' },
        { status: 403 },
      );
    }
    const { session } = result.actor;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
    const parsed = RegisterSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'Invalid request body',
          details: z.flattenError(parsed.error).fieldErrors,
        },
        { status: 400 },
      );
    }

    try {
      const user = await prisma.user.create({
        data: {
          sgauthUserId: session.user.id,
          email: session.user.email.trim().toLowerCase(),
          firstName: parsed.data.firstName,
          lastName: parsed.data.lastName,
          nuid: parsed.data.nuid,
          positionKeys: session.positions.map(({ key }) => key).sort(),
          positionsSyncedAt: new Date(),
        },
        select: { userId: true },
      });
      return NextResponse.json(user, { status: 201 });
    } catch (dbError: any) {
      if (dbError?.code === 'P2002') {
        // Deliberately vague: this must not confirm whose NUID or email it is.
        return NextResponse.json(
          {
            error:
              'A portal profile with this NUID or email already exists. Contact the Senate Operations Coordinator.',
          },
          { status: 409 },
        );
      }
      throw dbError;
    }
  } catch (error) {
    return toErrorResponse(error, 'Failed to create profile');
  }
}
