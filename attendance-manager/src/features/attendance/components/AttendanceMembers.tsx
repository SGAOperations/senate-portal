import { UserApiData } from '@/types';
import React from 'react';

interface AttendanceMembersProps {
  eboardMembers: UserApiData[];
  regularMembers: UserApiData[];
  loading?: boolean;

  setDeleteUser: (userId: UserApiData | null) => void;
}

const AttendanceMembers: React.FC<AttendanceMembersProps> = ({
  eboardMembers,
  regularMembers,
  loading = false,
  setDeleteUser,
}) => {
  // Loading screen
  if (loading) {
    return (
      <div className='flex-1 p-6 bg-gray-50'>
        <div className='flex items-center justify-center h-64'>
          <div className='text-center'>
            <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-[#C8102E] mx-auto mb-4'></div>
            <p className='text-gray-600'>Loading members...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
      {/* Eboard Members */}
      <div className='bg-white rounded-2xl shadow-lg p-6 border border-gray-100'>
        <h2 className='text-xl font-semibold text-gray-900 mb-4'>Eboard</h2>
        <div className='space-y-3 max-h-64 overflow-y-auto'>
          {eboardMembers.map((member) => (
            <div
              key={member.userId}
              className='flex items-center space-x-3 p-3 bg-gray-50 rounded-lg'
            >
              <div className='w-10 h-10 bg-[#C8102E] rounded-full flex items-center justify-center'>
                <span className='text-white text-sm font-semibold'>
                  {member.firstName.charAt(0)}
                </span>
              </div>
              <div className='flex-1'>
                <p className='text-sm font-medium text-gray-900'>
                  {member.firstName} {member.lastName}
                </p>
                <p className='text-xs text-gray-500'>{member.email}</p>
              </div>
              <button
                onClick={() => setDeleteUser(member)}
                className='text-red-400 hover:text-red-600 text-xs font-medium'
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Regular Members */}
      <div className='bg-white rounded-2xl shadow-lg p-6 border border-gray-100'>
        <h2 className='text-xl font-semibold text-gray-900 mb-4'>Members</h2>
        <div className='space-y-3 max-h-64 overflow-y-auto'>
          {regularMembers.map((member) => (
            <div
              key={member.userId}
              className='flex items-center space-x-3 p-3 bg-gray-50 rounded-lg'
            >
              <div className='w-10 h-10 bg-[#C8102E] rounded-full flex items-center justify-center'>
                <span className='text-white text-sm font-semibold'>
                  {member.firstName.charAt(0)}
                </span>
              </div>
              <div className='flex-1'>
                <p className='text-sm font-medium text-gray-900'>
                  {member.firstName} {member.lastName}
                </p>
                <p className='text-xs text-gray-500'>{member.email}</p>
              </div>
              <button
                onClick={() => setDeleteUser(member)}
                className='text-red-400 hover:text-red-600 text-xs font-medium'
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AttendanceMembers;
