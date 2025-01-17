import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Plus, Loader2, Link2, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { useDebounce } from '@/hooks/use-debounce';

interface RelationsDialogProps {
  entry: any;
  onClose: () => void;
  onSuccess?: () => void;
}

export function RelationsDialog({ entry, onClose, onSuccess }: RelationsDialogProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [fields, setFields] = useState<any[]>([]);
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 300);
  const { toast } = useToast();

  useEffect(() => {
    loadFields();
  }, [debouncedSearch]);

  useEffect(() => {
    if (entry?.related_fields) {
      setSelectedFields(entry.related_fields);
    }
  }, [entry]);

  const loadFields = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('dictionary_entries')
        .select('id, field_name, data_type')
        .eq('dictionary_id', entry.dictionary_id)
        .neq('id', entry.id)
        .order('field_name');

      if (error) throw error;

      if (debouncedSearch) {
        const filtered = data.filter(field => 
          field.field_name.toLowerCase().includes(debouncedSearch.toLowerCase())
        );
        setFields(filtered);
      } else {
        setFields(data);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to load fields',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);

      const { error } = await supabase
        .from('dictionary_entries')
        .update({ related_fields: selectedFields })
        .eq('id', entry.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Relations updated successfully!',
      });

      onSuccess?.();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update relations',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const toggleField = (fieldId: string) => {
    setSelectedFields(prev => 
      prev.includes(fieldId)
        ? prev.filter(id => id !== fieldId)
        : [...prev, fieldId]
    );
  };

  return (
    <Dialog open={!!entry} onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Manage Relations</DialogTitle>
          <DialogDescription>
            Select fields that are related to <span className="font-medium">{entry?.field_name}</span>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search fields..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>

          <ScrollArea className="h-[400px] border rounded-md">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : fields.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-4">
                <Link2 className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  {searchTerm ? 'No matching fields found' : 'No fields available'}
                </p>
              </div>
            ) : (
              <div className="p-4 space-y-2">
                {fields.map((field) => (
                  <div
                    key={field.id}
                    className={`
                      flex items-center justify-between p-3 rounded-md border
                      transition-colors cursor-pointer
                      ${selectedFields.includes(field.id) 
                        ? 'bg-primary/5 border-primary/20' 
                        : 'hover:bg-accent'}
                    `}
                    onClick={() => toggleField(field.id)}
                  >
                    <div className="flex items-center gap-2">
                      <div className="flex flex-col">
                        <span className="font-medium">{field.field_name}</span>
                        <Badge variant="secondary" className="w-fit">
                          {field.data_type}
                        </Badge>
                      </div>
                    </div>
                    {selectedFields.includes(field.id) && (
                      <X className="h-4 w-4 text-primary" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              {selectedFields.length} field{selectedFields.length !== 1 ? 's' : ''} selected
            </span>
          </div>
        </div>

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={onClose}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}