import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { validateEntry, QualityRule, QualityViolation } from '@/lib/quality-management';
import { useToast } from './use-toast';

interface UseDataQualityProps {
  dictionaryId: string;
}

export function useDataQuality({ dictionaryId }: UseDataQualityProps) {
  const [rules, setRules] = useState<QualityRule[]>([]);
  const [violations, setViolations] = useState<QualityViolation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  // Fetch quality rules for the dictionary
  const fetchQualityRules = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('quality_rules')
        .select('*')
        .eq('dictionary_id', dictionaryId)
        .eq('enabled', true);

      if (error) throw error;

      setRules(data || []);
    } catch (error) {
      console.error('Error fetching quality rules:', error);
      toast({
        title: 'Error',
        description: 'Failed to load quality rules',
        variant: 'destructive',
      });
    }
  }, [dictionaryId, toast]);

  // Validate a single entry against all rules
  const validateSingleEntry = useCallback((entry: Record<string, any>): QualityViolation[] => {
    return validateEntry(entry, rules);
  }, [rules]);

  // Bulk validate entries
  const validateEntries = useCallback(async (entries: Record<string, any>[]) => {
    const allViolations: QualityViolation[] = [];

    entries.forEach(entry => {
      const entryViolations = validateSingleEntry(entry);
      allViolations.push(...entryViolations);
    });

    setViolations(allViolations);
    return allViolations;
  }, [validateSingleEntry]);

  // Fetch existing violations for the dictionary
  const fetchViolations = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('quality_violations')
        .select(`
          *,
          rule:rule_id(*),
          entry:entry_id(*)
        `)
        .eq('entry_id.dictionary_id', dictionaryId)
        .is('resolved_at', null);

      if (error) throw error;

      setViolations(data || []);
    } catch (error) {
      console.error('Error fetching violations:', error);
      toast({
        title: 'Error',
        description: 'Failed to load data quality violations',
        variant: 'destructive',
      });
    }
  }, [dictionaryId, toast]);

  // Resolve a specific violation
  const resolveViolation = useCallback(async (violationId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('quality_violations')
        .update({
          resolved_at: new Date().toISOString(),
          resolved_by: user.id
        })
        .eq('id', violationId);

      if (error) throw error;

      // Remove the resolved violation from the local state
      setViolations(currentViolations => 
        currentViolations.filter(v => v.id !== violationId)
      );

      toast({
        title: 'Success',
        description: 'Violation resolved successfully',
      });
    } catch (error) {
      console.error('Error resolving violation:', error);
      toast({
        title: 'Error',
        description: 'Failed to resolve violation',
        variant: 'destructive',
      });
    }
  }, [toast]);

  // Initialize data quality checks
  useEffect(() => {
    const initializeDataQuality = async () => {
      setIsLoading(true);
      try {
        await fetchQualityRules();
        await fetchViolations();
      } finally {
        setIsLoading(false);
      }
    };

    initializeDataQuality();
  }, [dictionaryId, fetchQualityRules, fetchViolations]);

  return {
    rules,
    violations,
    isLoading,
    validateSingleEntry,
    validateEntries,
    resolveViolation,
    fetchQualityRules,
    fetchViolations,
  };
}