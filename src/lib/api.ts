import { Dictionary, Version, DictionaryEntry, AnalyticsMetrics } from '@/types';
import { supabase } from './supabase';

interface ApiResponse<T> {
  data: T | null;
  error: Error | null;
}

import { QualityRule, QualityScore, qualityRuleEngine } from './quality-management';

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
          // Convert to CSV
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
      const requiredFields = ['term', 'definition', 'examples', 'tags'];
      const filledFields = requiredFields.filter(field => entry[field]);
      const completenessScore = (filledFields.length / requiredFields.length) * 50;
      const metadataScore = entry.metadata?.length ? 30 : 0;
      const relationshipsScore = entry.related_terms?.length ? 20 : 0;
      return Math.min(100, completenessScore + metadataScore + relationshipsScore);
    }
  },
  
  analytics: {
    getActivityMetrics: async (dictionaryId: string): Promise<ApiResponse<AnalyticsMetrics>> => {
      try {
        // Get activity metrics
        const activityPromise = supabase
          .from('dictionary_activity')
          .select('views, edits, searches, active_users')
          .eq('dictionary_id', dictionaryId)
          .single();

        // Get entry count
        const entriesPromise = supabase
          .from('dictionary_entries')
          .select('count', { count: 'exact', head: true })
          .eq('dictionary_id', dictionaryId);

        // Get last update timestamp
        const lastUpdatePromise = supabase
          .from('dictionary_entries')
          .select('updated_at')
          .eq('dictionary_id', dictionaryId)
          .order('updated_at', { ascending: false })
          .limit(1)
          .single();

        // Get performance metrics
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

        // Calculate performance metrics
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
    getRules: async (dictionaryId: string): Promise<ApiResponse<QualityRule[]>> => {
      try {
        const { data, error } = await supabase
          .from('quality_rules')
          .select('*')
          .eq('dictionary_id', dictionaryId);

        if (error) throw error;
        return {
          data: data.map(rule => ({
            id: rule.id,
            dictionaryId: rule.dictionary_id,
            name: rule.name,
            ruleType: rule.rule_type,
            configuration: rule.configuration,
            severity: rule.severity,
            createdAt: rule.created_at,
            createdBy: rule.created_by,
            updatedAt: rule.updated_at
          })),
          error: null
        };
      } catch (error) {
        return { data: null, error: error as Error };
      }
    },

    createRule: async (rule: Omit<QualityRule, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<QualityRule>> => {
      try {
        const { data, error } = await supabase
          .from('quality_rules')
          .insert({
            dictionary_id: rule.dictionaryId,
            name: rule.name,
            rule_type: rule.ruleType,
            configuration: rule.configuration,
            severity: rule.severity,
            created_by: rule.createdBy
          })
          .single();

        if (error) throw error;
        return {
          data: {
            id: data.id,
            dictionaryId: data.dictionary_id,
            name: data.name,
            ruleType: data.rule_type,
            configuration: data.configuration,
            severity: data.severity,
            createdAt: data.created_at,
            createdBy: data.created_by,
            updatedAt: data.updated_at
          },
          error: null
        };
      } catch (error) {
        return { data: null, error: error as Error };
      }
    },

    updateRule: async (id: string, updates: Partial<Omit<QualityRule, 'id' | 'createdAt' | 'updatedAt'>>): Promise<ApiResponse<QualityRule>> => {
      try {
        const { data, error } = await supabase
          .from('quality_rules')
          .update({
            name: updates.name,
            rule_type: updates.ruleType,
            configuration: updates.configuration,
            severity: updates.severity
          })
          .eq('id', id)
          .single();

        if (error) throw error;
        return {
          data: {
            id: data.id,
            dictionaryId: data.dictionary_id,
            name: data.name,
            ruleType: data.rule_type,
            configuration: data.configuration,
            severity: data.severity,
            createdAt: data.created_at,
            createdBy: data.created_by,
            updatedAt: data.updated_at
          },
          error: null
        };
      } catch (error) {
        return { data: null, error: error as Error };
      }
    },

    deleteRule: async (id: string): Promise<ApiResponse<void>> => {
      try {
        const { error } = await supabase
          .from('quality_rules')
          .delete()
          .eq('id', id);

        if (error) throw error;
        return { data: null, error: null };
      } catch (error) {
        return { data: null, error: error as Error };
      }
    },

    evaluateEntry: async (entryId: string): Promise<ApiResponse<QualityScore>> => {
      try {
        // Get the entry and its dictionary
        const { data: entry, error: entryError } = await supabase
          .from('dictionary_entries')
          .select('*, dictionaries!inner(*)')
          .eq('id', entryId)
          .single();

        if (entryError) throw entryError;

        // Load rules for the dictionary
        await qualityRuleEngine.loadRules(entry.dictionary_id);

        // Evaluate the entry
        const score = await qualityRuleEngine.evaluateEntry(entry);

        return { data: score, error: null };
      } catch (error) {
        return { data: null, error: error as Error };
      }
    },

    getDictionaryQuality: async (dictionaryId: string): Promise<ApiResponse<{
      averageScore: number;
      qualityTrend: Array<{ date: string; score: number }>;
      commonIssues: Array<{ rule: string; count: number }>;
    }>> => {
      try {
        // Get all quality scores for the dictionary
        const { data: entries, error: entriesError } = await supabase
          .from('dictionary_entries')
          .select('id')
          .eq('dictionary_id', dictionaryId);

        if (entriesError) throw entriesError;

        const entryIds = entries.map(e => e.id);

        const { data: scores, error: scoresError } = await supabase
          .from('quality_scores')
          .select('*')
          .in('entry_id', entryIds)
          .order('created_at', { ascending: false });

        if (scoresError) throw scoresError;

        // Calculate average score
        const averageScore = scores.length > 0
          ? scores.reduce((sum, score) => sum + score.total_score, 0) / scores.length
          : 0;

        // Calculate quality trend (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const qualityTrend = scores
          .filter(score => new Date(score.created_at) >= thirtyDaysAgo)
          .reduce((acc, score) => {
            const date = score.created_at.split('T')[0];
            if (!acc[date]) {
              acc[date] = { sum: 0, count: 0 };
            }
            acc[date].sum += score.total_score;
            acc[date].count++;
            return acc;
          }, {} as Record<string, { sum: number; count: number }>);

        // Calculate common issues
        const issueCount: Record<string, number> = {};
        scores.forEach(score => {
          score.failed_rules.forEach(rule => {
            issueCount[rule.ruleId] = (issueCount[rule.ruleId] || 0) + 1;
          });
        });

        // Get rule names for common issues
        const ruleIds = Object.keys(issueCount);
        const { data: rules, error: rulesError } = await supabase
          .from('quality_rules')
          .select('id, name')
          .in('id', ruleIds);

        if (rulesError) throw rulesError;

        const ruleNames = Object.fromEntries(
          rules.map(rule => [rule.id, rule.name])
        );

        return {
          data: {
            averageScore,
            qualityTrend: Object.entries(qualityTrend).map(([date, { sum, count }]) => ({
              date,
              score: sum / count
            })).sort((a, b) => a.date.localeCompare(b.date)),
            commonIssues: Object.entries(issueCount)
              .map(([ruleId, count]) => ({
                rule: ruleNames[ruleId] || 'Unknown Rule',
                count
              }))
              .sort((a, b) => b.count - a.count)
          },
          error: null
        };
      } catch (error) {
        return { data: null, error: error as Error };
      }
    }
  }
};

export function calculateQualityScore(entry: DictionaryEntry): number {
  return api.quality.calculateQualityScore(entry);
}

export async function getActivityMetrics(dictionaryId: string) {
  return api.analytics.getActivityMetrics(dictionaryId);
}

export async function importDictionary(dictionaryId: string, data: any[]) {
  return api.dictionaries.import(dictionaryId, data);
}

export async function exportDictionary(dictionaryId: string, format: 'json' | 'csv'): Promise<ApiResponse<string>> {
  return api.dictionaries.export(dictionaryId, format);
}