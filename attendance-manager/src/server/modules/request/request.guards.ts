import type { NextResponse } from 'next/server';
import { prisma } from '@/server/db/prisma';
import {
  can,
  canAny,
  forbidden,
  isSelf,
  requireAuth,
} from '@/server/auth/api-auth';
import { RequestService } from './request.service';

/**
 * Route guards for absence requests. Each returns a response to send as-is
 * (401/403), or null to carry on. An id that matches nothing passes through,
 * so the controller answers with its usual 404.
 */

/** Filing a request: the attendance record must be the caller's own, unless they manage attendance. */
export async function guardFileRequest(
  attendanceId: unknown,
): Promise<NextResponse | null> {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  if (can(auth.actor, 'manageAttendance')) return null;
  if (typeof attendanceId !== 'string') return null; // the controller rejects it
  const attendance = await prisma.attendance.findUnique({
    where: { attendanceId },
    select: { userId: true },
  });
  if (attendance && !isSelf(auth.actor, attendance.userId)) return forbidden();
  return null;
}

/** Reading a request: its owner, or manageAttendance or readRecords. */
export async function guardReadRequest(
  requestId: string,
): Promise<NextResponse | null> {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  if (canAny(auth.actor, 'manageAttendance', 'readRecords')) return null;
  const request = await RequestService.getRequest(requestId);
  if (request && !isSelf(auth.actor, request.attendance.userId)) {
    return forbidden();
  }
  return null;
}

/**
 * Changing or withdrawing a request: its owner while it is still pending, or
 * manageAttendance. Once a request is decided only staff can touch it.
 */
export async function guardChangeRequest(
  requestId: string,
): Promise<NextResponse | null> {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  if (can(auth.actor, 'manageAttendance')) return null;
  const request = await RequestService.getRequest(requestId);
  if (!request) return null;
  if (
    !isSelf(auth.actor, request.attendance.userId) ||
    request.attendance.status !== 'PENDING'
  ) {
    return forbidden();
  }
  return null;
}
