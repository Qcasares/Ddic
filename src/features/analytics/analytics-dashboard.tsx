import { useState } from 'react';
import { useAnalytics } from '@/hooks/use-analytics';
import { Card } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { AnalyticsTimeframe } from '@/types/analytics';
import {
  BarChart,
  Activity,
  Clock,
  Eye,
  Search,
  Users,
  Timer,
  Mouse,
  Download,
  RefreshCw
} from 'lucide-react';
import { format } from 'date-fns';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

interface AnalyticsDashboardProps {
  dictionaryId: string;
}

export function AnalyticsDashboard({ dictionaryId }: AnalyticsDashboardProps) {
  const [timeframe, setTimeframe] = useState<AnalyticsTimeframe>('month');
  const { metrics, isLoading, error, refresh, exportData } = useAnalytics(dictionaryId, {
    filter: { timeframe },
    enableRealtime: true,
  });

  if (error) {
    return (
      <Card className="p-6">
        <div className="flex justify-between items-center mb-4">
          <div className="text-destructive">Failed to load analytics</div>
          <Button variant="outline" onClick={refresh}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
        </div>
      </Card>
    );
  }

  if (isLoading || !metrics) {
    return (
      <Card className="p-6">
        <div className="space-y-4">
          <div className="h-4 w-1/3 bg-muted animate-pulse rounded" />
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
              <div key={i} className="h-24 bg-muted animate-pulse rounded" />
            ))}
          </div>
        </div>
      </Card>
    );
  }

  const stats = [
    {
      label: 'Total Entries',
      value: metrics.totalEntries.toLocaleString(),
      icon: BarChart,
      color: 'text-blue-500',
    },
    {
      label: 'Total Views',
      value: metrics.activity.views.toLocaleString(),
      icon: Eye,
      color: 'text-cyan-500',
    },
    {
      label: 'Active Users',
      value: metrics.activity.activeUsers.toLocaleString(),
      icon: Users,
      color: 'text-yellow-500',
    },
    {
      label: 'Unique Visitors',
      value: metrics.activity.uniqueVisitors.toLocaleString(),
      icon: Users,
      color: 'text-green-500',
    },
    {
      label: 'Total Searches',
      value: metrics.activity.searches.toLocaleString(),
      icon: Search,
      color: 'text-pink-500',
    },
    {
      label: 'Total Edits',
      value: metrics.activity.edits.toLocaleString(),
      icon: Activity,
      color: 'text-purple-500',
    },
    {
      label: 'Avg Session',
      value: `${Math.round(metrics.activity.averageSessionDuration / 60)} min`,
      icon: Clock,
      color: 'text-orange-500',
    },
    {
      label: 'Avg Load Time',
      value: `${metrics.performance.avgLoadTime.toFixed(0)}ms`,
      icon: Timer,
      color: 'text-indigo-500',
    },
    {
      label: 'Avg Interaction',
      value: `${metrics.performance.avgInteractionTime.toFixed(0)}ms`,
      icon: Mouse,
      color: 'text-rose-500',
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Analytics Overview</h3>
        <div className="flex items-center gap-4">
          <Select value={timeframe} onValueChange={(value: AnalyticsTimeframe) => setTimeframe(value)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select timeframe" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">Last 24 Hours</SelectItem>
              <SelectItem value="week">Last 7 Days</SelectItem>
              <SelectItem value="month">Last 30 Days</SelectItem>
              <SelectItem value="year">Last 12 Months</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={refresh}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" onClick={exportData}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {stats.map((stat) => (
          <Card
            key={stat.label}
            className="p-4 hover:bg-accent/5 transition-colors"
          >
            <div className="flex items-center gap-2 mb-2">
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
              <span className="text-sm font-medium">{stat.label}</span>
            </div>
            <div className="text-2xl font-bold">{stat.value}</div>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="activity" className="w-full">
        <TabsList>
          <TabsTrigger value="activity">Activity Trends</TabsTrigger>
          <TabsTrigger value="performance">Performance Metrics</TabsTrigger>
          <TabsTrigger value="devices">Device Distribution</TabsTrigger>
        </TabsList>

        <TabsContent value="activity" className="mt-4">
          <Card className="p-6">
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={metrics.trends[timeframe]}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="timestamp"
                  tickFormatter={(value) => format(new Date(value), 'MMM dd')}
                />
                <YAxis />
                <Tooltip
                  labelFormatter={(value) => format(new Date(value), 'MMM dd, yyyy')}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="views"
                  stroke="#0ea5e9"
                  name="Views"
                />
                <Line
                  type="monotone"
                  dataKey="activeUsers"
                  stroke="#eab308"
                  name="Active Users"
                />
                <Line
                  type="monotone"
                  dataKey="searches"
                  stroke="#ec4899"
                  name="Searches"
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="mt-4">
          <Card className="p-6">
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={metrics.trends[timeframe]}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="timestamp"
                  tickFormatter={(value) => format(new Date(value), 'MMM dd')}
                />
                <YAxis />
                <Tooltip
                  labelFormatter={(value) => format(new Date(value), 'MMM dd, yyyy')}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="loadTime"
                  stroke="#6366f1"
                  name="Load Time (ms)"
                />
                <Line
                  type="monotone"
                  dataKey="interactionTime"
                  stroke="#f43f5e"
                  name="Interaction Time (ms)"
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </TabsContent>

        <TabsContent value="devices" className="mt-4">
          <Card className="p-6">
            <div className="grid grid-cols-3 gap-4">
              {Object.entries(metrics.performance.deviceTypes).map(([device, count]) => (
                <div
                  key={device}
                  className="p-4 border rounded-lg bg-card"
                >
                  <div className="text-sm font-medium mb-1">{device}</div>
                  <div className="text-xl font-bold">{count.toLocaleString()}</div>
                  <div className="text-sm text-muted-foreground">
                    {((count / metrics.activity.views) * 100).toFixed(1)}% of total
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {metrics.performance.errorRates && Object.keys(metrics.performance.errorRates).length > 0 && (
        <Card className="p-6">
          <h4 className="text-md font-medium mb-4">Error Rates</h4>
          <div className="grid grid-cols-3 gap-4">
            {Object.entries(metrics.performance.errorRates).map(([error, rate]) => (
              <div
                key={error}
                className="p-4 border rounded-lg bg-card"
              >
                <div className="text-sm font-medium mb-1">{error}</div>
                <div className="text-xl font-bold">{(rate * 100).toFixed(2)}%</div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}