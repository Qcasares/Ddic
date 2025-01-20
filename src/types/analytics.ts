export interface MetricPoint {
  timestamp: string;
  value: number;
  views?: number;
  activeUsers?: number;
  searches?: number;
  loadTime?: number;
  interactionTime?: number;
  sessions?: number;
}

export interface DeviceInfo {
  deviceType: string;
  browser: string;
  os: string;
  screenSize: string;
}

export interface GeolocationInfo {
  country: string;
  region: string;
  city: string;
  timezone: string;
}

export interface UserSession {
  id: string;
  userId: string;
  dictionaryId: string;
  sessionStart: string;
  sessionEnd?: string;
  deviceInfo: DeviceInfo;
  geolocation: GeolocationInfo;
  referrer?: string;
  initialPath: string;
  isActive: boolean;
}

export interface ActivityMetrics {
  views: number;
  edits: number;
  searches: number;
  activeUsers: number;
  uniqueVisitors: number;
  averageSessionDuration: number;
  totalSessions: number;
  bounceRate: number;
}

export interface PerformanceMetrics {
  avgLoadTime: number;
  avgInteractionTime: number;
  deviceTypes: Record<string, number>;
  errorRates: Record<string, number>;
  timeToFirstInteraction: number;
  serverResponseTime: number;
}

export interface TrendMetrics {
  day: MetricPoint[];
  week: MetricPoint[];
  month: MetricPoint[];
  year: MetricPoint[];
}

export interface FunnelStep {
  name: string;
  description?: string;
  event: string;
  conditions?: Record<string, any>;
}

export interface ConversionFunnel {
  id: string;
  dictionaryId: string;
  name: string;
  description?: string;
  steps: FunnelStep[];
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  isActive: boolean;
}

export interface FunnelMetrics {
  funnelId: string;
  name: string;
  totalEntries: number;
  conversionRate: number;
  steps: Array<{
    name: string;
    entryCount: number;
    exitCount: number;
    conversionRate: number;
    averageTime: number;
  }>;
}

export interface AnalyticsMetrics {
  id: string;
  dictionaryId: string;
  totalEntries: number;
  activity: ActivityMetrics;
  performance: PerformanceMetrics;
  trends: TrendMetrics;
  funnels?: FunnelMetrics[];
  updatedAt: string;
  createdAt: string;
}

export type AnalyticsTimeframe = keyof TrendMetrics;

export interface AnalyticsFilter {
  timeframe: AnalyticsTimeframe;
  startDate?: string;
  endDate?: string;
  funnelId?: string;
  sessionId?: string;
}

export interface AnalyticsEvent {
  id: string;
  dictionaryId: string;
  eventType: string;
  eventData: Record<string, any>;
  userId: string;
  sessionId?: string;
  deviceInfo?: DeviceInfo;
  geolocation?: GeolocationInfo;
  referrer?: string;
  path?: string;
  createdAt: string;
}

export interface SessionInfo {
  currentSession: UserSession | null;
  totalSessions: number;
  averageDuration: number;
  lastSessionEnd?: string;
}

export interface FunnelEvent {
  id: string;
  funnelId: string;
  userId: string;
  sessionId?: string;
  stepNumber: number;
  stepName: string;
  completed: boolean;
  completionTime?: string;
  createdAt: string;
}

export interface FunnelAnalytics {
  funnel: ConversionFunnel;
  metrics: FunnelMetrics;
  events: FunnelEvent[];
}

export interface AnalyticsOptions {
  filter?: AnalyticsFilter;
  enableRealtime?: boolean;
  includeRawEvents?: boolean;
  includeFunnels?: boolean;
  sessionTimeout?: number;
}