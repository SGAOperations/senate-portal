import { UsersController } from '@/users/users.controller';

/**
 * DELETE /api/user/role/:roleId
 * Deletes a role by its ID.
 * @param {Request} request - The incoming request object.
 * @param {object} context.params - Contains route parameters like roleId.
 * @returns {Response} - 200 if deleted, 404 if role not found.
 */
export async function DELETE(
  request: Request,
  context: { params: Promise<Record<string, string>> },
) {
  const { roleId } = await context.params;
  return UsersController.deleteRole({ roleId: roleId });
}
