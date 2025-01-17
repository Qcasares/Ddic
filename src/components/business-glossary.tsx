import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Book, 
  Plus, 
  Search, 
  Tag,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { CreateTermDialog } from './create-term-dialog';
import { formatDistanceToNow } from 'date-fns';
import { withErrorHandling, AppError, ErrorType } from '@/lib/error-handler';
import { useDebounce } from '@/hooks/use-debounce';

interface BusinessGlossaryProps {
  dictionaryId?: string;
  onTermSelect?: (termId: string) => void;
}

interface BusinessTerm {
  id: string;
  name: string;
  definition: string;
  domain: string;
  status: string;
  synonyms: string[];
  created_at: string;
  user: {
    email: string;
  };
}

export function BusinessGlossary({ dictionaryId, onTermSelect }: BusinessGlossaryProps) {
  const [terms, setTerms] = useState<BusinessTerm[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 300);
  const { toast } = useToast();

  useEffect(() => {
    const fetchTerms = async () => {
      try {
        setIsLoading(true);

        await withErrorHandling(async () => {
          let query = supabase
            .from('business_terms')
            .select(`
              *,
              user:created_by (
                email
              )
            `)
            .order('name');

          if (debouncedSearch) {
            query = query.textSearch('search_vector', debouncedSearch);
          }

          if (dictionaryId) {
            query = query.in('id', (qb) =>
              qb.select('term_id')
                .from('term_relationships')
                .eq('entry_id', dictionaryId)
            );
          }

          const { data, error } = await query;
          if (error) throw error;

          setTerms(data);
        }, {
          maxRetries: 2,
          retryDelay: 500
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchTerms();
  }, [dictionaryId, debouncedSearch, toast]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return (
          <Badge variant="outline" className="bg-green-100 text-green-800">
            <CheckCircle className="h-3 w-3 mr-1" />
            Approved
          </Badge>
        );
      case 'review':
        return (
          <Badge variant="outline" className="bg-blue-100 text-blue-800">
            <AlertCircle className="h-3 w-3 mr-1" />
            In Review
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="bg-yellow-100 text-yellow-800">
            <Clock className="h-3 w-3 mr-1" />
            Draft
          </Badge>
        );
    }
  };

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center h-[500px]">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-sm text-muted-foreground">Loading terms...</p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Book className="h-5 w-5" />
            <h3 className="text-lg font-medium">Business Glossary</h3>
          </div>
          <CreateTermDialog onSuccess={() => setTerms([])} />
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search terms..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <ScrollArea className="h-[500px]">
          <div className="space-y-4">
            {terms.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Book className="h-12 w-12 text-muted-foreground mb-4" />
                <h4 className="text-lg font-medium mb-2">No Terms Found</h4>
                <p className="text-sm text-muted-foreground">
                  {searchQuery 
                    ? "No terms match your search criteria" 
                    : "Start by adding terms to your business glossary"}
                </p>
              </div>
            ) : (
              terms.map((term) => (
                <Card
                  key={term.id}
                  className="p-4 cursor-pointer hover:bg-accent transition-colors"
                  onClick={() => onTermSelect?.(term.id)}
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between">
                      <h4 className="font-medium">{term.name}</h4>
                      {getStatusBadge(term.status)}
                    </div>
                    
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {term.definition}
                    </p>
                    
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Tag className="h-4 w-4" />
                        {term.domain}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {formatDistanceToNow(new Date(term.created_at), { addSuffix: true })}
                      </div>
                    </div>

                    {term.synonyms && term.synonyms.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {term.synonyms.map((synonym, i) => (
                          <Badge key={i} variant="secondary">
                            {synonym}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </Card>
              ))
            )}
          </div>
        </ScrollArea>
      </div>
    </Card>
  );
}