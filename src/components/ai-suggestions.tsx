import { useDictionaryEntries } from '@/hooks/use-dictionary-entries';
import { generateFieldSuggestions, FieldSuggestion } from '@/lib/ai-suggestions';
import { useState } from 'react';

export function AISuggestions({ dictionaryId }: { dictionaryId: string }) {
  const { data } = useDictionaryEntries({
    dictionaryId,
    page: 1,
    pageSize: 10,
    sortField: 'name',
    sortDirection: 'asc'
  });

  const [suggestions, setSuggestions] = useState<FieldSuggestion[]>([]);

  const handleGenerateSuggestions = useCallback(async () => {
    try {
      if (!data?.entries) {
        throw new Error('No dictionary entries found');
      }

      // Validate entries structure
      if (!Array.isArray(data.entries)) {
        throw new Error('Invalid entries format');
      }

      const existingFields: string[] = data.entries
        .map(entry => {
          if (typeof entry === 'object' && entry !== null && 'name' in entry) {
            return entry.name;
          }
          return '';
        })
        .filter((name): name is string => {
          if (typeof name !== 'string') {
            console.warn('Non-string name found:', name);
            return false;
          }
          return name.length > 0;
        });

      if (existingFields.length === 0) {
        throw new Error('No valid field names found');
      }

      const newSuggestions = await generateFieldSuggestions(
        { id: dictionaryId, name: 'Dictionary' },
        existingFields
      );
      
      if (!Array.isArray(newSuggestions)) {
        throw new Error('Invalid suggestions format');
      }

      setSuggestions(newSuggestions);
    } catch (error) {
      console.error('Error generating suggestions:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to generate suggestions',
        variant: 'destructive',
      });
    }
  }, [data, dictionaryId, toast]);

  return (
    <div>
      <button onClick={handleGenerateSuggestions}>
        Generate Suggestions
      </button>
      <ul>
        {suggestions.map((suggestion, index) => (
          <li key={index}>
            <strong>{suggestion.name}</strong>: {suggestion.description}
          </li>
        ))}
      </ul>
    </div>
  );
}
