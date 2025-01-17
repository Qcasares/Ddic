import { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { 
  History, 
  Calendar as CalendarIcon, 
  Filter, 
  RotateCcw,
  User,
  Loader2
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useVirtualizedList } from '@/hooks/use-virtualized-list';
import { 
  fetchHistory, 
  revertChange, 
  getChangeDescription,
  type HistoryEntry,
  type HistoryFilter 
} from '@/lib/history-manager';

interface VersionHistoryProps {
  dictionaryId: string;
  selectedEntryId?: string;
}

export function VersionHistory({ dictionaryId, selectedEntryId }: VersionHistoryProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [totalEntries, setTotalEntries] = useState(0);
  const [page, setPage] = useState(0);
  const [filters, setFilters] = useState<HistoryFilter>({});
  const [isReverting, setIsReverting] = useState<string | null>(null);
  const { toast } = useToast();

  // Use virtualized list for better performance
  const {
    containerRef,
    visibleItems,
    totalHeight,
    offsetY,
    onScroll
  } = useVirtualizedList(history, {
    itemHeight: 120,
    containerHeight: 500,
    overscan: 5
  });

  const loadHistory = useCallback(async () => {
    try {
      setIsLoading(true);
      const { entries, total } = await fetchHistory(dictionaryId, page, 10, filters);
      setHistory(entries);
      setTotalEntries(total);
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to load history',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [dictionaryId, page, filters, toast]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const handleRevert = async (entryId: string, version: number) => {
    try {
      setIsReverting(entryId);
      await revertChange(entryId, version);
      toast({
        title: 'Success',
        description: 'Changes reverted successfully',
      });
      loadHistory();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to revert changes',
        variant: 'destructive',
      });
    } finally {
      setIsReverting(null);
    }
  };

  if (isLoading && history.length === 0) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center h-[600px]">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-sm text-muted-foreground">Loading history...</p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="space-y-6">
        {/* Filters */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "justify-start text-left font-normal",
                    !filters.startDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {filters.startDate ? (
                    format(filters.startDate, "PPP")
                  ) : (
                    "Start date"
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={filters.startDate}
                  onSelect={(date) => 
                    setFilters(prev => ({ ...prev, startDate: date }))
                  }
                />
              </PopoverContent>
            </Popover>

            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "justify-start text-left font-normal",
                    !filters.endDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {filters.endDate ? (
                    format(filters.endDate, "PPP")
                  ) : (
                    "End date"
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={filters.endDate}
                  onSelect={(date) => 
                    setFilters(prev => ({ ...prev, endDate: date }))
                  }
                />
              </PopoverContent>
            </Popover>
          </div>

          <Button 
            variant="outline"
            onClick={() => setFilters({})}
            className="ml-auto"
          >
            <Filter className="h-4 w-4 mr-2" />
            Clear Filters
          </Button>
        </div>

        {/* History List */}
        <ScrollArea 
          ref={containerRef}
          className="h-[500px]"
          onScroll={onScroll}
        >
          <div 
            style={{ height: totalHeight }}
            className="relative"
          >
            <div 
              style={{ 
                transform: `translateY(${offsetY}px)`,
                position: 'absolute',
                width: '100%'
              }}
            >
              {visibleItems.map((entry) => (
                <Card key={entry.id} className="p-4 mb-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">v{entry.version}</Badge>
                        <span className="text-sm text-muted-foreground">
                          {format(new Date(entry.created_at), 'PPpp')}
                        </span>
                      </div>

                      <h4 className="font-medium">
                        {entry.dictionary_entries?.field_name}
                      </h4>

                      <p className="text-sm text-muted-foreground">
                        {getChangeDescription(entry.changes)}
                      </p>

                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <User className="h-4 w-4" />
                        {entry.user?.email}
                      </div>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRevert(entry.entry_id, entry.version)}
                      disabled={isReverting === entry.entry_id}
                    >
                      {isReverting === entry.entry_id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <RotateCcw className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </ScrollArea>

        {/* Pagination */}
        {totalEntries > 0 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Showing {page * 10 + 1} to {Math.min((page + 1) * 10, totalEntries)} of {totalEntries} entries
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(page - 1)}
                disabled={page === 0}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(page + 1)}
                disabled={(page + 1) * 10 >= totalEntries}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}