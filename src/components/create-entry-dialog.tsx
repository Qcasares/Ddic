import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { MetadataEditor, type MetadataField } from './metadata-field';
import { validateOrThrow, entrySchema } from '@/lib/validation';
import { withErrorHandling } from '@/lib/error-handler';
import { retry } from '@/lib/retry';

const DATA_TYPES = [
  'string',
  'number',
  'boolean',
  'date',
  'datetime',
  'array',
  'object',
  'null',
] as const;

interface CreateEntryDialogProps {
  dictionaryId: string;
}

export function CreateEntryDialog({ dictionaryId }: CreateEntryDialogProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    field_name: '',
    data_type: 'string' as typeof DATA_TYPES[number],
    description: '',
    sample_values: '',
    metadata: [] as MetadataField[],
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Transform form data to match schema
      const validatedData = validateOrThrow(entrySchema, {
        ...formData,
        sample_values: formData.sample_values ? 
          formData.sample_values.split(',').map(v => v.trim()) : 
          [],
        metadata: formData.metadata?.reduce((acc, field) => ({
          ...acc,
          [field.key]: {
            value: field.value,
            type: field.type
          }
        }), {}),
      });

      await retry(async () => {
        await withErrorHandling(async () => {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) throw new Error('No authenticated user');

          const { error } = await supabase.from('dictionary_entries').insert([{
            dictionary_id: dictionaryId,
            ...validatedData,
            workflow_status: 'draft',
            created_by: user.id
          }]);

          if (error) throw error;

          toast({
            title: 'Success',
            description: 'Entry created successfully!',
          });

          setOpen(false);
          resetForm();
        }, { showToast: false });
      }, {
        maxAttempts: 3,
        retryableErrors: new Set(['NETWORK_ERROR', 'DATABASE_ERROR'])
      });
    } catch (error) {
      if (error instanceof Error) {
        setErrors({
          ...errors,
          submit: error.message
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      field_name: '',
      data_type: 'string',
      description: '',
      sample_values: '',
      metadata: []
    });
    setErrors({});
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          New Entry
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create Entry</DialogTitle>
            <DialogDescription>
              Add a new field to your data dictionary.
            </DialogDescription>
          </DialogHeader>

          {errors.submit && (
            <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md mb-4">
              {errors.submit}
            </div>
          )}

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="fieldName">Field Name</Label>
              <Input
                id="fieldName"
                value={formData.field_name}
                onChange={(e) => {
                  setFormData({ ...formData, field_name: e.target.value });
                  setErrors(prev => ({ ...prev, field_name: undefined }));
                }}
                placeholder="Enter field name (e.g., user_id)"
                className={errors.field_name ? 'border-destructive' : ''}
                disabled={isLoading}
              />
              {errors.field_name && (
                <p className="text-sm text-destructive">{errors.field_name}</p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="dataType">Data Type</Label>
              <Select 
                value={formData.data_type} 
                onValueChange={(value) => {
                  setFormData({ ...formData, data_type: value as typeof DATA_TYPES[number] });
                  setErrors(prev => ({ ...prev, data_type: undefined }));
                }}
                disabled={isLoading}
              >
                <SelectTrigger id="dataType">
                  <SelectValue placeholder="Select data type" />
                </SelectTrigger>
                <SelectContent>
                  {DATA_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.data_type && (
                <p className="text-sm text-destructive">{errors.data_type}</p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => {
                  setFormData({ ...formData, description: e.target.value });
                  setErrors(prev => ({ ...prev, description: undefined }));
                }}
                placeholder="Enter field description"
                className={errors.description ? 'border-destructive' : ''}
                disabled={isLoading}
              />
              {errors.description && (
                <p className="text-sm text-destructive">{errors.description}</p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="sampleValues">Sample Values</Label>
              <Input
                id="sampleValues"
                value={formData.sample_values}
                onChange={(e) => {
                  setFormData({ ...formData, sample_values: e.target.value });
                  setErrors(prev => ({ ...prev, sample_values: undefined }));
                }}
                placeholder="Enter comma-separated sample values"
                disabled={isLoading}
              />
              {errors.sample_values && (
                <p className="text-sm text-destructive">{errors.sample_values}</p>
              )}
            </div>

            <MetadataEditor
              metadata={formData.metadata}
              onChange={(metadata) => {
                setFormData({ ...formData, metadata });
                setErrors(prev => ({ ...prev, metadata: undefined }));
              }}
              disabled={isLoading}
            />
          </div>

          <DialogFooter>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Entry'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}