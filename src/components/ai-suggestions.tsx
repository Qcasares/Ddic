import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Loader2, Sparkles, Plus, ThumbsUp, ThumbsDown } from 'lucide-react';
import { generateFieldSuggestions, analyzeFieldQuality } from '@/lib/ai-suggestions';
import { useToast } from '@/hooks/use-toast';

interface AISuggestionsProps {
  dictionaryId: string;
  onApplySuggestion: (suggestion: any) => void;
}

export function AISuggestions({ dictionaryId, onApplySuggestion }: AISuggestionsProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const { toast } = useToast();

  const handleGenerateSuggestions = async () => {
    try {
      setIsLoading(true);
      
      // Get existing fields
      const { data: existingFields } = await supabase
        .from('dictionary_entries')
        .select('*')
        .eq('dictionary_id', dictionaryId);

      // Get schema
      const { data: dictionary } = await supabase
        .from('dictionaries')
        .select('*')
        .eq('id', dictionaryId)
        .single();

      const newSuggestions = await generateFieldSuggestions(
        dictionary.schema || '',
        existingFields || []
      );

      setSuggestions(newSuggestions);
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to generate suggestions',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h3 className="font-medium">AI Suggestions</h3>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleGenerateSuggestions}
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-2" />
              Generate Suggestions
            </>
          )}
        </Button>
      </div>

      <ScrollArea className="h-[300px]">
        {suggestions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Sparkles className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              Click generate to get AI-powered field suggestions
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {suggestions.map((suggestion, index) => (
              <Card key={index} className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-medium">{suggestion.field_name}</h4>
                      <Badge variant="secondary">{suggestion.data_type}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      {suggestion.description}
                    </p>
                    {suggestion.validation_rules && (
                      <div className="text-sm">
                        <span className="font-medium">Validation:</span>{' '}
                        {Object.entries(suggestion.validation_rules).map(([key, value]) => (
                          <Badge key={key} variant="outline" className="mr-2">
                            {key}: {String(value)}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onApplySuggestion(suggestion)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon">
                      <ThumbsUp className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon">
                      <ThumbsDown className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </ScrollArea>
    </Card>
  );
}