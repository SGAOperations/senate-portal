import { prisma } from '@/lib/prisma';

// Who an attendance record or an excuse request belongs to, for the
// self-or-capability checks in the routes. null when it does not exist.

export async function attendanceOwner(attendanceId: string) {
  const attendance = await prisma.attendance.findUnique({
    where: { attendanceId },
    select: { userId: true },
  });
  return attendance?.userId ?? null;
}

export async function requestOwner(requestId: string) {
  const request = await prisma.request.findUnique({
    where: { requestId },
    select: { attendance: { select: { userId: true } } },
  });
  return request?.attendance.userId ?? null;
}
