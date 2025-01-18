import { supabase } from './supabase';
import { OpenAIApi } from 'openai';

export interface FieldSuggestion {
  name: string;
  description: string;
  confidence: number;
}

const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  throw new Error('OPENAI_API_KEY environment variable is required');
}

const openai = new OpenAIApi({
  apiKey,
});

export async function generateFieldSuggestions(
  dictionary: any,
  existingFields: string[]
): Promise<FieldSuggestion[]> {
  try {
    const prompt = `Generate 5 field suggestions for a dictionary about ${dictionary.name}. Existing fields: ${existingFields.join(', ')}`;
    
    const response = await openai.createCompletion({
      model: 'text-davinci-003',
      prompt,
      max_tokens: 200,
      temperature: 0.7,
    });

    return parseSuggestions(response.data.choices[0].text || '');
  } catch (error) {
    console.error('Error generating suggestions:', error);
    return [];
  }
}

function parseSuggestions(text: string): FieldSuggestion[] {
  const suggestions: FieldSuggestion[] = [];
  const lines = text.split('\n').filter(line => line.trim());
  
  lines.forEach(line => {
    const [name, description] = line.split(':');
    if (name && description) {
      suggestions.push({
        name: name.trim(),
        description: description.trim(),
        confidence: 0.8, // Default confidence
      });
    }
  });

  return suggestions;
}