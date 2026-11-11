import { NextResponse } from 'next/server';
import { UsersService } from './users.service';
import { Prisma, RoleType } from '@/generated/prisma';
import { AttendanceService } from '@/server/modules/attendance/attendance.service';
import { z } from 'zod';
import {
  CreateRoleSchema,
  CreateUserSchema,
  PostAttendanceParams,
  UpdateUserSchema,
} from '@/types/schemas';

const isNotFound = (error: unknown) =>
  error instanceof Prisma.PrismaClientKnownRequestError &&
  error.code === 'P2025';

export const UsersController = {
  async listUsers() {
    const users = await UsersService.getAllUsers();
    return NextResponse.json(users);
  },

  async listRoles() {
    const roles = await UsersService.getAllRoles();
    return NextResponse.json(roles);
  },

  async deleteRole(params: { roleId: string }) {
    if (!params.roleId) {
      return NextResponse.json(
        { error: 'roleId is required' },
        { status: 400 },
      );
    }
    const role = await UsersService.getRolesByRoleId(params.roleId);
    if (!role) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 });
    }
    // The service would delete every user holding the role. Never do that
    // from the API.
    if ((await UsersService.countUsersWithRole(params.roleId)) > 0) {
      return NextResponse.json(
        { error: 'Role is still assigned to users' },
        { status: 409 },
      );
    }
    await UsersService.deleteRole(params.roleId);
    return NextResponse.json(
      { message: 'Role deleted successfully' },
      { status: 200 },
    );
  },

  async getUserByNUID(params: { nuid: string }) {
    const roles = await UsersService.getUserByNUID(params.nuid);
    return NextResponse.json(roles);
  },

  async getUserByEmail(params: { email: string }) {
    const user = await UsersService.getUserByEmail(params.email);
    return NextResponse.json(user);
  },

  async listUsersSantizied() {
    const users = await UsersService.getAllUsers();
    const sanitizedUsers = users.map((user) => {
      // eslint-disable-next-line no-unused-vars
      const { email: _email, ...safeUser } = user;
      return safeUser;
    });
    return NextResponse.json(sanitizedUsers);
  },

  async getUser(params: { userId: string }) {
    const user = await UsersService.getUserById(params.userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    return NextResponse.json(user);
  },

  async getRoleId(params: { role: RoleType }) {
    const roleId = await UsersService.getRoleIdByRoleType(params.role);
    if (!roleId) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 });
    }
    return roleId;
  },

  async checkUserExists(params: { userEmail: string }) {
    const user = await UsersService.getUserByEmail(params.userEmail);
    if (!user) {
      return NextResponse.json({
        exists: false,
        user: null,
      });
    }

    // eslint-disable-next-line no-unused-vars
    const { roleId: _roleId, ...userData } = user;
    return NextResponse.json({
      exists: true,
      user: userData,
    });
  },

  async createUser(request: Request) {
    const body = await request.json();

    // zod parse
    const result = CreateUserSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        {
          error: 'Invalid request body',
          details: z.flattenError(result.error).fieldErrors,
        },
        { status: 400 },
      );
    }
    const roleId = await UsersService.getRoleIdByRoleType(RoleType.MEMBER);
    if (!roleId) {
      return NextResponse.json(
        { error: 'Member role does not exist' },
        { status: 500 },
      );
    }
    const newUser = await UsersService.createUser({
      ...result.data,
      roleId,
    });
    return NextResponse.json(newUser, { status: 201 });
  },

  async createRole(request: Request) {
    const result = CreateRoleSchema.safeParse(await request.json());
    if (!result.success) {
      return NextResponse.json(
        {
          error: 'Invalid request body',
          details: z.flattenError(result.error).fieldErrors,
        },
        { status: 400 },
      );
    }
    const newRole = await UsersService.createRole(result.data);
    return NextResponse.json(newRole, { status: 201 });
  },

  async updateUser(request: Request, params: { userId: string }) {
    const result = UpdateUserSchema.safeParse(await request.json());
    if (!result.success) {
      return NextResponse.json(
        {
          error: 'Invalid request body',
          details: z.flattenError(result.error).fieldErrors,
        },
        { status: 400 },
      );
    }
    try {
      const updatedUser = await UsersService.updateUser(
        params.userId,
        result.data,
      );
      return NextResponse.json(updatedUser);
    } catch (error) {
      if (isNotFound(error)) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
      throw error;
    }
  },

  async deleteUser(params: { userId: string }) {
    try {
      await UsersService.deleteUser(params.userId);
    } catch (error) {
      if (isNotFound(error)) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
      throw error;
    }
    // A 204 response must not have a body (NextResponse.json throws on it).
    return new NextResponse(null, { status: 204 });
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

  async updateAttendence(request: Request) {
    const body = await request.json();
    if (!body?.userId || !body?.meetingId || body?.status === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 },
      );
    }
    const result = PostAttendanceParams.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid attendance value' },
        { status: 400 },
      );
    }
    const { userId, meetingId, status } = result.data;

    await AttendanceService.upsertAttendance(userId, meetingId, status);
    return NextResponse.json({
      success: true,
      message: 'Attendance updated successfully',
    });
  },
};
