import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

export function AuthCallbackHandler() {
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const handleCallback = async () => {
      const hash = window.location.hash;
      const query = new URLSearchParams(window.location.search);
      
      // Handle password reset
      const type = query.get('type');
      if (type === 'recovery') {
        const access_token = query.get('access_token');
        if (!access_token) {
          setError('No access token found in URL');
          return;
        }

        try {
          const { error } = await supabase.auth.updateUser({
            password: prompt('Please enter your new password') || ''
          });

          if (error) throw error;

          toast({
            title: 'Success',
            description: 'Password has been reset successfully',
          });
          
          // Redirect to home
          window.location.href = '/';
        } catch (error) {
          setError(error instanceof Error ? error.message : 'Failed to reset password');
        }
      }
      
      // Handle email verification
      if (type === 'email_verification') {
        try {
          const { error } = await supabase.auth.getSession();
          if (error) throw error;

          toast({
            title: 'Success',
            description: 'Email verified successfully',
          });
          
          // Redirect to home
          window.location.href = '/';
        } catch (error) {
          setError(error instanceof Error ? error.message : 'Failed to verify email');
        }
      }

      // Handle OAuth callbacks
      if (hash && hash.includes('access_token')) {
        try {
          const { error } = await supabase.auth.getSession();
          if (error) throw error;

          toast({
            title: 'Success',
            description: 'Successfully signed in',
          });
          
          // Redirect to home
          window.location.href = '/';
        } catch (error) {
          setError(error instanceof Error ? error.message : 'Failed to process authentication');
        }
      }
    };

    handleCallback();
  }, [toast]);

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <p className="text-destructive">{error}</p>
          <button
            onClick={() => window.location.href = '/'}
            className="text-sm text-muted-foreground hover:text-primary"
          >
            Return to home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="text-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin mx-auto" />
        <p className="text-sm text-muted-foreground">Processing authentication...</p>
      </div>
    </div>
  );
}