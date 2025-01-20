import { supabase } from './supabase';
import {
  AnalyticsMetrics,
  AnalyticsFilter,
  AnalyticsEvent,
  TrendMetrics,
  DeviceInfo,
  GeolocationInfo,
  FunnelStep,
  FunnelAnalytics,
  ConversionFunnel,
  FunnelEvent,
  FunnelMetrics
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
  private currentSession: string | null = null;
  private sessionTimeout: number = 30 * 60 * 1000; // 30 minutes
  private sessionTimer: NodeJS.Timeout | null = null;

  // Session management
  async startSession(
    dictionaryId: string,
    userId: string,
    deviceInfo: DeviceInfo,
    geolocation: GeolocationInfo,
    referrer?: string,
    path?: string
  ): Promise<string> {
    try {
      const { data, error } = await supabase
        .from('user_sessions')
        .insert([{
          user_id: userId,
          dictionary_id: dictionaryId,
          device_info: deviceInfo,
          geolocation,
          referrer,
          initial_path: path,
          is_active: true
        }])
        .select('id')
        .single();

      if (error) throw error;

      this.currentSession = data.id;
      this.resetSessionTimer(userId, data.id, dictionaryId);
      return data.id;
    } catch (error) {
      console.error('Failed to start session:', error);
      throw error;
    }
  }

  async endSession(sessionId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('user_sessions')
        .update({
          session_end: new Date().toISOString(),
          is_active: false
        })
        .eq('id', sessionId);

      if (error) throw error;

      if (this.sessionTimer) {
        clearTimeout(this.sessionTimer);
        this.sessionTimer = null;
      }
      
      if (this.currentSession === sessionId) {
        this.currentSession = null;
      }
    } catch (error) {
      console.error('Failed to end session:', error);
      throw error;
    }
  }

  private resetSessionTimer(userId: string, sessionId: string, dictionaryId?: string): void {
    if (this.sessionTimer) {
      clearTimeout(this.sessionTimer);
    }

    this.sessionTimer = setTimeout(async () => {
      try {
        // Log session timeout event before ending the session
        await this.trackEvent({
          dictionaryId: dictionaryId || '',
          eventType: 'session_timeout',
          eventData: {
            userId,
            sessionId,
            timeoutAfter: this.sessionTimeout
          },
          userId
        });

        await this.endSession(sessionId);
      } catch (error) {
        console.error('Failed to handle session timeout:', error);
      }
    }, this.sessionTimeout);
  }

  // Funnel tracking
  async createFunnel(
    dictionaryId: string,
    name: string,
    steps: FunnelStep[],
    description?: string
  ): Promise<string> {
    try {
      const { data, error } = await supabase
        .from('conversion_funnels')
        .insert([{
          dictionary_id: dictionaryId,
          name,
          description,
          steps,
          created_by: (await supabase.auth.getUser()).data.user?.id
        }])
        .select('id')
        .single();

      if (error) throw error;
      return data.id;
    } catch (error) {
      console.error('Failed to create funnel:', error);
      throw error;
    }
  }

  async trackFunnelStep(
    funnelId: string,
    userId: string,
    stepNumber: number,
    stepName: string,
    completed: boolean = true
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('funnel_events')
        .insert([{
          funnel_id: funnelId,
          user_id: userId,
          session_id: this.currentSession,
          step_number: stepNumber,
          step_name: stepName,
          completed,
          completion_time: completed ? new Date().toISOString() : null
        }]);

      if (error) throw error;
    } catch (error) {
      console.error('Failed to track funnel step:', error);
      throw error;
    }
  }

  async getFunnelAnalytics(funnelId: string): Promise<FunnelAnalytics> {
    try {
      const [funnel, events] = await Promise.all([
        supabase
          .from('conversion_funnels')
          .select('*')
          .eq('id', funnelId)
          .single()
          .then(({ data, error }) => {
            if (error) throw error;
            return data;
          }),
        supabase
          .from('funnel_events')
          .select('*')
          .eq('funnel_id', funnelId)
          .order('created_at', { ascending: true })
          .then(({ data, error }) => {
            if (error) throw error;
            return data;
          })
      ]);

      // Transform database records to match our TypeScript interfaces
      const transformedEvents: FunnelEvent[] = events.map((e: any) => ({
        id: e.id,
        funnelId: e.funnel_id,
        userId: e.user_id,
        sessionId: e.session_id,
        stepNumber: e.step_number,
        stepName: e.step_name,
        completed: e.completed,
        completionTime: e.completion_time,
        createdAt: e.created_at
      } satisfies FunnelEvent));

      const transformedFunnel: ConversionFunnel = {
        id: funnel.id,
        dictionaryId: funnel.dictionary_id,
        name: funnel.name,
        description: funnel.description,
        steps: funnel.steps,
        createdAt: funnel.created_at,
        updatedAt: funnel.updated_at,
        createdBy: funnel.created_by,
        isActive: funnel.is_active
      };

      const metrics = this.calculateFunnelMetrics(transformedFunnel, transformedEvents);

      return {
        funnel: transformedFunnel,
        metrics,
        events: transformedEvents
      };
    } catch (error) {
      console.error('Failed to get funnel analytics:', error);
      throw error;
    }
  }

  private calculateFunnelMetrics(funnel: ConversionFunnel, events: FunnelEvent[]): FunnelMetrics {
    const totalEntries = events.filter(e => e.stepNumber === 1).length;
    const stepMetrics = funnel.steps.map((step: FunnelStep, index: number) => {
      const stepEvents = events.filter(e => e.stepNumber === index + 1);
      const entryCount = stepEvents.length;
      const completedCount = stepEvents.filter(e => e.completed).length;
      const exitCount = entryCount - completedCount;
      const conversionRate = entryCount ? completedCount / entryCount : 0;

      const completionTimes = stepEvents
        .filter((e): e is FunnelEvent & { completionTime: string; createdAt: string } =>
          e.completed &&
          typeof e.completionTime === 'string' &&
          typeof e.createdAt === 'string'
        )
        .map(e => new Date(e.completionTime).getTime() - new Date(e.createdAt).getTime());
      
      const averageTime = completionTimes.length
        ? completionTimes.reduce((a, b) => a + b, 0) / completionTimes.length
        : 0;

      return {
        name: step.name,
        entryCount,
        exitCount,
        conversionRate,
        averageTime
      };
    });

    const overallConversion = totalEntries
      ? (events.filter(e => e.stepNumber === funnel.steps.length && e.completed).length / totalEntries)
      : 0;

    return {
      funnelId: funnel.id,
      name: funnel.name,
      totalEntries,
      conversionRate: overallConversion,
      steps: stepMetrics
    };
  }

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
        .insert([{
          dictionary_id: event.dictionaryId,
          event_type: event.eventType,
          event_data: event.eventData,
          user_id: event.userId
        }]);

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
    const { data: metricsData, error } = await supabase
      .rpc('get_dictionary_metrics', {
        p_dictionary_id: dictionaryId,
        p_start_date: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
        p_end_date: new Date().toISOString()
      });

    if (error) throw error;

    const trends: TrendMetrics = {
      day: [],
      week: [],
      month: [],
      year: []
    };

    // Group and transform metrics by timeframe
    metricsData?.forEach((metric: any) => {
      if (trends[metric.timeframe as keyof TrendMetrics]) {
        trends[metric.timeframe as keyof TrendMetrics].push(({
          timestamp: metric.period_start,
          value: metric.total_events || 0,
          views: metric.views || 0,
          activeUsers: metric.unique_users || 0,
          searches: metric.searches || 0,
          loadTime: 0,
          interactionTime: 0
        }) satisfies TrendMetrics[keyof TrendMetrics][number]);
      }
    });

    // Get current totals from the latest data point in the selected timeframe
    const currentTimeframe = filter?.timeframe || 'month';
    const currentMetrics = metricsData?.filter((m: any) => m.timeframe === currentTimeframe)
      .reduce((latest: any, current: any) => {
        if (!latest || new Date(current.period_start) > new Date(latest.period_start)) {
          return current;
        }
        return latest;
      }, null) || {};

    return {
      id: dictionaryId,
      dictionaryId,
      totalEntries: currentMetrics.total_events || 0,
      activity: {
        views: currentMetrics.views || 0,
        edits: currentMetrics.edits || 0,
        searches: currentMetrics.searches || 0,
        activeUsers: currentMetrics.unique_users || 0,
        uniqueVisitors: currentMetrics.unique_users || 0,
        averageSessionDuration: 0,
        totalSessions: currentMetrics.total_sessions || 0,
        bounceRate: 0
      },
      performance: {
        avgLoadTime: 0,
        avgInteractionTime: 0,
        deviceTypes: {},
        errorRates: {},
        timeToFirstInteraction: 0,
        serverResponseTime: 0
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
        totalSessions: 0,
        bounceRate: 0
      },
      performance: {
        avgLoadTime: 0,
        avgInteractionTime: 0,
        deviceTypes: {},
        errorRates: {},
        timeToFirstInteraction: 0,
        serverResponseTime: 0
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