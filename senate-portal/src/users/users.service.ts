import { RoleType } from '@/generated/prisma';
import { prisma } from '../lib/prisma';

export const UsersService = {
  async getAllUsers() {
    return prisma.user.findMany({
      where: { deletedAt: null },
      include: { role: true, attendance: true },
    });
  },

  async getAllRoles() {
    return prisma.role.findMany({
      include: {},
    });
  },

  async getUserByNUID(nuid: string) {
    const user = await prisma.user.findUnique({
      where: { nuid },
      include: { role: true },
    });
    return user?.deletedAt ? null : user;
  },

  async getUserById(userId: string) {
    const user = await prisma.user.findUnique({
      where: { userId },
      include: { role: true, attendance: true },
    });
    return user?.deletedAt ? null : user;
  },

  async getUserByEmail(userEmail: string) {
    const user = await prisma.user.findUnique({
      where: { email: userEmail },
      include: { role: true },
    });
    return user?.deletedAt ? null : user;
  },

  async getUserByNuid(nuid: string) {
    const user = await prisma.user.findUnique({
      where: { nuid },
      include: { role: true },
    });
    return user?.deletedAt ? null : user;
  },

  async createUser(data: {
    userId: string;
    supabaseAuthId?: string;
    nuid: string;
    email: string;
    firstName: string;
    lastName: string;
    roleId: string;
    password?: string | null;
  }) {
    return prisma.user.create({
      data: {
        ...data,
        password: data.password ?? null,
      },
    });
  },

  async createRole(data: { roleType: RoleType }) {
    return prisma.role.create({ data });
  },

  async getRoleIdByRoleType(roleType: RoleType) {
    const role = await prisma.role.findFirst({
      where: { roleType },
      select: { roleId: true },
    });
    return role?.roleId;
  },

  async updateUser(
    userId: string,
    updates: Partial<{
      nuid: string;
      email: string;
      firstName: string;
      lastName: string;
      roleId: string;
    }>,
  ) {
    return prisma.user.update({
      where: { userId },
      data: updates,
    });
  },

  async deleteUser(userId: string) {
    // Soft delete attendance records: updates prisma deletedAt field instead of fully deleting
    return prisma.user.update({
      where: { userId },
      data: { deletedAt: new Date() },
    });
  },

  async getRoles() {
    return prisma.role.findMany();
  },

  async deleteRole(roleId: string) {
    await prisma.user.deleteMany({
      where: { roleId },
    });
    return prisma.role.delete({
      where: { roleId },
    });
  },

  async getRolesByRoleId(roleId: string) {
    return prisma.role.findUnique({
      where: { roleId: roleId },
    });
  },

  async getUsersByRole(roleId: string) {
    return prisma.user.findMany({
      where: {
        deletedAt: null,
        role: {
          roleType: roleId as RoleType,
        },
      },
      include: {
        role: true,
      },
    });
  },

  async getUserBySupabaseId(supabaseAuthId: string) {
    const user = await prisma.user.findUnique({
      where: { supabaseAuthId },
      include: { role: true },
    });
    return user?.deletedAt ? null : user;
  },
};
