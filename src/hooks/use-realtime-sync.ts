import { useEffect, useRef, useState, useCallback } from 'react';
import { realtimeManager } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

interface SyncStatus {
  isSyncing: boolean;
  lastSyncedAt: Date | null;
  error: Error | null;
}

export function useRealtimeSync<T>(
  channelName: string,
  table: string,
  initialData: T,
  options: {
    onDataUpdate?: () => void;
    syncInterval?: number;
    priority?: 'high' | 'normal' | 'low';
  } = {}
) {
  // All state hooks must be called before any other hooks
  const [data, setData] = useState<T>(initialData);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isSyncing: false,
    lastSyncedAt: null,
    error: null
  });
  const [isOnline, setIsOnline] = useState(true);
  
  // Refs after state hooks
  const dataCache = useRef<T>(initialData);
  const offlineChanges = useRef<any[]>([]);
  const updateTimeoutRef = useRef<number | null>(null);
  const isInitialMount = useRef(true);

  // Hooks that depend on other hooks
  const { toast } = useToast();

  // Event handlers wrapped in useCallback
  const handleUpdate = useCallback(() => {
    setSyncStatus(prev => ({
      ...prev,
      isSyncing: true,
      lastSyncedAt: new Date()
    }));

    if (updateTimeoutRef.current !== null) {
      window.clearTimeout(updateTimeoutRef.current);
    }

    const updateDelay = options.priority === 'high' ? 0 : 
                       options.priority === 'low' ? 500 : 100;

    updateTimeoutRef.current = window.setTimeout(() => {
      if (options.onDataUpdate) {
        options.onDataUpdate();
      }
      setSyncStatus(prev => ({
        ...prev,
        isSyncing: false
      }));
      updateTimeoutRef.current = null;
    }, updateDelay);
  }, [options.onDataUpdate, options.priority]);

  const handleError = useCallback((error: Error) => {
    setSyncStatus(prev => ({
      ...prev,
      error,
      isSyncing: false
    }));
    setIsOnline(false);
    toast({
      title: 'Sync Error',
      description: error.message,
      variant: 'destructive'
    });
  }, [toast]);

  const handleConnectionChange = useCallback((status: 'CONNECTED' | 'DISCONNECTED') => {
    setIsOnline(status === 'CONNECTED');
    if (status === 'CONNECTED') {
      toast({
        title: 'Connected',
        description: 'Real-time updates restored',
      });
    } else {
      toast({
        title: 'Connection Lost',
        description: 'Attempting to reconnect...',
        variant: 'destructive'
      });
    }
  }, [toast]);

  // Online/offline effect
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setSyncStatus(prev => ({ ...prev, error: null }));
      if (offlineChanges.current.length > 0) {
        toast({
          title: 'Reconnected',
          description: `Syncing ${offlineChanges.current.length} offline changes...`
        });
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      setSyncStatus(prev => ({
        ...prev,
        error: new Error('You are currently offline')
      }));
      toast({
        title: 'Connection Lost',
        description: 'Changes will be synced when connection is restored',
        variant: 'destructive'
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [toast]);

  // Subscription effect
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    const cleanup = realtimeManager.subscribe(
      channelName, 
      table, 
      handleUpdate, 
      handleError,
      handleConnectionChange
    );

    return () => {
      if (updateTimeoutRef.current !== null) {
        window.clearTimeout(updateTimeoutRef.current);
      }
      cleanup();
    };
  }, [channelName, table, handleUpdate, handleError, handleConnectionChange]);

  // Data update effect
  useEffect(() => {
    dataCache.current = initialData;
    setData(initialData);
  }, [initialData]);

  return {
    data,
    syncStatus,
    isOnline
  };
}