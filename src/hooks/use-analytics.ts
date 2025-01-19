import { useState, useEffect, useCallback } from 'react';
import { analyticsService } from '@/lib/analytics-service';
import { AnalyticsMetrics, AnalyticsFilter } from '@/types/analytics';

interface UseAnalyticsOptions {
  filter?: AnalyticsFilter;
  enableRealtime?: boolean;
}

interface UseAnalyticsResult {
  metrics: AnalyticsMetrics | null;
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  exportData: () => Promise<void>;
}

export function useAnalytics(
  dictionaryId: string,
  options: UseAnalyticsOptions = {}
): UseAnalyticsResult {
  const [metrics, setMetrics] = useState<AnalyticsMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchMetrics = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await analyticsService.getMetrics(dictionaryId, options.filter);
      setMetrics(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch metrics'));
    } finally {
      setIsLoading(false);
    }
  }, [dictionaryId, options.filter]);

  // Initial fetch
  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  // Set up real-time updates if enabled
  useEffect(() => {
    if (!options.enableRealtime) return;

    const unsubscribe = analyticsService.subscribe(dictionaryId, (newMetrics) => {
      setMetrics(newMetrics);
    });

    return () => {
      unsubscribe();
    };
  }, [dictionaryId, options.enableRealtime]);

  // Track page view
  useEffect(() => {
    analyticsService.trackEvent({
      dictionaryId,
      eventType: 'view',
      eventData: {},
      userId: 'current-user-id', // Replace with actual user ID
    });
  }, [dictionaryId]);

  // Export functionality
  const exportData = async () => {
    try {
      const blob = await analyticsService.exportData(dictionaryId, options.filter || {
        timeframe: 'month',
      });
      
      // Create download link
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analytics-${dictionaryId}-${new Date().toISOString()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to export data'));
    }
  };

  return {
    metrics,
    isLoading,
    error,
    refresh: fetchMetrics,
    exportData,
  };
}

// Utility hook for tracking custom events
export function useAnalyticsEvent(dictionaryId: string) {
  return useCallback(
    (eventType: string, eventData: Record<string, any> = {}) => {
      return analyticsService.trackEvent({
        dictionaryId,
        eventType,
        eventData,
        userId: 'current-user-id', // Replace with actual user ID
      });
    },
    [dictionaryId]
  );
}