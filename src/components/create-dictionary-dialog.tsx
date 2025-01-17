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
import { Plus, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { withErrorHandling, AppError, ErrorType } from '@/lib/error-handler';
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

interface CreateDictionaryDialogProps {
  onSuccess?: () => void;
}

export function CreateDictionaryDialog({ onSuccess }: CreateDictionaryDialogProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    domain: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { toast } = useToast();

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      domain: '',
    });
    setErrors({});
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // Validate form data
      const validatedData = dictionarySchema.parse(formData);
      setErrors({});
      setIsLoading(true);

      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setErrors({ submit: 'Not authenticated' });
          return;
        }

        // Check if dictionary with same name exists
        const { data: existingDicts, error: checkError } = await supabase
          .from('dictionaries')
          .select('id')
          .ilike('name', validatedData.name);

        if (checkError) {
          setErrors({ submit: 'Failed to check dictionary name' });
          return;
        }
        
        if (existingDicts && existingDicts.length > 0) {
          setErrors({ name: 'A dictionary with this name already exists' });
          return;
        }

        const { error } = await supabase.from('dictionaries').insert([{
          name: validatedData.name,
          description: validatedData.description || '',
          domain: validatedData.domain,
          created_by: user.id,
          status: 'draft',
        }]);

        if (error) {
          setErrors({ submit: 'Failed to create dictionary' });
          return;
        }

        toast({
          title: 'Success',
          description: 'Dictionary created successfully!',
        });

        setOpen(false);
        resetForm();
        onSuccess?.();
      } catch (error) {
        if (error instanceof AppError) {
          setErrors({ submit: error.message });
        } else {
          setErrors({ submit: 'An unexpected error occurred' });
        }
      }
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
    <Dialog open={open} onOpenChange={(newOpen) => {
      setOpen(newOpen);
      if (!newOpen) {
        resetForm();
      }
    }}>
      <DialogTrigger asChild>
        <Button className="w-full justify-start" variant="outline">
          <Plus className="h-4 w-4 mr-2" />
          New Dictionary
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create Dictionary</DialogTitle>
            <DialogDescription>
              Create a new data dictionary to organize your field definitions.
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
              onClick={() => setOpen(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Dictionary'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}