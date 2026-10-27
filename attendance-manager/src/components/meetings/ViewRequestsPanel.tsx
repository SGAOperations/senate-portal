import { RequestApiData, User } from '@/types';
import { Eye, FilePenLine } from 'lucide-react';
import React from 'react';

interface ViewRequestsProps {
  isMember: boolean;

  setShowCreateRequestModal: (show: boolean) => void;

  setShowMyRequestsModal: (show: boolean) => void;

  setMyRequests: (value: RequestApiData[]) => void;
  user: User | null;
}

const ViewRequestsPanel: React.FC<ViewRequestsProps> = ({
  isMember,
  setShowCreateRequestModal,
  setShowMyRequestsModal,
  setMyRequests,
  user,
}) => {
  return (
    <div className='mb-6 flex justify-between items-start'>
      <div>
        <h1 className='text-2xl font-bold text-gray-900 mb-2'>Meetings</h1>
        <p className='text-gray-600'>
          Track your meeting attendance and view meeting history
        </p>
      </div>
      {isMember && (
        <div className='flex flex-col space-y-3'>
          <button
            onClick={() => setShowCreateRequestModal(true)}
            className='px-6 py-3 bg-[#C8102E] text-white rounded-xl hover:bg-[#A8102E] transition-colors font-medium shadow-lg hover:shadow-xl'
          >
            <FilePenLine /> Create Request
          </button>
          <button
            onClick={async () => {
              setShowMyRequestsModal(true);
              try {
                // Fetch user's requests using the new endpoint
                const response = await fetch(
                  `/api/attendance/user/requests/${user?.id}`,
                );
                if (!response.ok) {
                  throw new Error('Failed to fetch requests');
                }
                const userRequests = await response.json();
                setMyRequests(userRequests || []);
              } catch (error) {
                const message =
                  error instanceof Error ? error.message : 'Unknown error';
                alert(`Failed to load requests: ${message}`);
                setMyRequests([]);
              }
            }}
            className='px-6 py-3 bg-[#A4804A] text-white rounded-xl hover:bg-[#8A6D3F] transition-colors font-medium shadow-lg hover:shadow-xl'
          >
            <Eye /> View My Requests
          </button>
        </div>
      )}
    </div>
  );
};

export default ViewRequestsPanel;
