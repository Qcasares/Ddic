import { useEffect, useState } from 'react';
import { supabase } from './supabase';

interface PerformanceMetrics {
  loadTime: number;
  interactionTime: number;
  resourceTiming: PerformanceResourceTiming[];
  navigationTiming: PerformanceNavigationTiming;
}

export function usePerformanceMonitor() {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);

  useEffect(() => {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const navigationEntry = entries.find(
        (entry) => entry.entryType === 'navigation'
      ) as PerformanceNavigationTiming;

      const resourceEntries = entries.filter(
        (entry) => entry.entryType === 'resource'
      ) as PerformanceResourceTiming[];

      if (navigationEntry) {
        const loadTime = navigationEntry.loadEventEnd - navigationEntry.startTime;
        const interactionTime = navigationEntry.domInteractive - navigationEntry.startTime;

        const metrics: PerformanceMetrics = {
          loadTime,
          interactionTime,
          resourceTiming: resourceEntries,
          navigationTiming: navigationEntry
        };

        setMetrics(metrics);
        
        // Use async IIFE to handle async operations
        (async () => {
          try {
            const { data: { session } } = await supabase.auth.getSession();
            
            if (!session) {
              console.log('Skipping performance metrics - no active session');
              return;
            }

            // Test connection with a simple query
            const { error: testError } = await supabase
              .from('performance_metrics')
              .select('count(*)', { count: 'exact', head: true });

            // If table doesn't exist, create it
            if (testError?.code === '42P01') {
              console.log('Creating performance_metrics table...');
              const { error: createError } = await supabase.rpc('create_performance_metrics_table');
              if (createError) {
                throw createError;
              }
            }

            // Save metrics
            const { error } = await supabase
              .from('performance_metrics')
              .insert([{
                load_time: loadTime,
                interaction_time: interactionTime,
                user_agent: navigator.userAgent,
                device_type: /Mobile|iP(hone|od|ad)|Android|BlackBerry|IEMobile/.test(navigator.userAgent)
                  ? 'mobile'
                  : 'desktop',
                user_id: session.user.id
              }]);

            if (error) {
              if (error.code === 'PGRST301') {
                console.error('Row-level security violation - check RLS policies');
              } else {
                console.error('Error saving performance metrics:', error);
              }
            }
          } catch (error) {
            console.error('Database operation failed:', error);
          }
        })();
      }
    });

    observer.observe({ type: 'navigation', buffered: true });
    observer.observe({ type: 'resource', buffered: true });

    return () => observer.disconnect();
  }, []);

  return metrics;
}

export const performanceMonitor = {
  usePerformanceMonitor,
  measure: (name: string, callback: () => void) => {
    performance.mark(`${name}-start`);
    callback();
    performance.mark(`${name}-end`);
    performance.measure(name, `${name}-start`, `${name}-end`);
    const measure = performance.getEntriesByName(name)[0];
    return measure.duration;
  }
};