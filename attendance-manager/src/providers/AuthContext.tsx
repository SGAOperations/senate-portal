'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react';
import { loginUrl, logoutUrl } from '@nusgaops/sgauth/urls';
import { User, AuthContextType, PendingRegistration } from '../types';

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

/**
 * The signed-in user, from /api/users/me. Sign-in and sign-out happen on
 * SGAuth; this only reads who the server says is signed in. The browser never
 * sees the SGAuth cookie or token.
 */
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [pendingRegistration, setPendingRegistration] =
    useState<PendingRegistration | null>(null);
  const [noAccess, setNoAccess] = useState<PendingRegistration | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/users/me', { cache: 'no-store' });
      const body = await res.json().catch(() => null);
      setUser(null);
      setPendingRegistration(null);
      setNoAccess(null);
      if (res.ok && body?.status === 'ok') {
        const me = body.user;
        setUser({
          id: me.userId,
          email: me.email,
          name:
            me.firstName && me.lastName
              ? `${me.firstName} ${me.lastName}`
              : me.name,
          positions: me.positions ?? [],
          capabilities: me.capabilities ?? [],
          avatar: undefined,
        });
      } else if (res.status === 404 && body?.status === 'unregistered') {
        setPendingRegistration({ email: body.email, name: body.name });
      } else if (res.status === 403 && body?.status === 'no-access') {
        setNoAccess({ email: body.email, name: body.name });
      }
    } catch {
      setUser(null);
      setPendingRegistration(null);
      setNoAccess(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Sign-in is SGAuth's page; it sends the user back to the homepage.
  const login = () => {
    window.location.assign(loginUrl(`${window.location.origin}/homepage`));
  };

  // Global: one SGAuth session, so this signs out of every SGA tool.
  const logout = () => {
    setUser(null);
    window.location.assign(logoutUrl(`${window.location.origin}/login`));
  };

  const value: AuthContextType = {
    user,
    pendingRegistration,
    noAccess,
    login,
    logout,
    refresh,
    isLoading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
