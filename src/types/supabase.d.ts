declare module '@/lib/supabase' {
  export const supabase: {
    auth: {
      getSession: () => Promise<{
        data: { session: any };
        error: any;
      }>;
      onAuthStateChange: (callback: (event: string, session: any) => void) => {
        unsubscribe: () => void;
      };
      getUser: () => Promise<any>;
      setSession: (session: any) => Promise<any>;
      updateUser: (user: any) => Promise<any>;
      signInWithOAuth: (provider: any) => Promise<any>;
      resetPasswordForEmail: (email: string) => Promise<any>;
      signInWithPassword: (credentials: any) => Promise<any>;
      signUp: (credentials: any) => Promise<any>;
      resend: () => Promise<any>;
    };
    from: (table: string) => any;
    channel: (name: string) => any;
    realtimeManager: any;
  };
}