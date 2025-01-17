import { createClient } from '@supabase/supabase-js';
import { RealtimeChannel } from '@supabase/supabase-js';
import { performanceMonitor } from './performance-monitor';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error('Missing VITE_SUPABASE_URL environment variable');
}

if (!supabaseAnonKey) {
  throw new Error('Missing VITE_SUPABASE_ANON_KEY environment variable');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  },
  realtime: {
    params: {
      eventsPerSecond: 40 // Increased from default
    }
  }
});

export class RealtimeManager {
  private channels: Map<string, RealtimeChannel> = new Map();
  private retryAttempts: Map<string, number> = new Map();
  private maxRetries = 5;
  private retryDelay = 1000;
  private reconnectTimeout: number | null = null;
  
  subscribe(
    channelName: string, 
    table: string, 
    onUpdate: (payload: any) => void,
    onError?: (error: any) => void,
    onConnectionChange?: (status: 'CONNECTED' | 'DISCONNECTED') => void
  ): () => void {
    if (this.channels.has(channelName)) {
      return () => this.unsubscribe(channelName);
    }

    const channel = supabase.channel(channelName)
      .on('postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: table
        },
        (payload) => {
          this.retryAttempts.set(channelName, 0);
          onUpdate(payload);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`Connected to ${channelName}`);
          onConnectionChange?.('CONNECTED');
        } else if (status === 'CLOSED') {
          console.log(`Disconnected from ${channelName}`);
          onConnectionChange?.('DISCONNECTED');
          this.handleDisconnect(channelName, table, onUpdate, onError, onConnectionChange);
        } else if (status === 'CHANNEL_ERROR') {
          if (onError) onError(new Error(`Channel error for ${channelName}`));
          onConnectionChange?.('DISCONNECTED');
          this.handleDisconnect(channelName, table, onUpdate, onError, onConnectionChange);
        }
      });

    this.channels.set(channelName, channel);
    return () => this.unsubscribe(channelName);
  }

  private handleDisconnect(
    channelName: string,
    table: string,
    onUpdate: (payload: any) => void,
    onError?: (error: any) => void,
    onConnectionChange?: (status: 'CONNECTED' | 'DISCONNECTED') => void
  ) {
    const attempts = this.retryAttempts.get(channelName) || 0;
    
    if (attempts < this.maxRetries) {
      const delay = Math.min(this.retryDelay * Math.pow(2, attempts), 30000);
      
      if (this.reconnectTimeout) {
        clearTimeout(this.reconnectTimeout);
      }

      this.reconnectTimeout = window.setTimeout(() => {
        console.log(`Attempting to reconnect to ${channelName}. Attempt ${attempts + 1}/${this.maxRetries}`);
        this.retryAttempts.set(channelName, attempts + 1);
        this.unsubscribe(channelName);
        this.subscribe(channelName, table, onUpdate, onError, onConnectionChange);
      }, delay);
    } else {
      if (onError) onError(new Error(`Failed to reconnect to ${channelName} after ${this.maxRetries} attempts`));
    }
  }

  unsubscribe(channelName: string) {
    const channel = this.channels.get(channelName);
    if (channel) {
      channel.unsubscribe();
      this.channels.delete(channelName);
      this.retryAttempts.delete(channelName);
      if (this.reconnectTimeout) {
        clearTimeout(this.reconnectTimeout);
        this.reconnectTimeout = null;
      }
    }
  }

  unsubscribeAll() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    for (const channelName of this.channels.keys()) {
      this.unsubscribe(channelName);
    }
  }

  resetConnection() {
    this.unsubscribeAll();
    this.retryAttempts.clear();
    this.reconnectTimeout = null;
  }
}

export const realtimeManager = new RealtimeManager();

// Initialize Supabase connection
supabase.auth.onAuthStateChange((event) => {
  if (event === 'SIGNED_IN') {
    console.log('Supabase connection established');
  } else if (event === 'SIGNED_OUT') {
    realtimeManager.unsubscribeAll();
  }
});

// Handle OAuth redirects
if (typeof window !== 'undefined' && window.location.hash) {
  const params = new URLSearchParams(window.location.hash.substring(1));
  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');
  
  if (accessToken && refreshToken) {
    supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken
    }).catch(console.error);
  }
}