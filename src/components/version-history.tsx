import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDistanceToNow } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';

interface Version {
  id: string;
  entry_id: string;
  version: number;
  changes: Record<string, any>;
  created_at: string;
  created_by: string;
}

interface VersionHistoryProps {
  dictionaryId: string;
}

function VersionSkeleton() {
  return (
    <div className="relative pl-8 pb-8">
      <div className="absolute left-0 top-0 bottom-0 w-px bg-border" />
      <div className="absolute left-[-4px] top-2 w-2 h-2 rounded-full bg-primary" />
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-5 w-48" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </div>
    </div>
  );
}

export function VersionHistory({ dictionaryId }: VersionHistoryProps) {
  const [versions, setVersions] = useState<Version[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchVersions = async () => {
      try {
        const { data, error } = await supabase
          .from('entry_versions')
          .select(`
            *,
            dictionary_entries(field_name)
          `)
          .eq('dictionary_entries.dictionary_id', dictionaryId)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setVersions(data);
      } catch (err) {
        console.error('Error fetching versions:', err);
        setError('Failed to load version history');
      } finally {
        setIsLoading(false);
      }
    };

    fetchVersions();
  }, [dictionaryId]);

  if (error) {
    return (
      <div className="p-4 text-destructive border rounded-lg">
        <p>{error}</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <ScrollArea className="h-[600px] rounded-md border">
        <div className="p-4 space-y-8">
          {Array.from({ length: 5 }).map((_, index) => (
            <VersionSkeleton key={index} />
          ))}
        </div>
      </ScrollArea>
    );
  }

  if (versions.length === 0) {
    return (
      <div className="h-[600px] flex items-center justify-center border rounded-lg">
        <div className="text-center">
          <p className="text-muted-foreground">No version history available</p>
        </div>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[600px] rounded-md border">
      <div className="p-4 space-y-8">
        {versions.map((version) => (
          <div key={version.id} className="relative pl-8 pb-8">
            <div className="absolute left-0 top-0 bottom-0 w-px bg-border" />
            <div className="absolute left-[-4px] top-2 w-2 h-2 rounded-full bg-primary" />
            
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="outline">v{version.version}</Badge>
                <span className="text-sm text-muted-foreground">
                  {formatDistanceToNow(new Date(version.created_at), { addSuffix: true })}
                </span>
              </div>
              
              <h4 className="text-sm font-medium">
                Changes to {version.dictionary_entries?.field_name}
              </h4>
              
              <div className="space-y-2">
                {Object.entries(version.changes).map(([key, value]) => (
                  <div key={key} className="text-sm">
                    <span className="font-medium">{key}:</span>{' '}
                    <span className="text-muted-foreground">
                      {JSON.stringify(value, null, 2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}