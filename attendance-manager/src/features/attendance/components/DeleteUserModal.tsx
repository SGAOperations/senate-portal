import { UserApiData } from '@/types';
import { CircleAlert } from 'lucide-react';
import React from 'react';

interface DeleteUserModalProps {
  deleteUser: UserApiData;

  onDeleteUser: (userId: string) => void;

  setDeleteUser: (user: UserApiData | null) => void;
}

const DeleteUserModal: React.FC<DeleteUserModalProps> = ({
  deleteUser,
  onDeleteUser,
  setDeleteUser,
}) => {
  const fullName = `${deleteUser.firstName} ${deleteUser.lastName}`;

  return (
    <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'>
      <div className='w-full max-w-md mx-4 bg-white rounded-2xl shadow-xl p-6'>
        {/* Header */}
        <div className='flex items-center gap-3 mb-4'>
          <CircleAlert />
          <h3 className='text-lg font-semibold text-gray-900'>Delete User</h3>
        </div>

        {/* Message */}
        <p className='text-gray-600 mb-6 leading-relaxed'>
          Are you sure you want to delete{' '}
          <span className='font-semibold text-gray-900'>{fullName}</span>? This
          action cannot be undone.
        </p>

        {/* Actions */}
        <div className='flex gap-3'>
          <button
            type='button'
            onClick={() => setDeleteUser(null)}
            className='flex-1 px-4 py-2.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition'
          >
            Cancel
          </button>

          <button
            type='button'
            onClick={() => {
              onDeleteUser(deleteUser.userId);
              setDeleteUser(null);
            }}
            className='flex-1 px-4 py-2.5 rounded-lg bg-red-600 text-white hover:bg-red-700 transition'
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteUserModal;
