import { 
  Dictionary, 
  DictionaryEntry, 
  AnalyticsMetrics,
  ProcessingResult,
  ProcessingOptions
} from '@/types';
import { supabase } from './supabase';
import {
  qualityRuleEngine
} from './quality-management';
import { documentProcessor } from './document-processor';

export interface ApiResponse<T> {
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

    import: async (dictionaryId: string, data: any[]): Promise<ApiResponse<void>> => {
      try {
        const { error } = await supabase
          .from('dictionary_entries')
          .insert(
            data.map(entry => ({
              dictionary_id: dictionaryId,
              ...entry
            }))
          );

        if (error) throw error;
        return { data: null, error: null };
      } catch (error) {
        return { data: null, error: error as Error };
      }
    },

    export: async (dictionaryId: string, format: 'json' | 'csv'): Promise<ApiResponse<string>> => {
      try {
        const { data, error } = await supabase
          .from('dictionary_entries')
          .select('*')
          .eq('dictionary_id', dictionaryId);

        if (error) throw error;
        
        if (format === 'json') {
          return { data: JSON.stringify(data, null, 2), error: null };
        } else {
          const headers = Object.keys(data[0] || {}).join(',');
          const rows = data.map(entry =>
            Object.values(entry)
              .map(value =>
                typeof value === 'string' && value.includes(',')
                  ? `"${value}"`
                  : value
              )
              .join(',')
          ).join('\n');
          
          return { data: `${headers}\n${rows}`, error: null };
        }
      } catch (error) {
        return { data: null, error: error as Error };
      }
    }
  },

  documents: {
    process: async (
      file: File,
      options: ProcessingOptions
    ): Promise<ApiResponse<ProcessingResult>> => {
      try {
        const result = await documentProcessor.processDocument(file, options);
        
        // Store processing results in Supabase if needed
        if (result.status === 'completed') {
          const { error } = await supabase
            .from('document_processing_results')
            .insert({
              document_id: result.documentId,
              extracted_terms: result.extractedTerms,
              processing_metrics: result.processingMetrics,
              created_at: new Date().toISOString()
            });

          if (error) throw error;
        }

        return { data: result, error: null };
      } catch (error) {
        console.error('Document processing error:', error);
        return { 
          data: null, 
          error: error instanceof Error ? error : new Error('Unknown error during document processing') 
        };
      }
    },

    getProcessingHistory: async (): Promise<ApiResponse<ProcessingResult[]>> => {
      try {
        const { data, error } = await supabase
          .from('document_processing_results')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;
        return { data, error: null };
      } catch (error) {
        return { data: null, error: error as Error };
      }
    }
  },

  analytics: {
    getActivityMetrics: async (dictionaryId: string): Promise<ApiResponse<AnalyticsMetrics>> => {
      try {
        const activityPromise = supabase
          .from('dictionary_activity')
          .select('views, edits, searches, active_users')
          .eq('dictionary_id', dictionaryId)
          .single();

        const entriesPromise = supabase
          .from('dictionary_entries')
          .select('count', { count: 'exact', head: true })
          .eq('dictionary_id', dictionaryId);

        const lastUpdatePromise = supabase
          .from('dictionary_entries')
          .select('updated_at')
          .eq('dictionary_id', dictionaryId)
          .order('updated_at', { ascending: false })
          .limit(1)
          .single();

        const performancePromise = supabase
          .from('performance_metrics')
          .select('load_time, interaction_time, device_type')
          .eq('dictionary_id', dictionaryId);

        const [activity, entries, lastUpdate, performance] = await Promise.all([
          activityPromise,
          entriesPromise,
          lastUpdatePromise,
          performancePromise
        ]);

        if (activity.error) throw activity.error;
        if (entries.error) throw entries.error;
        if (lastUpdate.error) throw lastUpdate.error;
        if (performance.error) throw performance.error;

        const avgLoadTime = performance.data.length > 0
          ? performance.data.reduce((sum, p) => sum + p.load_time, 0) / performance.data.length
          : 0;

        const avgInteractionTime = performance.data.length > 0
          ? performance.data.reduce((sum, p) => sum + p.interaction_time, 0) / performance.data.length
          : 0;

        const deviceTypes = performance.data.reduce((acc, p) => {
          acc[p.device_type] = (acc[p.device_type] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        const activityData = activity.data || { views: 0, edits: 0, searches: 0, active_users: 0 };

        return {
          data: {
            totalEntries: entries.count || 0,
            totalChanges: activityData.edits,
            lastUpdated: lastUpdate.data?.updated_at || new Date().toISOString(),
            changeFrequency: activityData.views > 0 ? activityData.edits / activityData.views : 0,
            performance: {
              avgLoadTime,
              avgInteractionTime,
              deviceTypes
            },
            activity: {
              views: activityData.views,
              edits: activityData.edits,
              searches: activityData.searches,
              activeUsers: activityData.active_users
            }
          },
          error: null
        };
      } catch (error) {
        return { data: null, error: error as Error };
      }
    }
  },

  quality: {
    calculateQualityScore: async (entry: DictionaryEntry): Promise<number> => {
      const score = await qualityRuleEngine.evaluateEntry(entry);
      return score.totalScore;
    }
  }
};

// Exported functions for direct use
export const getActivityMetrics = api.analytics.getActivityMetrics;
export const calculateQualityScore = api.quality.calculateQualityScore;
export const importDictionary = api.dictionaries.import;
export const exportDictionary = api.dictionaries.export;
export const processDocument = api.documents.process;
export const getProcessingHistory = api.documents.getProcessingHistory;