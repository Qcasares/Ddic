import { supabase } from './supabase';
import {
  AnalyticsMetrics,
  AnalyticsFilter,
  AnalyticsEvent,
  TrendMetrics,
  MetricPoint
} from '@/types/analytics';
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
    const timeframes: { [K in keyof TrendMetrics]: Date } = {
      day: new Date(Date.now() - 24 * 60 * 60 * 1000),
      week: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      month: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      year: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)
    };

    const endDate = new Date();

    // Fetch daily metrics for all timeframes
    const dailyMetricsPromises = Object.entries(timeframes).map(async ([timeframe, startDate]) => {
      const { data, error } = await supabase
        .from('daily_metrics')
        .select('*')
        .eq('dictionary_id', dictionaryId)
        .gte('day', startDate.toISOString())
        .lte('day', endDate.toISOString())
        .order('day', { ascending: true });

      if (error) throw error;
      return { timeframe, data: data || [] };
    });

    const allMetrics = await Promise.all(dailyMetricsPromises);
    const metricsByTimeframe = new Map(
      allMetrics.map(({ timeframe, data }) => [
        timeframe,
        data.map((metric: any): MetricPoint => ({
          timestamp: metric.day,
          value: metric.total_events || 0,
          views: metric.views || 0,
          activeUsers: metric.unique_users || 0,
          searches: metric.searches || 0,
          loadTime: 0,
          interactionTime: 0
        }))
      ])
    );

    const trends: TrendMetrics = {
      day: metricsByTimeframe.get('day') || [],
      week: metricsByTimeframe.get('week') || [],
      month: metricsByTimeframe.get('month') || [],
      year: metricsByTimeframe.get('year') || []
    };

    // Get current totals from the latest timeframe data
    const currentTimeframe = filter?.timeframe || 'month';
    const latestMetrics = allMetrics.find(m => m.timeframe === currentTimeframe)?.data || [];
    const totals = latestMetrics.reduce((acc: any, curr: any) => ({
      views: (acc.views || 0) + (curr.views || 0),
      edits: (acc.edits || 0) + (curr.edits || 0),
      searches: (acc.searches || 0) + (curr.searches || 0),
      unique_users: Math.max(acc.unique_users || 0, curr.unique_users || 0),
      total_events: (acc.total_events || 0) + (curr.total_events || 0)
    }), {});

    return {
      id: dictionaryId,
      dictionaryId,
      totalEntries: totals.total_events || 0,
      activity: {
        views: totals.views || 0,
        edits: totals.edits || 0,
        searches: totals.searches || 0,
        activeUsers: totals.unique_users || 0,
        uniqueVisitors: totals.unique_users || 0,
        averageSessionDuration: 0,
      },
      performance: {
        avgLoadTime: 0,
        avgInteractionTime: 0,
        deviceTypes: {},
        errorRates: {},
      },
      trends,
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
        day: [],
        week: [],
        month: [],
        year: []
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