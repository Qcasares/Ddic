import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Plus } from 'lucide-react';
import { CreateEntryDialog } from './create-entry-dialog';
import { EditEntryDialog } from './edit-entry-dialog';
import { RelationsDialog } from './relations-dialog';
import { WorkflowStatus } from './workflow-status';
import { EntryActions } from './entry-actions';
import { SearchDialog } from './search-dialog';
import { VirtualizedList } from './virtualized-list';
import { useVirtualizedList } from '@/hooks/use-virtualized-list';
import { useDictionaryEntries } from '@/hooks/use-dictionary-entries';
import { useDebounce } from '@/hooks/use-debounce';
import { SyncIndicator } from './sync-indicator';

interface FieldManagementProps {
  dictionaryId: string;
  onViewHistory?: (entryId: string) => void;
}

const ITEM_HEIGHT = 80; // Height of each table row
const CONTAINER_HEIGHT = 600; // Height of the virtualized container

export function FieldManagement({ dictionaryId, onViewHistory }: FieldManagementProps) {
  const [page, setPage] = useState(0);
  const [pageSize] = useState(50); // Increased page size for virtualization
  const [sortField, setSortField] = useState('field_name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [searchTerm, setSearchTerm] = useState('');
  const [advancedFilters, setAdvancedFilters] = useState<any[]>([]);
  const [editingEntry, setEditingEntry] = useState<any>(null);
  const [managingRelations, setManagingRelations] = useState<any>(null);
  
  const debouncedSearch = useDebounce(searchTerm, 300);

  const { data, isLoading, error, refetch, syncStatus, isOnline } = useDictionaryEntries({
    dictionaryId,
    page,
    pageSize,
    sortField,
    sortDirection,
    search: debouncedSearch,
    filters: advancedFilters,
  });

  const {
    containerRef,
    visibleItems,
    totalHeight,
    offsetY,
    onScroll,
    startIndex,
    endIndex
  } = useVirtualizedList(data?.entries || [], {
    itemHeight: ITEM_HEIGHT,
    containerHeight: CONTAINER_HEIGHT,
    overscan: 5,
    onEndReached: () => {
      if (data && (page + 1) * pageSize < data.total) {
        setPage(page + 1);
      }
    }
  });

  const handleSort = useCallback((field: string) => {
    if (field === sortField) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    setPage(0); // Reset to first page when sorting changes
  }, [sortField, sortDirection]);

  const handleAdvancedFilters = useCallback((filters: any[]) => {
    setAdvancedFilters(filters);
    setPage(0); // Reset to first page when filters change
  }, []);

  const handleSearch = useCallback((term: string) => {
    setSearchTerm(term);
    setPage(0); // Reset to first page when search changes
  }, []);

  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const renderTableRow = useCallback((entry: any, index: number) => (
    <div className="flex items-center px-4 py-2 border-b">
      <div className="flex-1 font-medium">{entry.field_name}</div>
      <div className="flex-1">
        <Badge variant="secondary">{entry.data_type}</Badge>
      </div>
      <div className="flex-1 truncate">{entry.description}</div>
      <div className="flex-1">
        <WorkflowStatus
          entryId={entry.id}
          currentStatus={entry.workflow_status}
          onStatusChange={refetch}
        />
      </div>
      <div className="w-[100px]">
        <EntryActions
          entryId={entry.id}
          onEdit={() => setEditingEntry(entry)}
          onDelete={refetch}
          onViewHistory={() => onViewHistory?.(entry.id)}
          onManageRelations={() => setManagingRelations(entry)}
        />
      </div>
    </div>
  ), [onViewHistory, refetch]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search fields..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <SearchDialog onSearch={handleAdvancedFilters} />
        </div>
        <div className="flex items-center gap-2">
          <SyncIndicator
            isSyncing={syncStatus.isSyncing}
            isOnline={isOnline}
            lastSyncedAt={syncStatus.lastSyncedAt}
            error={syncStatus.error}
          />
          <CreateEntryDialog 
            dictionaryId={dictionaryId}
            onSuccess={handleRefresh}
          />
        </div>
      </div>

      <div className="rounded-md border">
        {/* Table Header */}
        <div className="flex items-center px-4 py-2 border-b bg-muted/50 font-medium">
          <div className="flex-1 cursor-pointer" onClick={() => handleSort('field_name')}>
            Field Name
            {sortField === 'field_name' && (
              <span className="ml-2">{sortDirection === 'asc' ? '↑' : '↓'}</span>
            )}
          </div>
          <div className="flex-1 cursor-pointer" onClick={() => handleSort('data_type')}>
            Data Type
            {sortField === 'data_type' && (
              <span className="ml-2">{sortDirection === 'asc' ? '↑' : '↓'}</span>
            )}
          </div>
          <div className="flex-1">Description</div>
          <div className="flex-1">Status</div>
          <div className="w-[100px]">Actions</div>
        </div>

        {/* Virtualized Table Body */}
        <VirtualizedList
          ref={containerRef}
          items={data?.entries || []}
          renderItem={renderTableRow}
          itemHeight={ITEM_HEIGHT}
          containerHeight={CONTAINER_HEIGHT}
          className="border-t"
          onScroll={onScroll}
          startIndex={startIndex}
          endIndex={endIndex}
          totalHeight={totalHeight}
          offsetY={offsetY}
        />
      </div>

      {/* Dialogs */}
      {editingEntry && (
        <EditEntryDialog
          entry={editingEntry}
          onClose={() => setEditingEntry(null)}
          onSuccess={() => {
            setEditingEntry(null);
            handleRefresh();
          }}
        />
      )}

      {managingRelations && (
        <RelationsDialog
          entry={managingRelations}
          onClose={() => setManagingRelations(null)}
          onSuccess={() => {
            setManagingRelations(null);
            handleRefresh();
          }}
        />
      )}
    </div>
  );
}