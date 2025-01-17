import { useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useCache } from './use-cache';

interface TeamMember {
  id: string;
  user_id: string;
  dictionary_id: string;
  role: 'owner' | 'editor' | 'viewer';
  created_at: string;
  invited_by: string;
  invited_at: string;
  user: {
    email: string;
  };
  inviter: {
    email: string;
  };
}

interface UseTeamOptions {
  dictionaryId: string;
}

export function useTeam({ dictionaryId }: UseTeamOptions) {
  const fetcher = useCallback(async () => {
    const { data, error } = await supabase
      .from('team_members')
      .select(`
        *,
        user:user_id (
          email
        ),
        inviter:invited_by (
          email
        )
      `)
      .eq('dictionary_id', dictionaryId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as TeamMember[];
  }, [dictionaryId]);

  return useCache(fetcher, {
    key: `team:${dictionaryId}`,
    ttl: 60000, // 1 minute
  });
}