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
    const existingFields: string[] = data?.entries
      .map(entry => ('name' in entry ? entry.name : ''))
      .filter((name): name is string => typeof name === 'string' && name.length > 0) || [];
      
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