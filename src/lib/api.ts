import { 
  Dictionary, 
  Version, 
  DictionaryEntry, 
  AnalyticsMetrics,
  DatabaseQualityRule,
  DatabaseQualityScore,
  QualityTrendData,
  QualityMetrics
} from '@/types';
import { supabase } from './supabase';
import { QualityRule, QualityScore, qualityRuleEngine } from './quality-management';

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
    },

    getRules: async (dictionaryId: string): Promise<ApiResponse<QualityRule[]>> => {
      try {
        const { data, error } = await supabase
          .from('quality_rules')
          .select('*')
          .eq('dictionary_id', dictionaryId);

        if (error) throw error;

        const rules = data as DatabaseQualityRule[];
        return {
          data: rules.map(rule => {
            const qualityRule: QualityRule = {
              id: rule.id,
              dictionaryId: rule.dictionary_id,
              name: rule.name,
              ruleType: rule.rule_type,
              configuration: rule.configuration,
              severity: rule.severity,
              createdAt: rule.created_at,
              createdBy: rule.created_by,
              updatedAt: rule.updated_at
            };
            return qualityRule;
          }),
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
            configuration: {
              field: rule.configuration.field,
              ...(rule.ruleType === 'regex' && {
                pattern: rule.configuration.pattern,
                flags: rule.configuration.flags
              }),
              ...(rule.ruleType === 'required_field' && {
                allowEmpty: rule.configuration.allowEmpty
              }),
              ...(rule.ruleType === 'length' && {
                minLength: rule.configuration.minLength,
                maxLength: rule.configuration.maxLength
              }),
              ...(rule.ruleType === 'format' && {
                format: rule.configuration.format
              })
            },
            severity: rule.severity,
            created_by: rule.createdBy
          } as DatabaseQualityRule)
          .single();

        if (error) throw error;

        const dbRule = data as DatabaseQualityRule;
        return {
          data: {
            id: dbRule.id,
            dictionaryId: dbRule.dictionary_id,
            name: dbRule.name,
            ruleType: dbRule.rule_type,
            configuration: dbRule.configuration,
            severity: dbRule.severity,
            createdAt: dbRule.created_at,
            createdBy: dbRule.created_by,
            updatedAt: dbRule.updated_at
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

        const dbRule = data as DatabaseQualityRule;
        return {
          data: {
            id: dbRule.id,
            dictionaryId: dbRule.dictionary_id,
            name: dbRule.name,
            ruleType: dbRule.rule_type,
            configuration: dbRule.configuration,
            severity: dbRule.severity,
            createdAt: dbRule.created_at,
            createdBy: dbRule.created_by,
            updatedAt: dbRule.updated_at
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
        const { data: entry, error: entryError } = await supabase
          .from('dictionary_entries')
          .select('*, dictionaries!inner(*)')
          .eq('id', entryId)
          .single();

        if (entryError) throw entryError;

        await qualityRuleEngine.loadRules(entry.dictionary_id);
        const score = await qualityRuleEngine.evaluateEntry(entry);

        return { data: score, error: null };
      } catch (error) {
        return { data: null, error: error as Error };
      }
    },

    getDictionaryQuality: async (dictionaryId: string): Promise<ApiResponse<QualityMetrics>> => {
      try {
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

        const dbScores = scores as DatabaseQualityScore[];

        const averageScore = dbScores.length > 0
          ? dbScores.reduce((sum, score) => sum + score.total_score, 0) / dbScores.length
          : 0;

        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const qualityTrend = dbScores
          .filter(score => new Date(score.created_at) >= thirtyDaysAgo)
          .reduce((acc, score) => {
            const date = score.created_at.split('T')[0];
            if (!acc[date]) {
              acc[date] = { sum: 0, count: 0 };
            }
            acc[date].sum += score.total_score;
            acc[date].count++;
            return acc;
          }, {} as Record<string, QualityTrendData>);

        const issueCount: Record<string, number> = {};
        dbScores.forEach(score => {
          score.failed_rules.forEach(rule => {
            issueCount[rule.ruleId] = (issueCount[rule.ruleId] || 0) + 1;
          });
        });

        const ruleIds = Object.keys(issueCount);
        const { data: rules, error: rulesError } = await supabase
          .from('quality_rules')
          .select('id, name')
          .in('id', ruleIds);

        if (rulesError) throw rulesError;

        const dbRules = rules as DatabaseQualityRule[];
        const ruleNames = Object.fromEntries(
          dbRules.map(rule => [rule.id, rule.name])
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

export async function calculateQualityScore(entry: DictionaryEntry): Promise<number> {
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