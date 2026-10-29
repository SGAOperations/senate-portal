import { UsersController } from '@/users/users.controller';

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
  return UsersController.listUsersSantizied();
}
