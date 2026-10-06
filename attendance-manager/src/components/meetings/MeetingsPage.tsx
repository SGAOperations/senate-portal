import React, { useEffect, useMemo, useState } from 'react';
import {
  MeetingApiData,
  UserSchema,
  RequestApiData,
  RemainingAbsences,
  MeetingType,
  RequestForm,
} from '../../types';
import { z } from 'zod';
import { useAuth } from '../../contexts/AuthContext';
import ViewRequestsPanel from './ViewRequestsPanel';
import ViewRequestsModal from './ViewRequestsModal';
import AbsencesBanner from './AbsencesBanner';
import MeetingStatisticsPanel from './MeetingStatisticsPanel';
import MeetingHistoryPanel from './MeetingHistoryPanel';
import CreateMeetingModal from './CreateMeetingModal';
import EditMeetingModal from './EditMeetingModal';
import CreateRequestModal from './CreateRequestModal';
import { checkCanManageMeetings } from '@/utils/permissions';
import DeleteMeetingModal from './DeleteMeetingModal';
import { isMeetingRequestEligible } from './meetings.utils';

const normalizeDate = (dateStr: string) => {
  if (!dateStr) {
    const today = new Date();
    return `${today.getMonth() + 1}/${today.getDate()}/${today.getFullYear()}`;
  }

  // Already in MM/DD/YYYY format
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateStr)) {
    return dateStr;
  }

  // Convert YYYY-MM-DD to MM/DD/YYYY.
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [year, month, day] = dateStr.split('-');
    return `${Number(month)}/${Number(day)}/${year}`;
  }

  const parsed = new Date(dateStr);
  if (!Number.isNaN(parsed.getTime())) {
    return `${
      parsed.getMonth() + 1
    }/${parsed.getDate()}/${parsed.getFullYear()}`;
  }

  const today = new Date();
  return `${today.getMonth() + 1}/${today.getDate()}/${today.getFullYear()}`;
};

