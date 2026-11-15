import { NextResponse } from 'next/server';
import { SemesterService } from '@/server/modules/semester/semester.service';

// Public on purpose: SemesterProvider wraps every page, the sign-in page
// included, and a semester's dates are not private.
export async function GET() {
  try {
    const semester = await SemesterService.getCurrentSemester();
    return NextResponse.json(semester);
  } catch {
    return NextResponse.json(
      { error: 'Failed to fetch current semester' },
      { status: 500 },
    );
  }
}
