import { useState, useEffect, useCallback } from 'react';

interface CacheItem<T> {
  data: T;
  timestamp: number;
}

interface CacheConfig {
  ttl?: number; // Time to live in milliseconds
  key?: string;
}

const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes
const cache = new Map<string, CacheItem<any>>();

export function useCache<T>(
  fetcher: () => Promise<T>,
  config: CacheConfig = {}
) {
  const { ttl = DEFAULT_TTL, key = 'default' } = config;
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const invalidateCache = useCallback(() => {
    cache.delete(key);
  }, [key]);

  const fetchData = useCallback(async (force = false) => {
    const cached = cache.get(key);
    const now = Date.now();

    if (!force && cached && now - cached.timestamp < ttl) {
      setData(cached.data);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const freshData = await fetcher();
      cache.set(key, { data: freshData, timestamp: now });
      setData(freshData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch data'));
      // Keep stale data if available
      if (!cached) {
        setData(null);
      }
    } finally {
      setIsLoading(false);
    }
  }, [fetcher, key, ttl]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    isLoading,
    error,
    refetch: () => fetchData(true),
    invalidateCache,
  };
}