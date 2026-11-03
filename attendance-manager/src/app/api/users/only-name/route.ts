import { UsersController } from '@/users/users.controller';
import { requireAuth } from '@/utils/api-auth';

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Returns a list of users.
 *     responses:
 *       200:
 *         description: A JSON array of user objects.
 */
export async function GET() {
  const { error } = await requireAuth();
  if (error) return error;
  return UsersController.listUsersSantizied();
}
