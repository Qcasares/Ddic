export interface MetricPoint {
  timestamp: string;
  value: number;
}

export interface ActivityMetrics {
  views: number;
  edits: number;
  searches: number;
  activeUsers: number;
  uniqueVisitors: number;
  averageSessionDuration: number;
}

export interface PerformanceMetrics {
  avgLoadTime: number;
  avgInteractionTime: number;
  deviceTypes: Record<string, number>;
  errorRates: Record<string, number>;
}

export interface TrendMetrics {
  daily: MetricPoint[];
  weekly: MetricPoint[];
  monthly: MetricPoint[];
}

export interface AnalyticsMetrics {
  id: string;
  dictionaryId: string;
  totalEntries: number;
  activity: ActivityMetrics;
  performance: PerformanceMetrics;
  trends: TrendMetrics;
  updatedAt: string;
  createdAt: string;
}

export type AnalyticsTimeframe = 'day' | 'week' | 'month' | 'year';

export interface AnalyticsFilter {
  timeframe: AnalyticsTimeframe;
  startDate?: string;
  endDate?: string;
}

export interface AnalyticsEvent {
  id: string;
  dictionaryId: string;
  eventType: string;
  eventData: Record<string, any>;
  userId: string;
  createdAt: string;
}