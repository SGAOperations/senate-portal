import { UsersController } from '@/server/modules/users/users.controller';
import { requireAuth, requireCapability } from '@/server/auth/api-auth';

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Returns the roster. Signed-in users only.
 *     responses:
 *       200:
 *         description: A JSON array of user objects.
 *       401:
 *         description: Signed out.
 */
export async function GET() {
  const { error } = await requireAuth();
  if (error) return error;
  return UsersController.listUsers();
}

/**
 * @swagger
 * /api/users:
 *   post:
 *     summary: Posts a single user with the given request.
 *     @param {Request} request - The incoming request object, expected to contain a JSON body with user data:
 *     responses:
 *       201:
 *         description: A JSON array of user objects.
 *       400:
 *         description: Missing required fields.
 */
// Superadmin only; members create their own profile through /api/auth/register.
export async function POST(request: Request) {
  const { error } = await requireCapability('superadmin');
  if (error) return error;
  return UsersController.createUser(request);
}
