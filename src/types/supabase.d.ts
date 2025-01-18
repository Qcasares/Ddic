import { Session, AuthError as SupabaseAuthError } from '@supabase/supabase-js';

declare module '@/lib/supabase' {
  interface AuthResponse<T = any> {
    data: T;
    error: SupabaseAuthError | null;
  }

  export const supabase: {
    auth: {
      getSession: () => Promise<AuthResponse<{ session: Session | null }>>;
      onAuthStateChange: (callback: (event: string, session: Session | null) => void) => {
        data: { subscription: { unsubscribe: () => void } };
      };
      signOut: () => Promise<AuthResponse>;
      getUser: () => Promise<AuthResponse<{ user: any }>>;
      setSession: (session: Session) => Promise<AuthResponse>;
      updateUser: (user: { email?: string; password?: string }) => Promise<AuthResponse>;
      signInWithOAuth: (provider: 'google' | 'github') => Promise<AuthResponse>;
      resetPasswordForEmail: (email: string, options?: { redirectTo?: string }) => Promise<AuthResponse>;
      signInWithPassword: (credentials: { email: string; password: string }) => Promise<AuthResponse>;
      signUp: (credentials: { email: string; password: string }) => Promise<AuthResponse>;
      resend: (options: { type: 'signup' | 'recovery'; email: string }) => Promise<AuthResponse>;
    };
    from: (table: string) => {
      select: (columns?: string) => any;
      insert: (values: any) => any;
      update: (values: any) => any;
      delete: () => any;
    };
    channel: (name: string) => {
      subscribe: (callback: (payload: any) => void) => any;
    };
    realtimeManager: {
      channels: Map<string, any>;
      addChannel: (channel: any) => void;
      removeChannel: (channelId: string) => void;
    };
  };
}