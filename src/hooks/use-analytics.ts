import { useState, useEffect } from 'react';
import { getActivityMetrics } from '@/lib/api';

export function useAnalytics(dictionaryId: string) {
  const [metrics, setMetrics] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchMetrics() {
      try {
        const data = await getActivityMetrics(dictionaryId);
        setMetrics(data);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch metrics'));
      } finally {
        setIsLoading(false);
      }
    }

    fetchMetrics();
  }, [dictionaryId]);

  return { metrics, isLoading, error };
}