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

  const handleGenerateSuggestions = async () => {
    try {
      if (!data?.entries) {
        throw new Error('No dictionary entries found');
      }

      const existingFields: string[] = data.entries
        .map(entry => {
          if (typeof entry === 'object' && entry !== null && 'name' in entry) {
            return entry.name;
          }
          return '';
        })
        .filter((name): name is string => typeof name === 'string' && name.length > 0);

      const newSuggestions = await generateFieldSuggestions(
        { id: dictionaryId, name: 'Dictionary' },
        existingFields
      );
      
      setSuggestions(newSuggestions);
    } catch (error) {
      console.error('Error generating suggestions:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to generate suggestions',
        variant: 'destructive',
      });
    }
  };

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
