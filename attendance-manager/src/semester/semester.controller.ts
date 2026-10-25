import { NextResponse } from 'next/server';
import {
  formatMeetingDateInput,
  MeetingDateTimeInputError,
  parseMeetingDate,
} from '../meeting/meetingDateTime';
import {
  SemesterDateRangeError,
  SemesterNotFoundError,
  SemesterOverlapError,
  SemesterService,
} from './semester.service';

function toSemesterDate(value: unknown): Date | null {
  if (typeof value !== 'string') return null;
  try {
    const day = formatMeetingDateInput(parseMeetingDate(value));
    return new Date(`${day}T00:00:00.000Z`);
  } catch (error) {
    if (error instanceof MeetingDateTimeInputError) return null;
    throw error;
  }
}

export const SemesterController = {
  async updateSemesterDates(request: Request, params: { semesterId: string }) {
    let updates;
    try {
      updates = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Request body must be valid JSON' },
        { status: 400 },
      );
    }

    const startsOn = toSemesterDate(updates?.startsOn);
    const endsOn = toSemesterDate(updates?.endsOn);
    if (!startsOn || !endsOn) {
      return NextResponse.json(
        { error: 'startsOn and endsOn must be dates in YYYY-MM-DD format' },
        { status: 400 },
      );
    }

    try {
      const semester = await SemesterService.updateSemesterDates(
        params.semesterId,
        startsOn,
        endsOn,
      );
      return NextResponse.json(semester);
    } catch (error) {
      if (error instanceof SemesterDateRangeError) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      if (error instanceof SemesterNotFoundError) {
        return NextResponse.json({ error: error.message }, { status: 404 });
      }
      if (error instanceof SemesterOverlapError) {
        return NextResponse.json({ error: error.message }, { status: 409 });
      }
      throw error;
    }
  },
};
