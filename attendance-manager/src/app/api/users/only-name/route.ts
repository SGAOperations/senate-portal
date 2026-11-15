import { UsersController } from '@/server/modules/users/users.controller';
import { can, requireAuth } from '@/server/auth/api-auth';

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Returns the roster's names (and NUIDs, for manageAttendance). Requires sign-in.
 *     responses:
 *       200:
 *         description: A JSON array of user objects.
 */
export async function GET() {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  return UsersController.listUsersSantizied({
    includeNuid: can(auth.actor, 'manageAttendance'),
  });
}
