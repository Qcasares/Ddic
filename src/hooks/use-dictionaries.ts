import { useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useCache } from './use-cache';

interface Dictionary {
  id: string;
  name: string;
  description: string;
  created_at: string;
  created_by: string;
  version: number;
  is_archived: boolean;
}

export function useDictionaries() {
  const fetcher = useCallback(async () => {
    const { data, error } = await supabase
      .from('dictionaries')
      .select('*')
      .eq('is_archived', false)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error('Failed to fetch dictionaries');
    }
    
    return data as Dictionary[];
  }, []);

  return useCache(fetcher, {
    key: 'dictionaries',
    ttl: 30000, // 30 seconds
  });
}