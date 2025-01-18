import { useAnalytics } from '@/hooks/use-analytics';
import { Card } from '@/components/ui/card';
import { BarChart, Activity, Clock, GitBranch, Eye, Search, Users, Timer, Mouse } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface AnalyticsDashboardProps {
  dictionaryId: string;
}

export function AnalyticsDashboard({ dictionaryId }: AnalyticsDashboardProps) {
  const { metrics, isLoading, error } = useAnalytics(dictionaryId);

  if (error) {
    return (
      <Card className="p-6">
        <div className="text-destructive">Failed to load analytics</div>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="space-y-4">
          <div className="h-4 w-1/3 bg-muted animate-pulse rounded" />
          <div className="grid grid-cols-2 gap-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
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
      label: 'Total Changes',
      value: metrics.totalChanges.toLocaleString(),
      icon: Activity,
      color: 'text-green-500',
    },
    {
      label: 'Last Updated',
      value: formatDistanceToNow(new Date(metrics.lastUpdated), { addSuffix: true }),
      icon: Clock,
      color: 'text-orange-500',
    },
    {
      label: 'Change Frequency',
      value: `${(metrics.changeFrequency * 100).toFixed(1)}%`,
      icon: GitBranch,
      color: 'text-purple-500',
    },
    {
      label: 'Total Views',
      value: metrics.activity.views.toLocaleString(),
      icon: Eye,
      color: 'text-cyan-500',
    },
    {
      label: 'Total Searches',
      value: metrics.activity.searches.toLocaleString(),
      icon: Search,
      color: 'text-pink-500',
    },
    {
      label: 'Active Users',
      value: metrics.activity.activeUsers.toLocaleString(),
      icon: Users,
      color: 'text-yellow-500',
    }
  ];

  // Add performance metrics if available
  if (metrics.performance) {
    stats.push(
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
    );
  }

  const deviceTypes = metrics.performance?.deviceTypes as Record<string, number> | undefined;

  return (
    <Card className="p-6">
      <h3 className="text-lg font-medium mb-6">Analytics Overview</h3>
      <div className="grid grid-cols-3 gap-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="p-4 border rounded-lg bg-card hover:bg-accent/5 transition-colors"
          >
            <div className="flex items-center gap-2 mb-2">
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
              <span className="text-sm font-medium">{stat.label}</span>
            </div>
            <div className="text-2xl font-bold">{stat.value}</div>
          </div>
        ))}
      </div>

      {deviceTypes && Object.keys(deviceTypes).length > 0 && (
        <div className="mt-6">
          <h4 className="text-md font-medium mb-4">Device Distribution</h4>
          <div className="grid grid-cols-3 gap-4">
            {Object.entries(deviceTypes).map(([device, count]) => (
              <div key={device} className="p-4 border rounded-lg bg-card">
                <div className="text-sm font-medium mb-1">{device}</div>
                <div className="text-xl font-bold">{count.toLocaleString()}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}