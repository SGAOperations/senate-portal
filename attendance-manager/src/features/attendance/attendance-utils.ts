import { AttendanceApiData, MeetingApiData, UserSchema } from '@/types';
import { z } from 'zod';

// API service functions with endpoints
export const meetingAPI = {
  async getAllMeetings(): Promise<MeetingApiData[]> {
    // eslint-disable-next-line no-useless-catch
    try {
      const response = await fetch('/api/meeting');

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Failed to fetch meetings (${response.status}): ${errorText}`,
        );
      }

      const data = await response.json();
      return data;
    } catch (error) {
      throw error;
    }
  },

  async getAttendances(meetingId: string): Promise<AttendanceApiData[]> {
    // eslint-disable-next-line no-useless-catch
    try {
      const response = await fetch(`/api/attendance/meeting/${meetingId}`);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Failed to fetch meeting (${response.status}): ${errorText}`,
        );
      }

      const data = await response.json();
      return data;
    } catch (error) {
      throw error;
    }
  },

  async getUsers(): Promise<z.infer<typeof UserSchema>[]> {
    // eslint-disable-next-line no-useless-catch
    try {
      // The roster with isSenator (from SGAuth positions), NUIDs for check-in and
      // emails. /api/users/only-name has no isSenator, which put every member
      // under Officers.
      const response = await fetch('/api/users');

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Failed to fetch meeting (${response.status}): ${errorText}`,
        );
      }

      const data = await response.json();
      return data;
    } catch (error) {
      throw error;
    }
  },
};
