import { createClient } from '@supabase/supabase-js';
import { Dictionary, Version, DictionaryEntry } from '@/types';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

interface ApiResponse<T> {
  data: T | null;
  error: Error | null;
}

export const api = {
  auth: {
    getSession: async (): Promise<ApiResponse<{ user: any }>> => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        return { data: { user: data.session?.user }, error: null };
      } catch (error) {
        return { data: null, error: error as Error };
      }
    },
    getUser: async (): Promise<ApiResponse<{ user: any }>> => {
      try {
        const { data, error } = await supabase.auth.getUser();
        if (error) throw error;
        return { data, error: null };
      } catch (error) {
        return { data: null, error: error as Error };
      }
    }
  },
  dictionaries: {
    list: async (): Promise<ApiResponse<Dictionary[]>> => {
      try {
        const { data, error } = await supabase
          .from('dictionaries')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;
        return { data, error: null };
      } catch (error) {
        return { data: null, error: error as Error };
      }
    },

    create: async (dictionary: Omit<Dictionary, 'id'>): Promise<ApiResponse<Dictionary>> => {
      try {
        const { data, error } = await supabase
          .from('dictionaries')
          .insert(dictionary)
          .single();

        if (error) throw error;
        return { data, error: null };
      } catch (error) {
        return { data: null, error: error as Error };
      }
    },

    update: async (id: string, updates: Partial<Dictionary>): Promise<ApiResponse<Dictionary>> => {
      try {
        const { data, error } = await supabase
          .from('dictionaries')
          .update(updates)
          .eq('id', id)
          .single();

        if (error) throw error;
        return { data, error: null };
      } catch (error) {
        return { data: null, error: error as Error };
      }
    }
  },

  versions: {
    list: async (dictionaryId: string): Promise<ApiResponse<Version[]>> => {
      try {
        const { data, error } = await supabase
          .from('versions')
          .select('*')
          .eq('dictionary_id', dictionaryId)
          .order('created_at', { ascending: false });

        if (error) throw error;
        return { data, error: null };
      } catch (error) {
        return { data: null, error: error as Error };
      }
    }
  },

  quality: {
    calculateQualityScore: (entry: DictionaryEntry): number => {
      // Calculate score based on completeness of required fields
      const requiredFields = ['term', 'definition', 'examples', 'tags'];
      const filledFields = requiredFields.filter(field => entry[field]);
      const completenessScore = (filledFields.length / requiredFields.length) * 50;

      // Calculate score based on metadata quality
      const metadataScore = entry.metadata?.length ? 30 : 0;
      
      // Calculate score based on relationships
      const relationshipsScore = entry.related_terms?.length ? 20 : 0;

      return Math.min(100, completenessScore + metadataScore + relationshipsScore);
    }
  },
  
  analytics: {
    getActivityMetrics: async (dictionaryId: string): Promise<ApiResponse<{
      views: number;
      edits: number;
      searches: number;
      activeUsers: number;
    }>> => {
      try {
        const { data, error } = await supabase
          .from('dictionary_activity')
          .select('views, edits, searches, active_users')
          .eq('dictionary_id', dictionaryId)
          .single();

        if (error) throw error;
        return {
          data: {
            views: data?.views || 0,
            edits: data?.edits || 0,
            searches: data?.searches || 0,
            activeUsers: data?.active_users || 0
          },
          error: null
        };
      } catch (error) {
        return {
          data: null,
          error: error as Error
        };
      }
    }
  }
}

export function calculateQualityScore(entry: DictionaryEntry): number {
  return api.quality.calculateQualityScore(entry);
};

export async function getActivityMetrics(dictionaryId: string) {
  return api.analytics.getActivityMetrics(dictionaryId);
}