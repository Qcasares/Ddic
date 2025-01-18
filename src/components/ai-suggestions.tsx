import { useDictionaryEntries } from '@/hooks/use-dictionary-entries';
import { generateFieldSuggestions, FieldSuggestion } from '@/lib/ai-suggestions';
import { useState } from 'react';
import type { DictionaryEntry } from '@/types/dictionary';

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
    const existingFields = data?.entries.map((entry: DictionaryEntry) => entry.name) || [];
    const newSuggestions = await generateFieldSuggestions(
      { id: dictionaryId, name: 'Dictionary' },
      existingFields
    );
    setSuggestions(newSuggestions);
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