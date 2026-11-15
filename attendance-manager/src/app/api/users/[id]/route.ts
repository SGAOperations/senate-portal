import { UsersController } from '@/server/modules/users/users.controller';
import {
  requireCapability,
  requireSelfOrCapability,
} from '@/server/auth/api-auth';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  // A profile includes its attendance: the member themselves, or staff.
  const { error } = await requireSelfOrCapability(
    id,
    'manageAttendance',
    'readRecords',
  );
  if (error) return error;
  return UsersController.getUser({ userId: id });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  // Superadmin only. A profile's email decides which SGAuth account claims it
  // on first sign-in (src/server/auth/sgauth.ts), so an open edit here would
  // let anyone take over a member who has not signed in yet.
  const { error } = await requireCapability('superadmin');
  if (error) return error;
  const { id } = await params;
  return UsersController.updateUser(request, { userId: id });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  // Whoever manages attendance removes members (the Attendance page's delete).
  const { error } = await requireCapability('manageAttendance');
  if (error) return error;
  const { id } = await params;
  return UsersController.deleteUser({ userId: id });
}