const MeetingsPage: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'past' | 'upcoming'>('past');
  const [showCreateMeetingModal, setShowCreateMeetingModal] = useState(false);
  const [showEditMeetingModal, setShowEditMeetingModal] = useState(false);
  const [showDeleteMeetingModal, setShowDeleteMeetingModal] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState<MeetingApiData | null>(
    null,
  );
  const [newMeeting, setNewMeeting] = useState({
    name: '',
    date: '',
    startTime: '',
    endTime: '',
    notes: '',
    type: 'REGULAR' as MeetingType, // defaults to REGULAR
    selectedAttendees: [] as string[],
  });
  const [editMeeting, setEditMeeting] = useState({
    name: '',
    date: '',
    startTime: '',
    endTime: '',
    notes: '',
    type: 'REGULAR' as 'FULL_BODY' | 'REGULAR',
  });
  const [deleteMeeting, setDeleteMeeting] = useState<MeetingApiData | null>(
    null,
  );
  const [meetings, setMeetings] = useState<MeetingApiData[]>([]);
  const [showCreateRequestModal, setShowCreateRequestModal] = useState(false);
  const [showMyRequestsModal, setShowMyRequestsModal] = useState(false);
  const [myRequests, setMyRequests] = useState<RequestApiData[]>([]);
  const [requestForm, setRequestForm] = useState<RequestForm>({
    selectedMeetings: [] as string[],
    requestTypes: {
      leavingEarly: false,
      comingLate: false,
      goingOnline: false,
    },
    explanation: '',
  });
  const [typeFilter, setTypeFilter] = useState<MeetingType | null>(null);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

  // Check if user is admin (EBOARD)
  const canManageMeetings = checkCanManageMeetings(user?.role);
  const isMember = user?.role === 'MEMBER';
  const [remainingAbsences, setRemainingAbsences] =
    useState<RemainingAbsences | null>(null);

  const fetchMeetings = () => {
    fetch('/api/meeting')
      .then((response) => response.json())
      .then((json) => {
        setMeetings(json);
      })
      // eslint-disable-next-line
      .catch((error) => console.error(error));
  };

  useEffect(() => {
    fetchMeetings();
  }, []);

  useEffect(() => {
    if (!editingMeeting?.meetingId) return;
    fetch(`/api/meeting/${editingMeeting.meetingId}/users`)
      .then((response) => response.json())
      .then((json) => setSelectedUserIds(json.map((d: any) => d.userId)))
      // eslint-disable-next-line
      .catch(console.error);
  }, [editingMeeting?.meetingId, showEditMeetingModal]);

  const handleEditMeeting = (meeting: MeetingApiData) => {
    setEditingMeeting(meeting);
    setEditMeeting({
      name: meeting.name,
      date: normalizeDate(meeting.date),
      startTime: meeting.startTime,
      endTime: meeting.endTime,
      notes: meeting.notes,
      type: meeting.type as 'FULL_BODY' | 'REGULAR',
    });
    setShowEditMeetingModal(true);
  };

  const handleSetDeleteMeeting = (meeting: MeetingApiData) => {
    setDeleteMeeting(meeting);
    setShowDeleteMeetingModal(true);
  };

  const handleUpdateMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMeeting) return;

    try {
      const response = await fetch(`/api/meeting/${editingMeeting.meetingId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editMeeting),
      });

      if (!response.ok) {
        const errorData = await response.json();
        alert(
          `Failed to update meeting: ${errorData.error || 'Unknown error'}`,
        );
        return;
      }

      await fetch(`/api/meeting/${editingMeeting.meetingId}/users`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userIds: selectedUserIds }),
      });

      // Refresh meetings list
      fetchMeetings();

      // Close modal and reset
      setShowEditMeetingModal(false);
      setEditingMeeting(null);
      setEditMeeting({
        name: '',
        date: '',
        startTime: '',
        endTime: '',
        notes: '',
        type: 'REGULAR',
      });
      alert('Meeting updated successfully!');
    } catch {
      alert('Failed to update meeting. Please try again.');
    }
  };

  // Fetch remaining unexcused absences
  useEffect(() => {
    if (user?.id) {
      fetch(`/api/attendance/user/${user.id}/remaining-absences`)
        .then((response) => response.json())
        .then((data: RemainingAbsences) => {
          setRemainingAbsences(data);
        })
        .catch((error) => {
          alert(`Failed to fetch remaining absences: ${error}`);
        });
    }
  }, [user]);

  const [members, setMembers] = useState<z.infer<typeof UserSchema>[]>([]);
  const [bulkSelectionActive, setBulkSelectionActive] = useState({
    nonEboard: false,
    allMembers: false,
  });

  useEffect(() => {
    fetch('/api/users')
      .then((res) => res.json())
      .then((data) => {
        setMembers(data);
      })
      // eslint-disable-next-line
      .catch((err) => console.error(err));
  }, []);

  const nonEboardMembers = useMemo(
    () => members.filter((member) => member.roleType !== 'EBOARD'),
    [members],
  );
  const nonEboardMemberIds = useMemo(
    () => nonEboardMembers.map((member) => member.userId),
    [nonEboardMembers],
  );
  const allMemberIds = useMemo(
    () => members.map((member) => member.userId),
    [members],
  );
  const selectedAttendeeSet = useMemo(
    () => new Set(newMeeting.selectedAttendees),
    [newMeeting.selectedAttendees],
  );

  const bulkSelectButtonClasses = (active: boolean) =>
    `px-3 py-1 text-xs font-medium border rounded-full transition-colors ${
      active
        ? 'bg-[#C8102E] text-white border-[#C8102E]'
        : 'text-gray-700 border-gray-300 hover:bg-gray-100'
    }`;

  const toggleNonEboardSelection = () => {
    if (bulkSelectionActive.nonEboard) {
      setNewMeeting((prev) => ({
        ...prev,
        selectedAttendees: prev.selectedAttendees.filter(
          (id) => !nonEboardMemberIds.includes(id),
        ),
      }));
      setBulkSelectionActive((prev) => ({ ...prev, nonEboard: false }));
    } else {
      setNewMeeting((prev) => ({
        ...prev,
        selectedAttendees: nonEboardMemberIds,
      }));
      setBulkSelectionActive({ nonEboard: true, allMembers: false });
    }
  };

  const toggleAllMembersSelection = () => {
    if (bulkSelectionActive.allMembers) {
      setNewMeeting((prev) => ({ ...prev, selectedAttendees: [] }));
      setBulkSelectionActive((prev) => ({ ...prev, allMembers: false }));
    } else {
      setNewMeeting((prev) => ({ ...prev, selectedAttendees: allMemberIds }));
      setBulkSelectionActive({ nonEboard: false, allMembers: true });
    }
  };

  useEffect(() => {
    if (!bulkSelectionActive.nonEboard) return;
    const allSelected =
      nonEboardMemberIds.length > 0 &&
      nonEboardMemberIds.every((id) => selectedAttendeeSet.has(id));
    if (!allSelected) {
      setBulkSelectionActive((prev) => ({ ...prev, nonEboard: false }));
    }
  }, [bulkSelectionActive.nonEboard, nonEboardMemberIds, selectedAttendeeSet]);

  useEffect(() => {
    if (!bulkSelectionActive.allMembers) return;
    const allSelected =
      allMemberIds.length > 0 &&
      allMemberIds.every((id) => selectedAttendeeSet.has(id));
    if (!allSelected) {
      setBulkSelectionActive((prev) => ({ ...prev, allMembers: false }));
    }
  }, [bulkSelectionActive.allMembers, allMemberIds, selectedAttendeeSet]);

  // Calculate statistics from real meetings
  const today = new Date();
  // Calculate statistics from real data
  const attendedMeetings = meetings.filter((m) => {
    const meetingDate = new Date(m.date);
    if (meetingDate > today) return false; // Skip upcoming meetings
    // Check if current user attended this meeting
    return m.attendance.some(
      (a) => a.userId === user?.id && a.status === 'PRESENT',
    );
  }).length;

  const missedMeetings = meetings.filter((m) => {
    const meetingDate = new Date(m.date);
    if (meetingDate > today) return false; // Skip upcoming meetings
    // Check if current user was absent
    return m.attendance.some(
      (a) =>
        a.userId === user?.id &&
        (a.status === 'UNEXCUSED_ABSENCE' || a.status === 'EXCUSED_ABSENCE'),
    );
  }).length;

  // Filter meetings based on active tab
  const filteredMeetings = meetings.filter((m) => {
    const meetingStartsAt = new Date(
      `${m.date}T${m.startTime || '00:00'}:00`,
    );

    if (activeTab === 'past') {
      return meetingStartsAt <= today;
    }

    return meetingStartsAt > today;
  });

  // Get upcoming meetings for request creation
  const upcomingMeetingsList = meetings.filter((m) =>
    isMeetingRequestEligible(m.date, m.startTime),
  );

  // Handle request submission
  const handleSubmitRequest = async () => {
    if (!user?.id) {
      alert('User not logged in');
      return;
    }

    if (requestForm.selectedMeetings.length === 0) {
      alert('Please select at least one meeting');
      return;
    }

    if (
      !requestForm.requestTypes.leavingEarly &&
      !requestForm.requestTypes.comingLate &&
      !requestForm.requestTypes.goingOnline
    ) {
      alert('Please select at least one request type');
      return;
    }

    if (!requestForm.explanation.trim()) {
      alert('Please provide an explanation');
      return;
    }

    // Map frontend form data to backend format
    // attendanceMode: if goingOnline is checked, use ONLINE, otherwise IN_PERSON
    const attendanceMode = requestForm.requestTypes.goingOnline
      ? 'ONLINE'
      : 'IN_PERSON';

    // timeAdjustment: can only have one (leavingEarly or comingLate)
    let timeAdjustment: 'ARRIVING_LATE' | 'LEAVING_EARLY' | undefined =
      undefined;
    if (
      requestForm.requestTypes.leavingEarly &&
      requestForm.requestTypes.comingLate
    ) {
      alert(
        'Please select only one time adjustment (either leaving early OR coming late)',
      );
      return;
    } else if (requestForm.requestTypes.leavingEarly) {
      timeAdjustment = 'LEAVING_EARLY';
    } else if (requestForm.requestTypes.comingLate) {
      timeAdjustment = 'ARRIVING_LATE';
    }

    try {
      // For each selected meeting, get or create attendance record, then create request
      const requests = [];
      for (const meetingId of requestForm.selectedMeetings) {
        // Use the attendance_update endpoint which uses upsertAttendance
        // This will create or update the attendance record
        const attendanceResponse = await fetch('/api/users/attendance_update', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.id,
            meetingId: meetingId,
            status: 'PENDING',
          }),
        });

        if (!attendanceResponse.ok) {
          throw new Error(
            `Failed to create/update attendance for meeting ${meetingId}`,
          );
        }

        // Fetch the user's attendance to find the one we just created/updated
        const userAttendanceResponse = await fetch(
          `/api/attendance/user/${user.id}`,
        );
        if (!userAttendanceResponse.ok) {
          throw new Error('Failed to fetch attendance record'); // single quotes
        }

        const userAttendance = await userAttendanceResponse.json();
        const attendanceRecord = userAttendance.find(
          (a: any) => a.meetingId === meetingId,
        );

        if (!attendanceRecord || !attendanceRecord.attendanceId) {
          throw new Error(
            `Attendance record not found for meeting ${meetingId}`,
          );
        }

        const attendanceId = attendanceRecord.attendanceId;

        // Now create the request
        const requestPayload: any = {
          attendanceId,
          reason: requestForm.explanation,
          attendanceMode,
        };

        if (timeAdjustment) {
          requestPayload.timeAdjustment = timeAdjustment;
        }

        const requestResponse = await fetch('/api/requests', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestPayload),
        });

        if (!requestResponse.ok) {
          const errorData = await requestResponse.json();
          throw new Error(
            errorData.error ||
              `Failed to create request for meeting ${meetingId}`,
          );
        }

        const newRequest = await requestResponse.json();
        requests.push(newRequest);
      }

      alert(`Successfully created ${requests.length} request(s)!`);

      // Reset form and close modal
      setRequestForm({
        selectedMeetings: [],
        requestTypes: {
          leavingEarly: false,
          comingLate: false,
          goingOnline: false,
        },
        explanation: '',
      });
      setShowCreateRequestModal(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      alert(`Failed to create request: ${message}`);
    }
  };

  const handleDeleteMeeting = async () => {
    if (!deleteMeeting) return;

    try {
      const response = await fetch(`/api/meeting/${deleteMeeting.meetingId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        alert(
          `Failed to delete meeting: ${errorData.error || 'Unknown error'}`,
        );
        return;
      }

      alert('Meeting deleted successfully!');
      // Refresh meetings list
      fetchMeetings();

      // Close modal and reset
      setShowDeleteMeetingModal(false);
      setDeleteMeeting(null);
    } catch {
      alert('Failed to delete meeting. Please try again.');
    }
  };

  // visibleMeetings are meetings post-type-filter - sorted by most recent date
  const visibleMeetings = (
    typeFilter
      ? filteredMeetings.filter((m) => m.type === typeFilter)
      : filteredMeetings
  ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Determine banner color based on remaining absences
  const getBannerColor = () => {
    if (!remainingAbsences) return 'bg-blue-50 border-blue-200';

    const regularRemaining = remainingAbsences.regular.remaining;
    const fullBodyRemaining = remainingAbsences.fullBody.remaining;

    // Red if no absences left for either type
    if (regularRemaining === 0 || fullBodyRemaining === 0) {
      return 'bg-red-50 border-red-200';
    }
    // Yellow if 1 remaining for regular
    if (regularRemaining <= 1) {
      return 'bg-yellow-50 border-yellow-200';
    }
    // Green if okay
    return 'bg-green-50 border-green-200';
  };

  return (
    <div className='flex-1 p-6 bg-gray-50'>
      {/* Header Section */}
      <ViewRequestsPanel
        isMember={isMember}
        setShowCreateRequestModal={setShowCreateRequestModal}
        setShowMyRequestsModal={setShowMyRequestsModal}
        setMyRequests={setMyRequests}
        user={user}
      />

      {/* Remaining Unexcused Absences Banner */}
      {remainingAbsences && (
        <AbsencesBanner
          remainingAbsences={remainingAbsences}
          bannerColor={getBannerColor()}
        />
      )}

      <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
        {/* Left Panel - Statistics */}
        <MeetingStatisticsPanel
          attendedMeetings={attendedMeetings}
          missedMeetings={missedMeetings}
          upcomingMeetings={upcomingMeetingsList.length}
          canManageMeetings={canManageMeetings}
          setShowCreateMeetingModal={setShowCreateMeetingModal}
        />

        {/* Right Panel - Meeting History */}
        <div className='lg:col-span-2'>
          <MeetingHistoryPanel
            setActiveTab={setActiveTab}
            activeTab={activeTab}
            typeFilter={typeFilter}
            setTypeFilter={setTypeFilter}
            meetings={meetings}
            handleEditMeeting={handleEditMeeting}
            handleDeleteMeeting={handleSetDeleteMeeting}
            visibleMeetings={visibleMeetings}
          />
        </div>
      </div>

      {/* Create Meeting Modal */}
      {showCreateMeetingModal && (
        <CreateMeetingModal
          newMeeting={newMeeting}
          setNewMeeting={setNewMeeting}
          members={members}
          toggleAllMembersSelection={toggleAllMembersSelection}
          toggleNonEboardSelection={toggleNonEboardSelection}
          bulkSelectButtonClasses={bulkSelectButtonClasses}
          bulkSelectionActive={bulkSelectionActive}
          setMeetings={setMeetings}
          setShowCreateMeetingModal={setShowCreateMeetingModal}
        />
      )}

      {/* Edit Meeting Modal */}
      {showEditMeetingModal && editingMeeting && (
        <EditMeetingModal
          selectedUserIds={selectedUserIds}
          setSelectedUserIds={setSelectedUserIds}
          editMeeting={editMeeting}
          handleUpdateMeeting={handleUpdateMeeting}
          setEditMeeting={setEditMeeting}
          setShowEditMeetingModal={setShowEditMeetingModal}
          setEditingMeeting={setEditingMeeting}
        />
      )}

      {/* Delete Meeting Modal */}
      {showDeleteMeetingModal && deleteMeeting && (
        <DeleteMeetingModal
          handleDeleteMeeting={handleDeleteMeeting}
          setShowDeleteMeetingModal={setShowDeleteMeetingModal}
          deleteMeeting={deleteMeeting}
        />
      )}

      {/* Create Request Modal - For Members */}
      {showCreateRequestModal && (
        <CreateRequestModal
          upcomingMeetingsList={upcomingMeetingsList}
          requestForm={requestForm}
          setRequestForm={setRequestForm}
          setShowCreateRequestModal={setShowCreateRequestModal}
          handleSubmitRequest={handleSubmitRequest}
        />
      )}

      {/* View My Requests Modal - For Members (Pending only) */}
      {showMyRequestsModal && (
        <ViewRequestsModal
          myRequests={myRequests}
          setShowMyRequestsModal={setShowMyRequestsModal}
        />
      )}
    </div>
  );
};

export default MeetingsPage;
