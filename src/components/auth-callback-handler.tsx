import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

const TIMEOUT_DURATION = 30000; // 30 seconds timeout

export function AuthCallbackHandler() {
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const redirectHome = useCallback(() => {
    window.location.href = '/';
  }, []);

  const handleAuthError = useCallback((error: unknown, fallbackMessage: string) => {
    const errorMessage = error instanceof Error ? error.message : fallbackMessage;
    setError(errorMessage);
    toast({
      title: 'Error',
      description: errorMessage,
      variant: 'destructive',
    });
  }, [toast]);

  useEffect(() => {
    const handleCallback = async () => {
      const timeoutId = setTimeout(() => {
        setError('Authentication timed out. Please try again.');
      }, TIMEOUT_DURATION);

      try {
        // Get URL parameters
        const hash = window.location.hash;
        const query = new URLSearchParams(window.location.search);
        const type = query.get('type');

        // Handle hash-based OAuth (implicit flow)
        if (hash) {
          const hashParams = new URLSearchParams(hash.substring(1));
          const access_token = hashParams.get('access_token');
          const refresh_token = hashParams.get('refresh_token');

          if (access_token && refresh_token) {
            const { error: sessionError } = await supabase.auth.setSession({
              access_token,
              refresh_token,
            });
            if (sessionError) throw sessionError;
          }
        }

        // Handle code-based OAuth
        const code = query.get('code');
        if (code) {
          // The code exchange is handled automatically by Supabase client
          const { error: sessionError } = await supabase.auth.getSession();
          if (sessionError) throw sessionError;
        }

        // Handle password reset
        if (type === 'recovery') {
          const access_token = query.get('access_token');
          if (!access_token) {
            throw new Error('No access token found in URL');
          }

          const newPassword = prompt('Please enter your new password');
          if (!newPassword) {
            throw new Error('Password is required');
          }

          const { error: updateError } = await supabase.auth.updateUser({
            password: newPassword
          });

          if (updateError) throw updateError;

          toast({
            title: 'Success',
            description: 'Password has been reset successfully',
          });
          
          redirectHome();
          return;
        }
        
        // Handle email verification
        if (type === 'email_verification') {
          const { error: sessionError } = await supabase.auth.getSession();
          if (sessionError) throw sessionError;

          toast({
            title: 'Success',
            description: 'Email verified successfully',
          });
          
          redirectHome();
          return;
        }

        // If we have either hash params or code, consider it a successful OAuth login
        if (hash || code) {
          toast({
            title: 'Success',
            description: 'Successfully signed in',
          });
          
          redirectHome();
          return;
        }

        // If we reach here with no matching conditions, something went wrong
        throw new Error('Invalid authentication callback');

      } catch (error) {
        handleAuthError(error, 'Failed to process authentication');
      } finally {
        clearTimeout(timeoutId);
      }
    };

    handleCallback();
  }, [toast, handleAuthError, redirectHome]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-card p-6 rounded-lg shadow-lg">
        {error ? (
          <div className="text-center space-y-4">
            <div className="text-destructive space-y-2">
              <h3 className="font-semibold">Authentication Error</h3>
              <p className="text-sm">{error}</p>
            </div>
            <div className="space-y-2">
              <button
                onClick={redirectHome}
                className="w-full px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
              >
                Return to Login
              </button>
              <p className="text-xs text-muted-foreground">
                If the problem persists, please contact support.
              </p>
            </div>
          </div>
        ) : (
          <div className="text-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <div className="space-y-2">
              <p className="font-medium">Processing Authentication</p>
              <p className="text-sm text-muted-foreground">
                Please wait while we verify your credentials...
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}