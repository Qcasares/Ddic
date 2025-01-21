import { useState, useEffect, useCallback, useRef } from 'react';

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
  const [version, setVersion] = useState(0);

  // Store fetcher in a ref to prevent unnecessary re-renders
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const invalidateCache = useCallback(() => {
    cache.delete(key);
    setVersion(v => v + 1);
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
      const freshData = await fetcherRef.current();
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
  }, [key, ttl]);

  useEffect(() => {
    let isMounted = true;
    const cached = cache.get(key);
    const now = Date.now();

    if (cached && now - cached.timestamp < ttl) {
      setData(cached.data);
      setIsLoading(false);
      return;
    }

    const fetchWithMountCheck = async () => {
      if (!isMounted) return;
      
      setIsLoading(true);

      try {
        const freshData = await fetcherRef.current();
        if (!isMounted) return;

        cache.set(key, { data: freshData, timestamp: now });
        setData(freshData);
        setError(null);
      } catch (err) {
        if (!isMounted) return;

        setError(err instanceof Error ? err : new Error('Failed to fetch data'));
        if (!cached) {
          setData(null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchWithMountCheck();

    return () => {
      isMounted = false;
    };
  }, [key, ttl, version]); // Remove fetcher from dependencies, use version for manual updates

  return {
    data,
    isLoading,
    error,
    refetch: () => fetchData(true),
    invalidateCache,
  };
}