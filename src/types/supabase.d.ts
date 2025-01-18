import { SupabaseClient, RealtimeChannel, Session } from '@supabase/supabase-js';

export type RealtimePostgresChangesPayload<T = unknown> = {
  schema: string;
  table: string;
  commit_timestamp: string;
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new: T;
  old: T;
  errors: null | any[];
};

export type PostgresChangesFilter = {
  event: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
  schema: string;
  table: string;
  filter?: string;
};

export interface RealtimeManagerInterface {
  channels: Map<string, RealtimeChannel>;
  subscribe(
    channelName: string,
    table: string,
    onUpdate: (payload: RealtimePostgresChangesPayload) => void,
    onError?: (error: Error) => void,
    onConnectionChange?: (status: 'CONNECTED' | 'DISCONNECTED') => void
  ): () => void;
  unsubscribe(channelName: string): void;
  unsubscribeAll(): void;
  resetConnection(): void;
}

// Re-export the SupabaseClient type
export type { SupabaseClient };