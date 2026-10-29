'use client';

import { LoginCredentials, User, UserData } from '@/types';
import { useRouter } from 'next/navigation';
import { Dispatch, SetStateAction } from 'react';

export const login = async (
  credentials: LoginCredentials,
  setIsLoading: Dispatch<SetStateAction<boolean>>,
  setUser: Dispatch<SetStateAction<User>>,
  router: ReturnType<typeof useRouter>,
) => {
  setIsLoading(true);
  try {
    const res = await fetch(
      `/api/users/get-user-by-email/${credentials.email}`,
    );
    if (!res.ok) {
      throw new Error(
        `Response status: ${res.status}\n. Response Msg: ${await res.text}`,
      );
    }

    let userDetails: UserData = await res.json();
    if (
      !(
        userDetails.role.roleType === 'EBOARD' ||
        userDetails.role.roleType === 'MEMBER'
      )
    ) {
      alert('Incorrect Roles');
      return;
    }
    if (credentials.password !== userDetails.password) {
      alert('Invalid email or password');
      return;
    }

    // Mock user data based on email
    const user: User = {
      id: userDetails.userId,
      email: credentials.email,
      name: userDetails.firstName + ' ' + userDetails.lastName,
      role: userDetails.role.roleType,
      avatar: undefined,
    };

    setUser(user);
    router.push('/homepage');
  } catch (error) {
    alert(`Login failed: ${error}`);
    throw error;
  } finally {
    setIsLoading(false);
  }
};

export const logout = (setUser: (value: null) => void) => {
  setUser(null);
};
