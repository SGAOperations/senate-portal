import { prisma } from '../lib/prisma';
import { isRosterPosition } from '../lib/permissions';

/**
 * Whether a user is on the roster, from the SGAuth positions recorded at
 * their last sign-in. Someone who has not signed in since the move to SGAuth
 * (positionsSyncedAt null) stays on it until they do, so the roster is not
 * emptied by the cutover.
 */
export function isOnRoster(user: {
  positionKeys: string[];
  positionsSyncedAt: Date | null;
}): boolean {
  return (
    user.positionsSyncedAt === null || user.positionKeys.some(isRosterPosition)
  );
}

export const UsersService = {
  async getAllUsers() {
    return prisma.user.findMany({
      where: { deletedAt: null },
      include: { attendance: true },
    });
  },

  /** Everyone on the roster (isOnRoster), with their attendance. */
  async getRoster() {
    const users = await this.getAllUsers();
    return users.filter(isOnRoster);
  },

  async getUserByNUID(nuid: string) {
    const user = await prisma.user.findUnique({ where: { nuid } });
    return user?.deletedAt ? null : user;
  },

  async getUserById(userId: string) {
    const user = await prisma.user.findUnique({
      where: { userId },
      include: { attendance: true },
    });
    return user?.deletedAt ? null : user;
  },

  async getUserByEmail(userEmail: string) {
    const user = await prisma.user.findUnique({ where: { email: userEmail } });
    return user?.deletedAt ? null : user;
  },

  async getUserByNuid(nuid: string) {
    const user = await prisma.user.findUnique({ where: { nuid } });
    return user?.deletedAt ? null : user;
  },

  async createUser(data: {
    userId?: string;
    nuid: string;
    email: string;
    firstName: string;
    lastName: string;
    positionKeys?: string[];
  }) {
    return prisma.user.create({ data });
  },

  async updateUser(
    userId: string,
    updates: Partial<{
      nuid: string;
      email: string;
      firstName: string;
      lastName: string;
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
};
