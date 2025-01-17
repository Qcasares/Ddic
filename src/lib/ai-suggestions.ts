import { supabase } from './supabase';
import { Configuration, OpenAIApi } from 'openai';

// Initialize OpenAI
const configuration = new Configuration({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

interface FieldSuggestion {
  field_name: string;
  data_type: string;
  description: string;
  validation_rules?: Record<string, any>;
  sample_values?: any[];
}

export async function generateFieldSuggestions(
  schema: string,
  existingFields: any[]
): Promise<FieldSuggestion[]> {
  try {
    const prompt = `
      Analyze this database schema and suggest field definitions:
      ${schema}

      Existing fields:
      ${JSON.stringify(existingFields, null, 2)}

      Provide suggestions for additional fields that would complement the existing schema.
      Include field name, data type, description, and any relevant validation rules.
      Format the response as a JSON array of field objects.
    `;

    const response = await openai.createCompletion({
      model: "text-davinci-003",
      prompt,
      max_tokens: 1000,
      temperature: 0.7,
    });

    const suggestions = JSON.parse(response.data.choices[0].text || '[]');
    return suggestions;
  } catch (error) {
    console.error('Error generating field suggestions:', error);
    throw error;
  }
}

export async function analyzeFieldQuality(field: any): Promise<{
  score: number;
  suggestions: string[];
}> {
  try {
    const prompt = `
      Analyze this field definition and provide quality suggestions:
      ${JSON.stringify(field, null, 2)}

      Consider:
      1. Naming conventions
      2. Description completeness
      3. Data type appropriateness
      4. Validation rules
      5. Sample values

      Provide a quality score (0-100) and list of improvement suggestions.
      Format the response as JSON: { "score": number, "suggestions": string[] }
    `;

    const response = await openai.createCompletion({
      model: "text-davinci-003",
      prompt,
      max_tokens: 500,
      temperature: 0.3,
    });

    return JSON.parse(response.data.choices[0].text || '{"score": 0, "suggestions": []}');
  } catch (error) {
    console.error('Error analyzing field quality:', error);
    throw error;
  }
}