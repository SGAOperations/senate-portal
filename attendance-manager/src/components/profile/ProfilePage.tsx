import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';

const ProfilePage: React.FC = () => {
  const { user, logout } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const isAdmin = user?.role === 'EBOARD';
  const handleLogout = () => {
    logout();
  };

  /* Maps enum value to appropriate plain text */
  const rolePlainText = (role?: string) => {
    switch (role) {
      case 'EBOARD':
        return 'E-Board';
      case 'MEMBER':
        return 'Member';
      default:
        return role;
    }
  };

  if (!user) {
    return (
      <div className='flex-1 p-6 bg-gray-50'>
        <div className='text-center py-12'>
          <p className='text-gray-500'>User not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className='flex-1 p-6 bg-gray-50'>
      {/* Header Section */}
      <div className='mb-6'>
        <h1 className='text-2xl font-bold text-gray-900 mb-2'>Profile</h1>
        <p className='text-gray-600'>
          View and manage your account information
        </p>
      </div>

      <div className='max-w-2xl mx-auto'>
        {/* Profile Card */}
        <div className='bg-white rounded-2xl shadow-lg p-8 border border-gray-100'>
          {/* Profile Header */}
          <div className='text-center mb-8'>
            <div className='w-24 h-24 bg-[#C8102E] rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg'>
              <span className='text-white text-3xl font-bold'>
                {user.name?.charAt(0).toUpperCase()}
              </span>
            </div>
            <h2 className='text-2xl font-bold text-gray-900'>{user.name}</h2>
            <p className='text-gray-600'>{rolePlainText(user?.role)} Account</p>
          </div>

          {/* Profile Information */}
          <div className='space-y-6'>
            <div>
              <label className='block text-sm font-medium text-gray-700 mb-2'>
                Full Name
              </label>
              <div className='w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-900'>
                {user.name}
              </div>
            </div>

            <div>
              <label className='block text-sm font-medium text-gray-700 mb-2'>
                Email Address
              </label>
              <div className='w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-900'>
                {user.email}
              </div>
            </div>

            <div>
              <label className='block text-sm font-medium text-gray-700 mb-2'>
                Account Role
              </label>
              <div className='w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 capitalize'>
                {rolePlainText(user?.role)}
              </div>
            </div>

            <div>
              <label className='block text-sm font-medium text-gray-700 mb-2'>
                Account Status
              </label>
              <div className='flex items-center'>
                <div className='w-3 h-3 bg-green-500 rounded-full mr-2'></div>
                <span className='text-green-700 font-medium'>Active</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div
            className={`flex space-x-4 mt-8 pt-6 border-t border-gray-200 ${
              isAdmin ? '' : 'justify-center'
            }`}
          >
            {isAdmin && (
              <button
                onClick={() => setIsEditing(!isEditing)}
                className='flex-1 px-4 py-2 bg-[#C8102E] text-white rounded-lg hover:bg-[#A8102E] transition-colors'
              >
                {isEditing ? 'Cancel Edit' : 'Edit Profile'}
              </button>
            )}
            <button
              onClick={() => setShowLogoutModal(true)}
              className={`px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors ${
                isAdmin ? 'flex-1' : 'px-8'
              }`}
            >
              Sign Out
            </button>
          </div>
        </div>

        {/* Additional Info Card */}
        <div className='bg-white rounded-2xl shadow-lg p-6 border border-gray-100 mt-6'>
          <h3 className='text-lg font-semibold text-gray-900 mb-4'>
            Account Information
          </h3>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-4 text-sm'>
            <div>
              <span className='text-gray-500'>Coming Soon</span>
            </div>
          </div>
        </div>
      </div>

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'>
          <div className='bg-white rounded-2xl p-6 w-full max-w-md mx-4'>
            <h3 className='text-lg font-semibold text-gray-900 mb-4'>
              Confirm Sign Out
            </h3>
            <p className='text-gray-600 mb-6'>
              Are you sure you want to sign out of your account?
            </p>
            <div className='flex space-x-3'>
              <button
                onClick={() => setShowLogoutModal(false)}
                className='flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50'
              >
                Cancel
              </button>
              <button
                onClick={handleLogout}
                className='flex-1 px-4 py-2 bg-[#C8102E] text-white rounded-lg hover:bg-[#A8102E]'
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfilePage;
