import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Inbox, CheckCircle2, XCircle, Clock, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { withErrorHandling, AppError, ErrorType } from '@/lib/error-handler';

interface ApprovalQueueProps {
  dictionaryId: string;
  onEntrySelect?: (entryId: string) => void;
}

interface QueueEntry {
  id: string;
  field_name: string;
  workflow_status: string;
  created_at: string;
  created_by: string;
  user: {
    email: string;
  };
}

export function ApprovalQueue({ dictionaryId, onEntrySelect }: ApprovalQueueProps) {
  const [entries, setEntries] = useState<QueueEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingEntries, setProcessingEntries] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  useEffect(() => {
    const fetchEntries = async () => {
      try {
        setIsLoading(true);

        await withErrorHandling(async () => {
          const { data, error } = await supabase
            .from('dictionary_entries')
            .select(`
              id,
              field_name,
              workflow_status,
              created_at,
              created_by,
              user:created_by (
                email
              )
            `)
            .eq('dictionary_id', dictionaryId)
            .eq('workflow_status', 'review')
            .order('created_at', { ascending: false });

          if (error) throw error;
          setEntries(data);
        }, {
          maxRetries: 2,
          retryDelay: 500
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchEntries();

    // Set up real-time subscription
    const channel = supabase
      .channel('approval-queue')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'dictionary_entries',
        filter: `dictionary_id=eq.${dictionaryId} AND workflow_status=eq.review`
      }, () => {
        fetchEntries();
      })
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [dictionaryId, toast]);

  const handleApprove = async (entryId: string) => {
    try {
      setProcessingEntries(prev => new Set(prev).add(entryId));

      await withErrorHandling(async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          throw new AppError('Not authenticated', ErrorType.AUTH);
        }

        const { error } = await supabase
          .from('dictionary_entries')
          .update({ 
            workflow_status: 'approved',
            last_reviewed_at: new Date().toISOString(),
            last_reviewed_by: user.id
          })
          .eq('id', entryId);

        if (error) throw error;

        setEntries(entries.filter(entry => entry.id !== entryId));
        toast({
          title: 'Entry Approved',
          description: 'The entry has been approved successfully',
        });
      }, {
        maxRetries: 2,
        retryDelay: 500
      });
    } finally {
      setProcessingEntries(prev => {
        const next = new Set(prev);
        next.delete(entryId);
        return next;
      });
    }
  };

  const handleReject = async (entryId: string) => {
    try {
      setProcessingEntries(prev => new Set(prev).add(entryId));

      await withErrorHandling(async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          throw new AppError('Not authenticated', ErrorType.AUTH);
        }

        const { error } = await supabase
          .from('dictionary_entries')
          .update({ 
            workflow_status: 'rejected',
            last_reviewed_at: new Date().toISOString(),
            last_reviewed_by: user.id
          })
          .eq('id', entryId);

        if (error) throw error;

        setEntries(entries.filter(entry => entry.id !== entryId));
        toast({
          title: 'Entry Rejected',
          description: 'The entry has been rejected',
        });
      }, {
        maxRetries: 2,
        retryDelay: 500
      });
    } finally {
      setProcessingEntries(prev => {
        const next = new Set(prev);
        next.delete(entryId);
        return next;
      });
    }
  };

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center h-[400px]">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-sm text-muted-foreground">Loading approval queue...</p>
          </div>
        </div>
      </Card>
    );
  }

  if (entries.length === 0) {
    return (
      <Card className="p-6">
        <div className="flex flex-col items-center justify-center text-center h-[400px]">
          <Inbox className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">No Entries to Review</h3>
          <p className="text-sm text-muted-foreground">
            All entries have been reviewed
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <h3 className="text-lg font-medium mb-4">Approval Queue</h3>
      <ScrollArea className="h-[400px]">
        <div className="space-y-4">
          {entries.map((entry) => (
            <Card key={entry.id} className="p-4">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <h4 
                    className="font-medium hover:text-primary cursor-pointer"
                    onClick={() => onEntrySelect?.(entry.id)}
                  >
                    {entry.field_name}
                  </h4>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true })}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Submitted by {entry.user.email}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-green-600 hover:text-green-700"
                    onClick={() => handleApprove(entry.id)}
                    disabled={processingEntries.has(entry.id)}
                  >
                    {processingEntries.has(entry.id) ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-red-600 hover:text-red-700"
                    onClick={() => handleReject(entry.id)}
                    disabled={processingEntries.has(entry.id)}
                  >
                    {processingEntries.has(entry.id) ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <XCircle className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </ScrollArea>
    </Card>
  );
}