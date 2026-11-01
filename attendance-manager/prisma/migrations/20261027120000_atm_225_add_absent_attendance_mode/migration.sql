-- Allow a request to say the member will not attend the meeting at all.
ALTER TYPE "AttendanceMode" ADD VALUE IF NOT EXISTS 'ABSENT';
