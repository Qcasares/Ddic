import { useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useCache } from './use-cache';
import { useRealtimeSync } from './use-realtime-sync';

interface DictionaryEntry {
  id: string;
  dictionary_id: string;
  field_name: string;
  data_type: string;
  description: string | null;
  sample_values: any[];
  metadata: Record<string, any>;
  workflow_status: string;
  created_at: string;
  created_by: string;
}

interface UseDictionaryEntriesOptions {
  dictionaryId: string;
  page: number;
  pageSize: number;
  sortField: string;
  sortDirection: 'asc' | 'desc';
  search?: string;
  filters?: Array<{
    field: string;
    operator: string;
    value: string;
  }>;
}

export function useDictionaryEntries({
  dictionaryId,
  page,
  pageSize,
  sortField,
  sortDirection,
  search,
  filters = [],
}: UseDictionaryEntriesOptions) {
  const fetcher = useCallback(async () => {
    let query = supabase
      .from('dictionary_entries')
      .select('*', { count: 'exact' })
      .eq('dictionary_id', dictionaryId);

    // Apply search
    if (search) {
      query = query.textSearch('search_vector', search);
    }

    // Apply filters
    filters.forEach(({ field, operator, value }) => {
      switch (operator) {
        case 'equals':
          query = query.eq(field, value);
          break;
        case 'contains':
          query = query.ilike(field, `%${value}%`);
          break;
        case 'starts_with':
          query = query.ilike(field, `${value}%`);
          break;
        case 'ends_with':
          query = query.ilike(field, `%${value}`);
          break;
      }
    });

    // Apply sorting and pagination
    const { data, error, count } = await query
      .order(sortField, { ascending: sortDirection === 'asc' })
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (error) throw error;

    return {
      entries: data as DictionaryEntry[],
      total: count || 0,
    };
  }, [dictionaryId, page, pageSize, sortField, sortDirection, search, filters]);

  const cacheKey = `entries:${dictionaryId}:${page}:${pageSize}:${sortField}:${sortDirection}:${search}:${JSON.stringify(filters)}`;
  
  const { data: initialData, isLoading, error, refetch } = useCache(fetcher, {
    key: cacheKey,
    ttl: 30000, // 30 seconds
  });

  // Subscribe to real-time updates
  const { data: realtimeData, syncStatus, isOnline } = useRealtimeSync(
    `dictionary-entries-${dictionaryId}`,
    'dictionary_entries',
    initialData || { entries: [], total: 0 },
    {
      onDataUpdate: refetch,
      priority: 'high'
    }
  );

  return {
    data: realtimeData,
    isLoading,
    error,
    refetch,
    syncStatus,
    isOnline
  };
}