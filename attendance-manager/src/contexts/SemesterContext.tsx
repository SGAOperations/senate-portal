'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react';
import { SemesterApiData } from '../types';

interface SemesterContextType {
  currentSemester: SemesterApiData | null;
  isLoading: boolean;
  error: string | null;
}

const SemesterContext = createContext<SemesterContextType | undefined>(
  undefined,
);

export const useCurrentSemester = () => {
  const context = useContext(SemesterContext);
  if (context === undefined) {
    throw new Error(
      'useCurrentSemester must be used within a SemesterProvider',
    );
  }
  return context;
};

interface SemesterProviderProps {
  children: ReactNode;
}

export const SemesterProvider: React.FC<SemesterProviderProps> = ({
  children,
}) => {
  const [state, setState] = useState<SemesterContextType>({
    currentSemester: null,
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    let isCancelled = false;

    const fetchCurrentSemester = async () => {
      try {
        const res = await fetch('/api/semester/current');
        if (!res.ok) {
          throw new Error(`Failed to load current semester (${res.status})`);
        }
        const semester: SemesterApiData | null = await res.json();
        if (!isCancelled) {
          setState({
            currentSemester: semester,
            isLoading: false,
            error: null,
          });
        }
      } catch (err) {
        if (!isCancelled) {
          setState({
            currentSemester: null,
            isLoading: false,
            error:
              err instanceof Error
                ? err.message
                : 'Failed to load current semester',
          });
        }
      }
    };

    fetchCurrentSemester();
    return () => {
      isCancelled = true;
    };
  }, []);

  return (
    <SemesterContext.Provider value={state}>
      {children}
    </SemesterContext.Provider>
  );
};
