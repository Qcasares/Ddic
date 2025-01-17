import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { MetadataEditor, type MetadataField } from './metadata-field';
import { validateOrThrow, entrySchema } from '@/lib/validation';

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

interface EditEntryDialogProps {
  entry: any;
  onClose: () => void;
  onSuccess?: () => void;
}

export function EditEntryDialog({ entry, onClose, onSuccess }: EditEntryDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    field_name: entry?.field_name || '',
    data_type: entry?.data_type || 'string',
    description: entry?.description || '',
    sample_values: Array.isArray(entry?.sample_values) 
      ? entry.sample_values.join(', ')
      : '',
    metadata: entry?.metadata ? Object.entries(entry.metadata).map(([key, value]: [string, any]) => ({
      key,
      value: value.value,
      type: value.type
    })) : [] as MetadataField[],
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

      const { error } = await supabase
        .from('dictionary_entries')
        .update({
          field_name: validatedData.field_name,
          data_type: validatedData.data_type,
          description: validatedData.description,
          sample_values: validatedData.sample_values,
          metadata: validatedData.metadata,
        })
        .eq('id', entry.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Entry updated successfully!',
      });

      onSuccess?.();
    } catch (error) {
      if (error instanceof Error) {
        setErrors({
          ...errors,
          submit: error.message
        });
      }
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update entry',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={!!entry} onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-[600px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Edit Entry</DialogTitle>
            <DialogDescription>
              Update the field details.
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
            <Button 
              variant="outline" 
              type="button" 
              onClick={onClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}