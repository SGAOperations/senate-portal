import { prisma } from '@/lib/prisma';
import { SemesterService } from '@/semester/semester.service';

/**
 * Cleans up all test data in the correct order to respect foreign key constraints.
 *
 * Deletion order (must be sequential to respect foreign keys):
 * 1. Request (references Attendance)
 * 2. Attendance (references User and Meeting)
 * 3. User (references Role) - MUST be deleted before Role
 * 4. Meeting (referenced by Attendance, but no dependencies itself)
 * 5. Role (referenced by User) - MUST be deleted after User
 *
 * This function should be used in beforeAll/afterAll hooks to ensure
 * tests don't fail due to foreign key constraint violations.
 */
export async function cleanupTestData() {
  // Delete in strict order to respect foreign key constraints
  // Each await ensures the previous deletion completes before the next
  await prisma.votingRecord.deleteMany();
  await prisma.votingEvent.deleteMany();
  await prisma.request.deleteMany();
  await prisma.attendance.deleteMany();
  await prisma.user.deleteMany();
  await prisma.meeting.deleteMany();
  await prisma.semester.deleteMany();
  await prisma.role.deleteMany();
}

/**
 * Semester id for a meeting date, for fixtures that create meetings directly
 * through Prisma instead of MeetingService.createMeeting.
 */
export function semesterIdFor(date: Date): Promise<string> {
  return SemesterService.getOrCreateSemesterIdForDate(date);
}
