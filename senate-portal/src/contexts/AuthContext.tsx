'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';
import { User, LoginCredentials, AuthContextType } from '../types';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  // Check for existing session on mount
  useEffect(() => {
    const checkSession = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session?.user) {
          // Fetch user details from Prisma
          await loadUserProfile(session.user.id);
        }
      } catch {
        /* 'Error loading user profile:', error */
      } finally {
        setIsLoading(false);
      }
    };

    checkSession();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        await loadUserProfile(session.user.id);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const loadUserProfile = async (supabaseAuthId: string) => {
    try {
      // Fetch user from Prisma by supabaseAuthId
      const res = await fetch(`/api/users/by-supabase-id/${supabaseAuthId}`);
      if (!res.ok) throw new Error('User profile not found');

      const userDetails = await res.json();

      const user: User = {
        id: userDetails.userId,
        email: userDetails.email,
        name: `${userDetails.firstName} ${userDetails.lastName}`,
        role: userDetails.role.roleType,
        avatar: undefined,
      };

      setUser(user);
    } catch {
      /* 'Error loading user profile:', error */
    }
  };

  const login = async (credentials: LoginCredentials) => {
    setIsLoading(true);
    try {
      // Sign in with Supabase
      const { data, error } = await supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password,
      });

      if (error) {
        alert(`Error signing in: ${error}`);
        throw error;
      }

      if (data.user) {
        await loadUserProfile(data.user.id);
        router.push('/homepage');
      }
    } catch (error) {
      alert(`Error signing in: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    router.push('/login');
  };

  const value: AuthContextType = {
    user,
    login,
    // eslint-disable-next-line
    logout,
    isLoading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
