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
import { Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';

const dictionarySchema = z.object({
  name: z.string()
    .min(1, 'Name is required')
    .max(100, 'Name must be less than 100 characters')
    .regex(/^[a-zA-Z0-9\s_-]+$/, 'Name can only contain letters, numbers, spaces, underscores, and hyphens'),
  description: z.string()
    .max(500, 'Description must be less than 500 characters')
    .optional(),
  domain: z.string()
    .min(1, 'Domain is required')
    .max(100, 'Domain must be less than 100 characters'),
});

interface EditDictionaryDialogProps {
  dictionary: any;
  onClose: () => void;
  onSuccess?: () => void;
}

export function EditDictionaryDialog({ dictionary, onClose, onSuccess }: EditDictionaryDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: dictionary?.name || '',
    description: dictionary?.description || '',
    domain: dictionary?.domain || '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // Validate form data
      const validatedData = dictionarySchema.parse(formData);
      setErrors({});
      setIsLoading(true);

      // Check if dictionary with same name exists (excluding current dictionary)
      const { data: existingDicts, error: checkError } = await supabase
        .from('dictionaries')
        .select('id')
        .neq('id', dictionary.id)
        .ilike('name', validatedData.name);

      if (checkError) {
        setErrors({ submit: 'Failed to check dictionary name' });
        return;
      }
      
      if (existingDicts && existingDicts.length > 0) {
        setErrors({ name: 'A dictionary with this name already exists' });
        return;
      }

      const { error } = await supabase
        .from('dictionaries')
        .update({
          name: validatedData.name,
          description: validatedData.description || '',
          domain: validatedData.domain,
        })
        .eq('id', dictionary.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Dictionary updated successfully!',
      });

      onSuccess?.();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          const field = err.path[0]?.toString();
          if (field) {
            newErrors[field] = err.message;
          }
        });
        setErrors(newErrors);
      } else {
        setErrors({ submit: 'An unexpected error occurred' });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={!!dictionary} onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Edit Dictionary</DialogTitle>
            <DialogDescription>
              Update your dictionary details.
            </DialogDescription>
          </DialogHeader>

          {errors.submit && (
            <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md mb-4">
              {errors.submit}
            </div>
          )}

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => {
                  setFormData({ ...formData, name: e.target.value });
                  if (errors.name) {
                    const newErrors = { ...errors };
                    delete newErrors.name;
                    setErrors(newErrors);
                  }
                }}
                placeholder="Enter dictionary name"
                className={errors.name ? 'border-destructive' : ''}
                disabled={isLoading}
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name}</p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="domain">Domain</Label>
              <Input
                id="domain"
                value={formData.domain}
                onChange={(e) => {
                  setFormData({ ...formData, domain: e.target.value });
                  if (errors.domain) {
                    const newErrors = { ...errors };
                    delete newErrors.domain;
                    setErrors(newErrors);
                  }
                }}
                placeholder="Enter business domain"
                className={errors.domain ? 'border-destructive' : ''}
                disabled={isLoading}
              />
              {errors.domain && (
                <p className="text-sm text-destructive">{errors.domain}</p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => {
                  setFormData({ ...formData, description: e.target.value });
                  if (errors.description) {
                    const newErrors = { ...errors };
                    delete newErrors.description;
                    setErrors(newErrors);
                  }
                }}
                placeholder="Enter dictionary description"
                className={errors.description ? 'border-destructive' : ''}
                disabled={isLoading}
              />
              {errors.description && (
                <p className="text-sm text-destructive">{errors.description}</p>
              )}
            </div>
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