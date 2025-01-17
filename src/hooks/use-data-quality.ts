import { useState, useEffect } from 'react';
import { calculateQualityScore } from '@/lib/api';
import { supabase } from '@/lib/supabase';

export function useDataQuality(dictionaryId: string) {
  const [scores, setScores] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchQualityScores() {
      try {
        const { data: entries, error } = await supabase
          .from('dictionary_entries')
          .select('*')
          .eq('dictionary_id', dictionaryId);

        if (error) throw error;

        const entryScores = entries.reduce((acc, entry) => ({
          ...acc,
          [entry.id]: calculateQualityScore(entry)
        }), {});

        setScores(entryScores);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch quality scores'));
      } finally {
        setIsLoading(false);
      }
    }

    fetchQualityScores();
  }, [dictionaryId]);

  return { scores, isLoading, error };
}