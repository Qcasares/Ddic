import { supabase } from './supabase';
import { AnalyticsMetrics, AnalyticsFilter, AnalyticsEvent } from '@/types/analytics';
import { RealtimeChannel } from '@supabase/supabase-js';

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const RETRY_ATTEMPTS = 3;
const RETRY_DELAY = 1000; // 1 second

interface CacheEntry {
  data: AnalyticsMetrics;
  timestamp: number;
}

class AnalyticsService {
  private cache: Map<string, CacheEntry> = new Map();
  private realtimeChannels: Map<string, RealtimeChannel> = new Map();
  private retryTimeouts: Map<string, NodeJS.Timeout> = new Map();

  // Fetch metrics with caching and retry logic
  async getMetrics(
    dictionaryId: string,
    filter?: AnalyticsFilter
  ): Promise<AnalyticsMetrics> {
    const cacheKey = this.getCacheKey(dictionaryId, filter);
    const cached = this.cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data;
    }

    try {
      const metrics = await this.fetchMetrics(dictionaryId, filter);
      this.cache.set(cacheKey, {
        data: metrics,
        timestamp: Date.now(),
      });
      return metrics;
    } catch (error) {
      return this.handleError(error, dictionaryId, filter);
    }
  }

  // Track analytics events
  async trackEvent(event: Omit<AnalyticsEvent, 'id' | 'createdAt'>): Promise<void> {
    try {
      const { error } = await supabase
        .from('analytics_events')
        .insert([event]);

      if (error) throw error;
    } catch (error) {
      console.error('Failed to track analytics event:', error);
      // Queue for retry
      this.queueEventRetry(event);
    }
  }

  // Subscribe to real-time updates
  subscribe(
    dictionaryId: string,
    callback: (metrics: AnalyticsMetrics) => void
  ): () => void {
    const channel = supabase
      .channel(`analytics:${dictionaryId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'analytics_events',
          filter: `dictionary_id=eq.${dictionaryId}`,
        },
        async () => {
          // Invalidate cache
          this.invalidateCache(dictionaryId);
          // Fetch fresh metrics
          const metrics = await this.getMetrics(dictionaryId);
          callback(metrics);
        }
      )
      .subscribe();

    this.realtimeChannels.set(dictionaryId, channel);

    return () => {
      channel.unsubscribe();
      this.realtimeChannels.delete(dictionaryId);
    };
  }

  // Export analytics data
  async exportData(
    dictionaryId: string,
    filter: AnalyticsFilter
  ): Promise<Blob> {
    const metrics = await this.getMetrics(dictionaryId, filter);
    const jsonStr = JSON.stringify(metrics, null, 2);
    return new Blob([jsonStr], { type: 'application/json' });
  }

  private async fetchMetrics(
    dictionaryId: string,
    filter?: AnalyticsFilter
  ): Promise<AnalyticsMetrics> {
    const timeframe = filter?.timeframe || 'day';
    const startDate = filter?.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const endDate = filter?.endDate || new Date().toISOString();

    const { data, error } = await supabase
      .rpc('get_dictionary_metrics', {
        p_dictionary_id: dictionaryId,
        p_start_date: startDate,
        p_end_date: endDate
      });

    if (error) throw error;

    // Transform the data into the expected format
    return {
      id: dictionaryId,
      dictionaryId,
      totalEntries: data.total_events || 0,
      activity: {
        views: data.views || 0,
        edits: data.edits || 0,
        searches: data.searches || 0,
        activeUsers: data.unique_users || 0,
        uniqueVisitors: data.unique_users || 0,
        averageSessionDuration: 0, // Calculate from session data
      },
      performance: {
        avgLoadTime: 0,
        avgInteractionTime: 0,
        deviceTypes: {},
        errorRates: {},
      },
      trends: {
        daily: [],
        weekly: [],
        monthly: [],
      },
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };
  }

  private async handleError(
    error: any,
    dictionaryId: string,
    filter?: AnalyticsFilter
  ): Promise<AnalyticsMetrics> {
    console.error('Analytics error:', error);

    // Return cached data if available, even if expired
    const cached = this.cache.get(this.getCacheKey(dictionaryId, filter));
    if (cached) {
      return cached.data;
    }

    // Return empty metrics if no cache available
    return {
      id: dictionaryId,
      dictionaryId,
      totalEntries: 0,
      activity: {
        views: 0,
        edits: 0,
        searches: 0,
        activeUsers: 0,
        uniqueVisitors: 0,
        averageSessionDuration: 0,
      },
      performance: {
        avgLoadTime: 0,
        avgInteractionTime: 0,
        deviceTypes: {},
        errorRates: {},
      },
      trends: {
        daily: [],
        weekly: [],
        monthly: [],
      },
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };
  }

  private getCacheKey(dictionaryId: string, filter?: AnalyticsFilter): string {
    if (!filter) return dictionaryId;
    return `${dictionaryId}:${JSON.stringify(filter)}`;
  }

  private invalidateCache(dictionaryId: string): void {
    for (const [key] of this.cache) {
      if (key.startsWith(dictionaryId)) {
        this.cache.delete(key);
      }
    }
  }

  private queueEventRetry(event: Omit<AnalyticsEvent, 'id' | 'createdAt'>): void {
    const key = `${event.dictionaryId}:${Date.now()}`;
    let attempts = 0;

    const retry = async () => {
      if (attempts >= RETRY_ATTEMPTS) {
        this.retryTimeouts.delete(key);
        return;
      }

      attempts++;
      try {
        await this.trackEvent(event);
        this.retryTimeouts.delete(key);
      } catch (error) {
        const timeout = setTimeout(retry, RETRY_DELAY * Math.pow(2, attempts));
        this.retryTimeouts.set(key, timeout);
      }
    };

    const timeout = setTimeout(retry, RETRY_DELAY);
    this.retryTimeouts.set(key, timeout);
  }

  // Cleanup method
  destroy(): void {
    // Clear all caches and subscriptions
    this.cache.clear();
    for (const channel of this.realtimeChannels.values()) {
      channel.unsubscribe();
    }
    this.realtimeChannels.clear();
    for (const timeout of this.retryTimeouts.values()) {
      clearTimeout(timeout);
    }
    this.retryTimeouts.clear();
  }
}

// Export singleton instance
export const analyticsService = new AnalyticsService();