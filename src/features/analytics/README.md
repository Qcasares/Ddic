# Analytics Implementation

This directory contains the implementation of the analytics system for the dictionary application.

## Architecture

The analytics system is built with the following components:

### 1. Database Schema
- `analytics_events` table for storing raw events
- `performance_metrics` table for performance data
- Materialized views for aggregated metrics:
  - `daily_metrics`
  - `monthly_metrics`

### 2. Core Components
- `analytics-service.ts`: Singleton service managing analytics data
- `useAnalytics` hook: React hook for consuming analytics data
- `AnalyticsDashboard`: Main dashboard component with visualizations

## Features

- Real-time analytics updates via Supabase subscriptions
- Client-side caching with invalidation
- Error handling with retry logic
- Data aggregation with materialized views
- Performance metrics tracking
- Device type analytics
- Export functionality
- Custom event tracking

## Usage

```typescript
// Using the analytics hook
const { metrics, isLoading, error, refresh, exportData } = useAnalytics(dictionaryId, {
  filter: { timeframe: 'month' },
  enableRealtime: true,
});

// Tracking custom events
const trackEvent = useAnalyticsEvent(dictionaryId);
trackEvent('custom_action', { additionalData: 'value' });
```

## Data Structure

```typescript
interface AnalyticsMetrics {
  id: string;
  dictionaryId: string;
  totalEntries: number;
  activity: {
    views: number;
    edits: number;
    searches: number;
    activeUsers: number;
    uniqueVisitors: number;
    averageSessionDuration: number;
  };
  performance: {
    avgLoadTime: number;
    avgInteractionTime: number;
    deviceTypes: Record<string, number>;
    errorRates: Record<string, number>;
  };
  trends: {
    day: MetricPoint[];
    week: MetricPoint[];
    month: MetricPoint[];
    year: MetricPoint[];
  };
}
```

## Testing

Tests are implemented using Jest and React Testing Library:
- `analytics-service.test.ts`: Unit tests for the analytics service
- `analytics-dashboard.test.tsx`: Component tests for the dashboard

Run tests with:
```bash
npm test
```

## Performance Considerations

1. **Caching**
   - Client-side cache with 5-minute TTL
   - Materialized views for heavy aggregations
   - Cache invalidation on real-time updates

2. **Optimization**
   - Batch event tracking
   - Debounced real-time updates
   - Lazy loading of chart components

## Monitoring

The system includes:
- Error tracking with retry logic
- Performance metrics collection
- Real user monitoring (RUM)
- Error rate monitoring

## Future Improvements

1. **Analytics**
   - Add more advanced metrics (user segments, conversion rates)
   - Implement A/B testing capabilities
   - Add custom metric definitions

2. **Performance**
   - Implement request batching for events
   - Add client-side data sampling
   - Optimize materialized view refresh strategy

3. **Features**
   - Export to different formats (CSV, PDF)
   - Custom dashboard layouts
   - Scheduled report generation