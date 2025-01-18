declare module '@/lib/performance-monitor' {
  export const performanceMonitor: {
    measure: (name: string, callback: () => void) => void;
    track: (event: string, data?: any) => void;
  };
}

declare module '@/lib/realtime-manager' {
  export const realtimeManager: {
    subscribe: (channel: string, callback: (payload: any) => void) => void;
    unsubscribe: (channel: string) => void;
  };
}