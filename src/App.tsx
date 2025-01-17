import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { DatabaseIcon, BookOpen, Settings, LogOut, UserCircle } from 'lucide-react';
import { DictionaryList } from '@/components/dictionary-list';
import { DictionaryView } from '@/components/dictionary-view';
import { ProfileView } from '@/components/profile-view';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { ErrorBoundary } from '@/components/error-boundary';
import { LoginForm } from '@/components/login-form';
import { ThemeToggle } from '@/components/theme-toggle';

export default function App() {
  const [selectedDictionary, setSelectedDictionary] = useState<string | null>(null);
  const [session, setSession] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    // Check for initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      toast({
        title: 'Signed out',
        description: 'You have been signed out successfully.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to sign out',
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return (
      <ThemeProvider defaultTheme="system" storageKey="ui-theme">
        <TooltipProvider>
          <div className="min-h-screen bg-background flex items-center justify-center p-4">
            <div className="text-center">
              <DatabaseIcon className="h-8 w-8 animate-spin mx-auto mb-4" />
              <p className="text-sm text-muted-foreground">Loading...</p>
            </div>
          </div>
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    );
  }

  if (!session) {
    return (
      <ThemeProvider defaultTheme="system" storageKey="ui-theme">
        <TooltipProvider>
          <div className="min-h-screen bg-background flex items-center justify-center p-4">
            <LoginForm />
          </div>
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider defaultTheme="system" storageKey="ui-theme">
      <TooltipProvider>
        <ErrorBoundary>
          <div className="min-h-screen bg-background">
            <header className="border-b">
              <div className="container flex h-16 items-center px-4">
                <div className="flex items-center gap-2">
                  <DatabaseIcon className="h-6 w-6" />
                  <h1 className="text-xl font-semibold">Data Dictionary Manager</h1>
                </div>
                <div className="ml-auto flex items-center space-x-2">
                  <ThemeToggle />
                  <Button variant="ghost" size="icon" className="h-9 w-9">
                    <Settings className="h-5 w-5" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={handleSignOut}
                    className="h-9 w-9"
                  >
                    <LogOut className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            </header>

            <main className="container mx-auto py-6 px-4">
              <Tabs defaultValue="dictionaries" className="space-y-6">
                <TabsList className="w-full justify-start border-b pb-px">
                  <TabsTrigger value="dictionaries" className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4" />
                    Dictionaries
                  </TabsTrigger>
                  <TabsTrigger value="profile" className="flex items-center gap-2">
                    <UserCircle className="h-4 w-4" />
                    Profile
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="dictionaries">
                  <div className="grid lg:grid-cols-12 gap-6">
                    <div className="lg:col-span-3">
                      <DictionaryList
                        selectedDictionary={selectedDictionary}
                        onSelect={setSelectedDictionary}
                      />
                    </div>
                    <div className="lg:col-span-9">
                      {selectedDictionary ? (
                        <DictionaryView dictionaryId={selectedDictionary} />
                      ) : (
                        <div className="flex h-[600px] items-center justify-center border rounded-lg bg-muted/50">
                          <div className="text-center">
                            <BookOpen className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
                            <h3 className="text-lg font-medium">No dictionary selected</h3>
                            <p className="text-sm text-muted-foreground">
                              Select a dictionary from the list or create a new one
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </TabsContent>
                <TabsContent value="profile">
                  <ProfileView />
                </TabsContent>
              </Tabs>
            </main>
          </div>
          <Toaster />
        </ErrorBoundary>
      </TooltipProvider>
    </ThemeProvider>
  );
}