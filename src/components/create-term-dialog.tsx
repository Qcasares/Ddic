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
import { Plus, Loader2, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { withErrorHandling, AppError, ErrorType } from '@/lib/error-handler';
import { z } from 'zod';

const termSchema = z.object({
  name: z.string()
    .min(1, 'Name is required')
    .max(100, 'Name must be less than 100 characters')
    .regex(/^[a-zA-Z0-9\s_-]+$/, 'Name can only contain letters, numbers, spaces, underscores, and hyphens'),
  definition: z.string()
    .min(1, 'Definition is required')
    .max(500, 'Definition must be less than 500 characters'),
  domain: z.string()
    .min(1, 'Domain is required')
    .max(100, 'Domain must be less than 100 characters'),
  synonyms: z.array(z.string().min(1, 'Synonym cannot be empty')).optional(),
});

interface CreateTermDialogProps {
  onSuccess?: () => void;
}

export function CreateTermDialog({ onSuccess }: CreateTermDialogProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    definition: '',
    domain: '',
    synonyms: [''] as string[],
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { toast } = useToast();

  const resetForm = () => {
    setFormData({
      name: '',
      definition: '',
      domain: '',
      synonyms: [''],
    });
    setErrors({});
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // Clean up empty synonyms
      const cleanedData = {
        ...formData,
        synonyms: formData.synonyms.filter(s => s.trim() !== '')
      };

      // Validate form data
      const validatedData = termSchema.parse(cleanedData);
      setErrors({});
      setIsLoading(true);

      await withErrorHandling(async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          throw new AppError('Not authenticated', ErrorType.AUTH);
        }

        // Check if term already exists
        const { data: existingTerm } = await supabase
          .from('business_terms')
          .select('id')
          .ilike('name', validatedData.name)
          .single();

        if (existingTerm) {
          throw new AppError('A term with this name already exists', ErrorType.VALIDATION);
        }

        const { error } = await supabase.from('business_terms').insert([{
          name: validatedData.name,
          definition: validatedData.definition,
          domain: validatedData.domain,
          synonyms: validatedData.synonyms,
          status: 'draft',
          created_by: user.id,
        }]);

        if (error) throw error;

        toast({
          title: 'Success',
          description: 'Business term created successfully!',
        });

        setOpen(false);
        resetForm();
        onSuccess?.();
      }, {
        maxRetries: 2,
        retryDelay: 500
      });
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
        throw error;
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSynonymAdd = () => {
    const lastSynonym = formData.synonyms[formData.synonyms.length - 1];
    if (lastSynonym && lastSynonym.trim()) {
      setFormData({
        ...formData,
        synonyms: [...formData.synonyms, ''],
      });
    }
  };

  const handleSynonymChange = (index: number, value: string) => {
    const newSynonyms = [...formData.synonyms];
    newSynonyms[index] = value;
    setFormData({
      ...formData,
      synonyms: newSynonyms,
    });
    // Clear synonym-specific error when user starts typing
    if (errors[`synonyms.${index}`]) {
      const newErrors = { ...errors };
      delete newErrors[`synonyms.${index}`];
      setErrors(newErrors);
    }
  };

  const handleSynonymRemove = (index: number) => {
    setFormData({
      ...formData,
      synonyms: formData.synonyms.filter((_, i) => i !== index),
    });
    // Clear synonym-specific error when removed
    if (errors[`synonyms.${index}`]) {
      const newErrors = { ...errors };
      delete newErrors[`synonyms.${index}`];
      setErrors(newErrors);
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
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          New Term
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create Business Term</DialogTitle>
            <DialogDescription>
              Add a new term to the business glossary.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Term Name</Label>
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
                placeholder="Enter term name"
                className={errors.name ? 'border-destructive' : ''}
                disabled={isLoading}
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name}</p>
              )}
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="definition">Definition</Label>
              <Textarea
                id="definition"
                value={formData.definition}
                onChange={(e) => {
                  setFormData({ ...formData, definition: e.target.value });
                  if (errors.definition) {
                    const newErrors = { ...errors };
                    delete newErrors.definition;
                    setErrors(newErrors);
                  }
                }}
                placeholder="Enter term definition"
                className={errors.definition ? 'border-destructive' : ''}
                disabled={isLoading}
              />
              {errors.definition && (
                <p className="text-sm text-destructive">{errors.definition}</p>
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
              <Label>Synonyms</Label>
              {formData.synonyms.map((synonym, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={synonym}
                    onChange={(e) => handleSynonymChange(index, e.target.value)}
                    placeholder="Enter synonym"
                    className={errors[`synonyms.${index}`] ? 'border-destructive' : ''}
                    disabled={isLoading}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => handleSynonymRemove(index)}
                    disabled={isLoading || formData.synonyms.length === 1}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              {errors.synonyms && (
                <p className="text-sm text-destructive">{errors.synonyms}</p>
              )}
              <Button
                type="button"
                variant="outline"
                onClick={handleSynonymAdd}
                disabled={isLoading || !formData.synonyms[formData.synonyms.length - 1].trim()}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Synonym
              </Button>
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
                'Create Term'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}