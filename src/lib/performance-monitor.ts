import { requestBatcher } from './request-batcher';

type MetricName = 
  | 'cache-miss'
  | 'request-batching'
  | 'database-query'
  | 'render-time'
  | 'realtime-sync'
  | 'auth-operation'
  | 'file-operation';

interface Metric {
  name: MetricName;
  value: number;
  timestamp: number;
  metadata?: Record<string, any>;
}

interface Threshold {
  value: number;
  severity: 'warning' | 'error';
}

class PerformanceMonitor {
  private metrics: Metric[] = [];
  private readonly maxMetrics = 1000;
  private readonly thresholds: Record<MetricName, Threshold> = {
    'cache-miss': { value: 50, severity: 'warning' },
    'request-batching': { value: 100, severity: 'warning' },
    'database-query': { value: 200, severity: 'error' },
    'render-time': { value: 16, severity: 'warning' },
    'realtime-sync': { value: 150, severity: 'error' },
    'auth-operation': { value: 300, severity: 'error' },
    'file-operation': { value: 500, severity: 'warning' }
  };

  measure(name: MetricName, startTime: number, metadata?: Record<string, any>): void {
    const duration = performance.now() - startTime;
    this.addMetric({ name, value: duration, timestamp: Date.now(), metadata });
  }

  private addMetric(metric: Metric): void {
    this.metrics.push(metric);
    this.enforceMetricLimit();
    this.checkThreshold(metric);
  }

  private enforceMetricLimit(): void {
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }
  }

  private checkThreshold(metric: Metric): void {
    const threshold = this.thresholds[metric.name];
    if (!threshold) return;

    if (metric.value > threshold.value) {
      const message = `Performance threshold exceeded: ${metric.name} took ${metric.value.toFixed(2)}ms (threshold: ${threshold.value}ms)`;
      
      if (threshold.severity === 'error') {
        console.error(message, metric.metadata);
      } else {
        console.warn(message, metric.metadata);
      }

      this.reportViolation(metric, threshold);
    }
  }

  private reportViolation(metric: Metric, threshold: Threshold): void {
    requestBatcher.add('performance-violations', {
      name: metric.name,
      duration: metric.value,
      threshold: threshold.value,
      severity: threshold.severity,
      metadata: {
        ...metric.metadata,
        userAgent: navigator.userAgent,
        timestamp: metric.timestamp
      }
    }, threshold.severity === 'error' ? 'high' : 'normal');
  }

  getMetrics(options: {
    name?: MetricName;
    startTime?: number;
    endTime?: number;
    minDuration?: number;
  } = {}): Metric[] {
    const { name, startTime, endTime, minDuration } = options;
    
    return this.metrics.filter(metric => 
      (!name || metric.name === name) &&
      (!startTime || metric.timestamp >= startTime) &&
      (!endTime || metric.timestamp <= endTime) &&
      (!minDuration || metric.value >= minDuration)
    );
  }

  getAverageTime(name: MetricName, window: number = 60000): number {
    const relevantMetrics = this.getTimeWindowMetrics(name, window);
    if (relevantMetrics.length === 0) return 0;
    return this.calculateAverage(relevantMetrics);
  }

  getPercentile(name: MetricName, percentile: number, window: number = 60000): number {
    const metrics = this.getTimeWindowMetrics(name, window);
    if (metrics.length === 0) return 0;
    return this.calculatePercentile(metrics, percentile);
  }

  private getTimeWindowMetrics(name: MetricName, window: number): Metric[] {
    const now = Date.now();
    return this.metrics.filter(m => 
      m.name === name && 
      m.timestamp > now - window
    );
  }

  private calculateAverage(metrics: Metric[]): number {
    const sum = metrics.reduce((acc, m) => acc + m.value, 0);
    return sum / metrics.length;
  }

  private calculatePercentile(metrics: Metric[], percentile: number): number {
    const sorted = metrics.map(m => m.value).sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[index];
  }

  generateReport(): {
    summary: Record<MetricName, any>;
    violations: Metric[];
    recommendations: string[];
  } {
    const window = 5 * 60 * 1000; // Last 5 minutes
    const summary = this.generateSummary(window);
    const violations = this.findViolations(window);
    const recommendations = this.generateRecommendations(summary, violations);

    return { summary, violations, recommendations };
  }

  private generateSummary(window: number): Record<MetricName, any> {
    return Object.keys(this.thresholds).reduce((acc, name) => {
      const metricName = name as MetricName;
      acc[metricName] = {
        average: this.getAverageTime(metricName, window),
        p95: this.getPercentile(metricName, 95, window),
        threshold: this.thresholds[metricName].value
      };
      return acc;
    }, {} as Record<MetricName, any>);
  }

  private findViolations(window: number): Metric[] {
    const now = Date.now();
    return this.metrics.filter(m => 
      m.timestamp > now - window &&
      this.thresholds[m.name] &&
      m.value > this.thresholds[m.name].value
    );
  }

  private generateRecommendations(
    summary: Record<MetricName, any>,
    violations: Metric[]
  ): string[] {
    const recommendations: string[] = [];

    if (summary['cache-miss']?.average > 30) {
      recommendations.push('Consider increasing cache TTL or adjusting cache invalidation strategy');
    }

    if (summary['request-batching']?.average > 50) {
      recommendations.push('Consider adjusting batch size or timeout for request batching');
    }

    if (summary['database-query']?.average > 100) {
      recommendations.push('Review database queries for optimization opportunities');
    }

    if (summary['render-time']?.average > 16) {
      recommendations.push('Consider implementing virtualization or optimizing component renders');
    }

    if (summary['realtime-sync']?.average > 100) {
      recommendations.push('Review real-time subscription strategy and connection handling');
    }

    return recommendations;
  }

  clear(): void {
    this.metrics = [];
  }
}

export const performanceMonitor = new PerformanceMonitor();