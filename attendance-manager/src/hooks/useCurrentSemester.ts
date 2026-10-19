import { useEffect, useState } from 'react';
import { SemesterApiData } from '@/types';

export function useCurrentSemester(): SemesterApiData | null {
  const [semester, setSemester] = useState<SemesterApiData | null>(null);

  useEffect(() => {
    fetch('/api/semester/current')
      .then((res) => (res.ok ? res.json() : null))
      .then(setSemester)
      .catch(() => setSemester(null));
  }, []);

  return semester;
}
