declare module '@/lib/performance-monitor' {
  export const performanceMonitor: {
    measure: <T>(name: string, callback: () => Promise<T> | T) => Promise<T>;
    track: (event: string, data?: any) => void;
  };
}

declare module '@/lib/realtime-manager' {
  export const realtimeManager: {
    subscribe: (channel: string, callback: (payload: any) => void) => void;
    unsubscribe: (channel: string) => void;
  };
}