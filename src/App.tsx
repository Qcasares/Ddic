import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ThemeProvider } from '@/features/shared/theme-provider';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { 
  DatabaseIcon, 
  BookOpen, 
  Settings, 
  LogOut, 
  UserCircle,
  Layers,
  Search,
  LineChart,
  Book,
  BrainCircuit
} from 'lucide-react';
import { AuthCallbackHandler } from '@/features/auth/auth-callback-handler';
import { DictionaryList } from '@/features/dictionaries/dictionary-list';
import { DictionaryView } from '@/features/dictionaries/dictionary-view';
import { ProfileView } from '@/features/shared/profile-view';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ErrorBoundary } from '@/features/shared/error-boundary';
import { LoginForm } from '@/features/auth/login-form';
import { ThemeToggle } from '@/features/shared/theme-toggle';
import { AuthProvider, useAuth } from '@/features/auth/auth-context';
import { DataCatalog } from '@/components/data-catalog';
import { DataLineage } from '@/components/data-lineage';
import { BusinessGlossary } from '@/components/business-glossary';
import { AISuggestions } from '@/components/ai-suggestions';

function AppContent() {
  const [selectedDictionary, setSelectedDictionary] = useState<string | null>(null);
  const { session, loading: isLoading, signOut } = useAuth();

  // Handle auth callbacks before checking loading state
  const isAuthCallback = window.location.pathname.startsWith('/auth/callback') || 
                        window.location.pathname.startsWith('/auth/reset-password') ||
                        new URLSearchParams(window.location.search).has('code') ||
                        window.location.hash.includes('access_token');
                        
  if (isAuthCallback) {
    return <AuthCallbackHandler />;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <DatabaseIcon className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <LoginForm />
      </div>
    );
  }

  return (
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
              onClick={signOut}
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
            <TabsTrigger value="data-catalog" className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              Data Catalog
            </TabsTrigger>
            <TabsTrigger value="lineage" className="flex items-center gap-2">
              <Layers className="h-4 w-4" />
              Lineage
            </TabsTrigger>
            <TabsTrigger value="glossary" className="flex items-center gap-2">
              <Book className="h-4 w-4" />
              Glossary
            </TabsTrigger>
            <TabsTrigger value="ai" className="flex items-center gap-2">
              <BrainCircuit className="h-4 w-4" />
              AI Suggestions
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
          <TabsContent value="data-catalog">
            <DataCatalog />
          </TabsContent>
          <TabsContent value="lineage">
            {selectedDictionary ? (
              <DataLineage dictionaryId={selectedDictionary} />
            ) : (
              <div className="flex h-[600px] items-center justify-center border rounded-lg bg-muted/50">
                <div className="text-center">
                  <Layers className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-medium">No dictionary selected</h3>
                  <p className="text-sm text-muted-foreground">
                    Select a dictionary to view data lineage
                  </p>
                </div>
              </div>
            )}
          </TabsContent>
          <TabsContent value="glossary">
            {selectedDictionary ? (
              <BusinessGlossary dictionaryId={selectedDictionary} />
            ) : (
              <div className="flex h-[600px] items-center justify-center border rounded-lg bg-muted/50">
                <div className="text-center">
                  <Book className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-medium">No dictionary selected</h3>
                  <p className="text-sm text-muted-foreground">
                    Select a dictionary to view business glossary
                  </p>
                </div>
              </div>
            )}
          </TabsContent>
          <TabsContent value="ai">
            {selectedDictionary ? (
              <AISuggestions dictionaryId={selectedDictionary} />
            ) : (
              <div className="flex h-[600px] items-center justify-center border rounded-lg bg-muted/50">
                <div className="text-center">
                  <BrainCircuit className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-medium">No dictionary selected</h3>
                  <p className="text-sm text-muted-foreground">
                    Select a dictionary to view AI suggestions
                  </p>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ThemeProvider defaultTheme="system" storageKey="ui-theme">
        <TooltipProvider>
          <ErrorBoundary
            fallback={
              <div className="min-h-screen bg-background flex items-center justify-center p-4">
                <div className="text-center space-y-4">
                  <DatabaseIcon className="h-12 w-12 mx-auto text-destructive" />
                  <h1 className="text-2xl font-bold">Application Error</h1>
                  <p className="text-muted-foreground">
                    Something went wrong. Please try refreshing the page.
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => window.location.reload()}
                  >
                    Refresh Page
                  </Button>
                </div>
              </div>
            }
          >
            <AppContent />
            <Toaster />
          </ErrorBoundary>
        </TooltipProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}
