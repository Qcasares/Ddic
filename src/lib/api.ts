import { supabase } from './supabase';

// Export/Import
export async function exportDictionary(dictionaryId: string, format: 'json' | 'csv' = 'json') {
  const { data: entries, error } = await supabase
    .from('dictionary_entries')
    .select('*')
    .eq('dictionary_id', dictionaryId);

  if (error) throw error;

  if (format === 'csv') {
    const headers = Object.keys(entries[0] || {}).join(',');
    const rows = entries.map(entry => 
      Object.values(entry).map(value => 
        typeof value === 'object' ? JSON.stringify(value) : value
      ).join(',')
    );
    return `${headers}\n${rows.join('\n')}`;
  }

  return JSON.stringify(entries, null, 2);
}

export async function importDictionary(dictionaryId: string, data: any[]) {
  const { error } = await supabase
    .from('dictionary_entries')
    .insert(data.map(entry => ({
      ...entry,
      dictionary_id: dictionaryId
    })));

  if (error) throw error;
}

// Search and Filter
export async function searchEntries(dictionaryId: string, query: string) {
  const { data, error } = await supabase
    .from('dictionary_entries')
    .select('*')
    .eq('dictionary_id', dictionaryId)
    .textSearch('search_vector', query);

  if (error) throw error;
  return data;
}

// Data Quality
export function calculateQualityScore(entry: any) {
  let score = 0;
  const checks = [
    { weight: 0.3, check: () => !!entry.description },
    { weight: 0.2, check: () => entry.sample_values?.length > 0 },
    { weight: 0.2, check: () => Object.keys(entry.metadata || {}).length > 0 },
    { weight: 0.3, check: () => entry.validation_rules && Object.keys(entry.validation_rules).length > 0 }
  ];

  return checks.reduce((total, { weight, check }) => 
    total + (check() ? weight : 0), 0) * 100;
}

// Analytics
export async function getActivityMetrics(dictionaryId: string) {
  const { data: entries, error: entriesError } = await supabase
    .from('dictionary_entries')
    .select('created_at, updated_at')
    .eq('dictionary_id', dictionaryId);

  if (entriesError) throw entriesError;

  const { data: versions, error: versionsError } = await supabase
    .from('entry_versions')
    .select('created_at')
    .eq('dictionary_id', dictionaryId);

  if (versionsError) throw versionsError;

  return {
    totalEntries: entries.length,
    totalChanges: versions.length,
    lastUpdated: entries.reduce((latest, entry) => 
      Math.max(latest, new Date(entry.updated_at).getTime()), 0),
    changeFrequency: versions.length / (entries.length || 1)
  };
}

// Validation
export function validateEntry(entry: any, rules: any) {
  const validations = {
    required: (value: any) => value !== undefined && value !== null && value !== '',
    minLength: (value: string, min: number) => value.length >= min,
    maxLength: (value: string, max: number) => value.length <= max,
    pattern: (value: string, pattern: string) => new RegExp(pattern).test(value),
    enum: (value: any, allowed: any[]) => allowed.includes(value),
    type: (value: any, type: string) => typeof value === type
  };

  const errors: Record<string, string[]> = {};

  Object.entries(rules).forEach(([field, fieldRules]: [string, any]) => {
    const value = entry[field];
    const fieldErrors: string[] = [];

    Object.entries(fieldRules).forEach(([rule, param]) => {
      if (validations[rule as keyof typeof validations]) {
        const isValid = validations[rule as keyof typeof validations](value, param);
        if (!isValid) {
          fieldErrors.push(`Failed ${rule} validation`);
        }
      }
    });

    if (fieldErrors.length > 0) {
      errors[field] = fieldErrors;
    }
  });

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}