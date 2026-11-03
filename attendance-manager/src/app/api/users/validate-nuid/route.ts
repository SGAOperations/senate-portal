import { UsersController } from '@/users/users.controller';
import { requireCapability } from '@/utils/api-auth';

/**
 * @swagger
 * /api/users/validate-nuid:
 *   get:
 *     summary: Validates NUID format and matches it with provided name.
 *     responses:
 *       200:
 *         description: Validation result with user data if valid.
 *       400:
 *         description: Invalid request or validation failed.
 */
export async function GET(request: Request) {
  const { error } = await requireCapability('manageAttendance');
  if (error) return error;
  const { searchParams } = new URL(request.url);
  const nuid = searchParams.get('nuid');
  const firstName = searchParams.get('firstName');
  const lastName = searchParams.get('lastName');

  return UsersController.validateNuid({
    nuid: nuid || '',
    firstName: firstName || '',
    lastName: lastName || '',
  });
}
