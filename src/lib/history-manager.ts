import { supabase } from './supabase';
import { cacheManager } from './cache-manager';
import { QueryOptimizer } from './query-optimizer';
import { performanceMonitor } from './performance-monitor';

export interface HistoryEntry {
  id: string;
  entry_id: string;
  version: number;
  changes: Record<string, { old: any; new: any }>;
  created_at: string;
  created_by: string;
  dictionary_id: string;
  user?: {
    email: string;
  };
  dictionary_entries?: {
    field_name: string;
  };
}

export interface HistoryFilter {
  startDate?: Date;
  endDate?: Date;
  userId?: string;
  actionType?: string;
}

export async function fetchHistory(
  dictionaryId: string,
  page: number = 0,
  pageSize: number = 10,
  filters?: HistoryFilter
) {
  const cacheKey = `history:${dictionaryId}:${page}:${pageSize}:${JSON.stringify(filters)}`;
  const startTime = performance.now();

  try {
    return await cacheManager.get(
      cacheKey,
      async () => {
        const query = {
          page,
          pageSize,
          filters: {
            dictionary_id: dictionaryId,
            ...(filters?.startDate && {
              created_at_gte: filters.startDate.toISOString()
            }),
            ...(filters?.endDate && {
              created_at_lte: filters.endDate.toISOString()
            }),
            ...(filters?.userId && {
              created_by: filters.userId
            })
          },
          sort: {
            field: 'created_at',
            direction: 'desc' as const
          }
        };

        const { data, total } = await QueryOptimizer.fetchWithPagination<HistoryEntry>(
          'entry_versions',
          query
        );

        // Fetch related data in parallel
        const [userResponse, entriesResponse] = await Promise.all([
          supabase
            .from('users')
            .select('id, email')
            .in('id', data.map(entry => entry.created_by)),
          supabase
            .from('dictionary_entries')
            .select('id, field_name')
            .in('id', data.map(entry => entry.entry_id))
        ]);

        // Create lookup maps
        const userMap = new Map(userResponse.data?.map(user => [user.id, user]));
        const entryMap = new Map(entriesResponse.data?.map(entry => [entry.id, entry]));

        // Enrich history entries with related data
        const enrichedData = data.map(entry => ({
          ...entry,
          user: userMap.get(entry.created_by),
          dictionary_entries: entryMap.get(entry.entry_id)
        }));

        return {
          entries: enrichedData,
          total
        };
      },
      30000 // 30 second cache
    );
  } finally {
    performanceMonitor.measure('fetchHistory', startTime);
  }
}

export async function revertChange(
  entryId: string,
  version: number
): Promise<void> {
  const startTime = performance.now();

  try {
    // Fetch the version to revert to
    const { data: versionData, error: versionError } = await supabase
      .from('entry_versions')
      .select('changes, dictionary_id')
      .eq('entry_id', entryId)
      .eq('version', version)
      .single();

    if (versionError) throw versionError;

    // Extract old values from changes
    const revertedValues = Object.entries(versionData.changes).reduce(
      (acc, [key, value]: [string, any]) => ({
        ...acc,
        [key]: value.old
      }),
      {}
    );

    // Update the entry with reverted values
    const { error: updateError } = await supabase
      .from('dictionary_entries')
      .update(revertedValues)
      .eq('id', entryId);

    if (updateError) throw updateError;

    // Invalidate relevant caches
    cacheManager.invalidate(`history:${versionData.dictionary_id}*`);
  } finally {
    performanceMonitor.measure('revertChange', startTime);
  }
}

export function getChangeDescription(change: Record<string, any>): string {
  const descriptions: string[] = [];

  for (const [field, values] of Object.entries(change)) {
    if (field === 'updated_at') continue;

    const oldValue = values.old;
    const newValue = values.new;

    if (typeof oldValue === 'object' || typeof newValue === 'object') {
      descriptions.push(`Modified ${field}`);
    } else {
      descriptions.push(
        `Changed ${field} from "${oldValue}" to "${newValue}"`
      );
    }
  }

  return descriptions.join(', ');
}