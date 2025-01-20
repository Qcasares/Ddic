import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { AnalyticsDashboard } from '../analytics-dashboard';
import { analyticsService } from '@/lib/analytics-service';
import { AnalyticsMetrics } from '@/types/analytics';

// Mock the analytics service
jest.mock('@/lib/analytics-service', () => ({
  analyticsService: {
    getMetrics: jest.fn(),
    subscribe: jest.fn(),
    trackEvent: jest.fn(),
    exportData: jest.fn(),
  },
}));

const mockMetrics: AnalyticsMetrics = {
  id: '123',
  dictionaryId: '123',
  totalEntries: 100,
  activity: {
    views: 1000,
    edits: 50,
    searches: 500,
    activeUsers: 200,
    uniqueVisitors: 150,
    averageSessionDuration: 300,
  },
  performance: {
    avgLoadTime: 250,
    avgInteractionTime: 150,
    deviceTypes: {
      desktop: 800,
      mobile: 150,
      tablet: 50,
    },
    errorRates: {
      '404': 0.02,
      '500': 0.01,
    },
  },
  trends: {
    day: [
      { timestamp: '2025-01-19T00:00:00Z', value: 100, views: 100, activeUsers: 50 },
      { timestamp: '2025-01-19T01:00:00Z', value: 150, views: 150, activeUsers: 75 },
    ],
    week: [],
    month: [],
    year: [],
  },
  updatedAt: '2025-01-19T12:00:00Z',
  createdAt: '2025-01-19T12:00:00Z',
};

describe('AnalyticsDashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (analyticsService.getMetrics as jest.Mock).mockResolvedValue(mockMetrics);
    (analyticsService.subscribe as jest.Mock).mockReturnValue(() => {});
  });

  it('renders loading state initially', () => {
    render(<AnalyticsDashboard dictionaryId="123" />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('displays metrics when loaded', async () => {
    render(<AnalyticsDashboard dictionaryId="123" />);

    await waitFor(() => {
      expect(screen.getByText('Total Entries')).toBeInTheDocument();
      expect(screen.getByText('100')).toBeInTheDocument(); // Total entries value
    });

    expect(screen.getByText('Total Views')).toBeInTheDocument();
    expect(screen.getByText('1,000')).toBeInTheDocument(); // Views value
  });

  it('handles timeframe changes', async () => {
    render(<AnalyticsDashboard dictionaryId="123" />);

    await waitFor(() => {
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('combobox'));
    fireEvent.click(screen.getByText('Last 7 Days'));

    expect(analyticsService.getMetrics).toHaveBeenCalledWith('123', {
      timeframe: 'week',
      enableRealtime: true,
    });
  });

  it('exports data when export button is clicked', async () => {
    const mockBlob = new Blob(['{}'], { type: 'application/json' });
    (analyticsService.exportData as jest.Mock).mockResolvedValue(mockBlob);

    render(<AnalyticsDashboard dictionaryId="123" />);

    await waitFor(() => {
      expect(screen.getByText('Export')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Export'));

    expect(analyticsService.exportData).toHaveBeenCalledWith('123', {
      timeframe: 'month',
    });
  });

  it('displays error state when metrics fetch fails', async () => {
    (analyticsService.getMetrics as jest.Mock).mockRejectedValue(
      new Error('Failed to fetch')
    );

    render(<AnalyticsDashboard dictionaryId="123" />);

    await waitFor(() => {
      expect(screen.getByText('Failed to load analytics')).toBeInTheDocument();
    });
  });

  it('updates data in real-time when subscribed', async () => {
    render(<AnalyticsDashboard dictionaryId="123" />);

    await waitFor(() => {
      expect(analyticsService.subscribe).toHaveBeenCalledWith(
        '123',
        expect.any(Function)
      );
    });

    // Simulate real-time update
    const subscribeCallback = (analyticsService.subscribe as jest.Mock).mock.calls[0][1];
    const updatedMetrics = {
      ...mockMetrics,
      activity: { ...mockMetrics.activity, views: 2000 },
    };

    act(() => {
      subscribeCallback(updatedMetrics);
    });

    expect(screen.getByText('2,000')).toBeInTheDocument();
  });
});