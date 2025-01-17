import { supabase } from './supabase';

interface QueryOptions {
  page?: number;
  pageSize?: number;
  filters?: Record<string, any>;
  sort?: { field: string; direction: 'asc' | 'desc' };
}

export class QueryOptimizer {
  static async fetchWithPagination<T>(
    table: string,
    options: QueryOptions = {}
  ): Promise<{ data: T[]; total: number }> {
    const {
      page = 0,
      pageSize = 10,
      filters = {},
      sort
    } = options;

    let query = supabase
      .from(table)
      .select('*', { count: 'exact' });

    // Apply filters
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        query = query.eq(key, value);
      }
    });

    // Apply sorting
    if (sort) {
      query = query.order(sort.field, { ascending: sort.direction === 'asc' });
    }

    // Apply pagination
    const from = page * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) throw error;

    return {
      data: data as T[],
      total: count || 0
    };
  }

  static buildSearchVector(fields: string[], values: any[]): string {
    return fields
      .map((field, index) => `setweight(to_tsvector('english', coalesce(${values[index]}::text, '')), '${String.fromCharCode(65 + index)}')`)
      .join(' || ');
  }
}