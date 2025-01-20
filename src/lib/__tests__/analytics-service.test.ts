import { analyticsService } from '../analytics-service';
import { supabase } from '../supabase';
import type { AnalyticsEvent } from '@/types/analytics';

// Mock Supabase client
jest.mock('../supabase', () => ({
  supabase: {
    from: jest.fn().mockReturnValue({
      insert: jest.fn().mockResolvedValue({ error: null }),
      select: jest.fn().mockResolvedValue({ data: [], error: null }),
    }),
    rpc: jest.fn().mockResolvedValue({
      data: {
        total_events: 100,
        views: 1000,
        edits: 50,
        searches: 500,
        unique_users: 200,
      },
      error: null,
    }),
    channel: jest.fn().mockReturnValue({
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn().mockReturnThis(),
      unsubscribe: jest.fn(),
    }),
  },
}));

describe('AnalyticsService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getMetrics', () => {
    it('should fetch and cache metrics', async () => {
      const metrics = await analyticsService.getMetrics('test-dict-id');

      expect(supabase.rpc).toHaveBeenCalledWith(
        'get_dictionary_metrics',
        expect.any(Object)
      );
      expect(metrics).toMatchObject({
        id: 'test-dict-id',
        totalEntries: 100,
        activity: {
          views: 1000,
          edits: 50,
          searches: 500,
          activeUsers: 200,
        },
      });

      // Should use cached data on second call
      const secondMetrics = await analyticsService.getMetrics('test-dict-id');
      expect(supabase.rpc).toHaveBeenCalledTimes(1);
      expect(secondMetrics).toEqual(metrics);
    });

    it('should handle errors gracefully', async () => {
      (supabase.rpc as jest.Mock).mockRejectedValueOnce(new Error('API Error'));

      const metrics = await analyticsService.getMetrics('test-dict-id');

      expect(metrics).toMatchObject({
        id: 'test-dict-id',
        totalEntries: 0,
        activity: {
          views: 0,
          edits: 0,
          searches: 0,
          activeUsers: 0,
        },
      });
    });
  });

  describe('trackEvent', () => {
    it('should track analytics events', async () => {
      const event: Omit<AnalyticsEvent, 'id' | 'createdAt'> = {
        dictionaryId: 'test-dict-id',
        eventType: 'view',
        eventData: {},
        userId: 'test-user',
      };

      await analyticsService.trackEvent(event);

      expect(supabase.from).toHaveBeenCalledWith('analytics_events');
      expect(supabase.from('analytics_events').insert).toHaveBeenCalledWith([
        event,
      ]);
    });

    it('should retry failed events', async () => {
      const event: Omit<AnalyticsEvent, 'id' | 'createdAt'> = {
        dictionaryId: 'test-dict-id',
        eventType: 'view',
        eventData: {},
        userId: 'test-user',
      };

      jest.spyOn(supabase.from('analytics_events'), 'insert')
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ error: null });

      await analyticsService.trackEvent(event);

      // Wait for retry
      await new Promise((resolve) => setTimeout(resolve, 1100));

      expect(supabase.from('analytics_events').insert).toHaveBeenCalledTimes(2);
    });
  });

  describe('subscribe', () => {
    it('should set up real-time subscription', () => {
      const callback = jest.fn();
      const unsubscribe = analyticsService.subscribe('test-dict-id', callback);

      expect(supabase.channel).toHaveBeenCalledWith('analytics:test-dict-id');
      expect(unsubscribe).toBeInstanceOf(Function);
    });

    it('should clean up subscription on unsubscribe', () => {
      const callback = jest.fn();
      const unsubscribe = analyticsService.subscribe('test-dict-id', callback);
      const channelMock = supabase.channel('analytics:test-dict-id');

      unsubscribe();

      expect(channelMock.unsubscribe).toHaveBeenCalled();
    });
  });

  describe('exportData', () => {
    it('should export analytics data as blob', async () => {
      const metrics = await analyticsService.getMetrics('test-dict-id');
      const blob = await analyticsService.exportData('test-dict-id', {
        timeframe: 'month',
      });

      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('application/json');

      const text = await blob.text();
      const data = JSON.parse(text);
      expect(data).toEqual(metrics);
    });
  });

  describe('cleanup', () => {
    it('should clean up resources on destroy', () => {
      const callback = jest.fn();
      analyticsService.subscribe('test-dict-id', callback);
      analyticsService.destroy();

      const channelMock = supabase.channel('analytics:test-dict-id');
      expect(channelMock.unsubscribe).toHaveBeenCalled();
    });
  });
});