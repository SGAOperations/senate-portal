import { NextResponse } from 'next/server';
import { UsersService } from './users.service';
import { SENATOR_POSITION } from '../lib/permissions';
import { AttendanceStatus } from '../generated/prisma';
import { AttendanceService } from '../attendance/attendance.service';
import { z } from 'zod';
import { prisma } from '../lib/prisma';

const CreateUserSchema = z.strictObject({
  userId: z.string().min(1),
  nuid: z.string().regex(/^\d{9}$/),
  email: z.email(),
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
});

// The only fields an update may touch. sgauthUserId and positionKeys come from
// SGAuth and are set by src/lib/sgauth.ts alone; strictObject rejects them, and
// anything else unknown, instead of passing it through to Prisma.
const UpdateUserSchema = z
  .strictObject({
    nuid: z.string().regex(/^\d{9}$/),
    email: z.email(),
    firstName: z.string().trim().min(1).max(100),
    lastName: z.string().trim().min(1).max(100),
  })
  .partial();

const AttendanceUpdateSchema = z.strictObject({
  userId: z.string().min(1),
  meetingId: z.string().min(1),
  status: z.enum(AttendanceStatus),
});

async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return undefined;
  }
}

function invalidBody(error: z.ZodError) {
  return NextResponse.json(
    {
      error: 'Invalid request body',
      details: z.flattenError(error).fieldErrors,
    },
    { status: 400 },
  );
}

export const UsersController = {
  /** The roster, each member marked with whether they hold a Senate seat. */
  async listUsers() {
    const users = await UsersService.getRoster();
    return NextResponse.json(
      users.map((user) => ({
        ...user,
        isSenator: user.positionKeys.includes(SENATOR_POSITION),
      })),
    );
  },

  async getUserByNUID(params: { nuid: string }) {
    const user = await UsersService.getUserByNUID(params.nuid);
    return NextResponse.json(user);
  },

  async getUserByEmail(params: { email: string }) {
    const user = await UsersService.getUserByEmail(params.email);
    return NextResponse.json(user);
  },

  // Names only: no NUID, email, positions or attendance.
  async listUsersSantizied() {
    const users = await UsersService.getRoster();
    return NextResponse.json(
      users.map(({ userId, firstName, lastName }) => ({
        userId,
        firstName,
        lastName,
      })),
    );
  },

  async getUser(params: { userId: string }) {
    const user = await UsersService.getUserById(params.userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    return NextResponse.json(user);
  },

  async checkUserExists(params: { userEmail: string }) {
    const user = await UsersService.getUserByEmail(params.userEmail);
    if (!user) {
      return NextResponse.json({
        exists: false,
        user: null,
      });
    }

    return NextResponse.json({
      exists: true,
      user,
    });
  },

  async createUser(request: Request) {
    const result = CreateUserSchema.safeParse(await readJson(request));
    if (!result.success) return invalidBody(result.error);
    const newUser = await UsersService.createUser(result.data);
    return NextResponse.json(newUser, { status: 201 });
  },

  async updateUser(request: Request, params: { userId: string }) {
    const result = UpdateUserSchema.safeParse(await readJson(request));
    if (!result.success) return invalidBody(result.error);
    const updatedUser = await UsersService.updateUser(
      params.userId,
      result.data,
    );
    return NextResponse.json(updatedUser);
  },

  async deleteUser(params: { userId: string }) {
    await UsersService.deleteUser(params.userId);
    return NextResponse.json(
      { message: 'User deleted successfully' },
      { status: 204 },
    );
  },

  async validateNuid(params: {
    nuid: string;
    firstName: string;
    lastName: string;
  }) {
    try {
      // Validate required fields
      if (!params.nuid || !params.firstName || !params.lastName) {
        return NextResponse.json(
          {
            valid: false,
            error: 'Missing required fields: nuid, firstName, lastName',
          },
          { status: 400 },
        );
      }

      // Validate NUID format (exactly 9 digits)
      const nuidRegex = /^\d{9}$/;
      if (!nuidRegex.test(params.nuid)) {
        return NextResponse.json(
          {
            valid: false,
            error: 'Invalid NUID format. Must be exactly 9 digits.',
          },
          { status: 400 },
        );
      }

      // Check if user exists with this NUID
      const user = await UsersService.getUserByNuid(params.nuid);

      if (!user) {
        return NextResponse.json(
          {
            valid: false,
            error: 'No user found with this NUID',
          },
          { status: 400 },
        );
      }

      // Validate that names match
      const namesMatch =
        user.firstName.toLowerCase() === params.firstName.toLowerCase() &&
        user.lastName.toLowerCase() === params.lastName.toLowerCase();

      if (!namesMatch) {
        return NextResponse.json(
          {
            valid: false,
            error: 'NUID does not match the provided name',
          },
          { status: 400 },
        );
      }

      // Return success response
      return NextResponse.json({
        valid: true,
        message: 'NUID format is valid and matches the provided name',
        user: {
          userId: user.userId,
          nuid: user.nuid,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
        },
      });
    } catch {
      return NextResponse.json(
        {
          valid: false,
          error: 'Internal server error',
        },
        { status: 500 },
      );
    }
  },

  /**
   * Sets one member's status for one meeting. `actor` is the signed-in user:
   * with manageAttendance they may set any status for anyone; a member may only mark
   * their own attendance PENDING, which is how an excuse request starts, and
   * only while it is still PENDING -- never to clear a recorded absence.
   */
  async updateAttendence(
    request: Request,
    actor: { userId: string | null; canManage: boolean },
  ) {
    const result = AttendanceUpdateSchema.safeParse(await readJson(request));
    if (!result.success) return invalidBody(result.error);
    const body = result.data;
    if (
      !actor.canManage &&
      (body.userId !== actor.userId || body.status !== 'PENDING')
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (!actor.canManage) {
      const existing = await prisma.attendance.findUnique({
        where: {
          // eslint-disable-next-line
          userId_meetingId: { userId: body.userId, meetingId: body.meetingId },
        },
        select: { status: true },
      });
      if (existing && existing.status !== 'PENDING') {
        return NextResponse.json(
          {
            error:
              'Attendance for this meeting is already recorded. Contact the Senate Operations Coordinator to change it.',
          },
          { status: 409 },
        );
      }
    }

    await AttendanceService.upsertAttendance(
      body.userId,
      body.meetingId,
      body.status,
    );
    return NextResponse.json({
      success: true,
      message: 'Attendance updated successfully',
    });
  },
};
