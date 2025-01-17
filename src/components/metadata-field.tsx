import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trash2 } from 'lucide-react';
import { z } from 'zod';

const metadataSchema = z.object({
  key: z.string().min(1, 'Key is required'),
  value: z.string().min(1, 'Value is required'),
  type: z.enum(['string', 'number', 'boolean', 'date']),
});

export type MetadataField = z.infer<typeof metadataSchema>;

interface MetadataEditorProps {
  metadata: MetadataField[];
  onChange: (metadata: MetadataField[]) => void;
  disabled?: boolean;
}

export function MetadataEditor({ metadata, onChange, disabled = false }: MetadataEditorProps) {
  const [error, setError] = useState<string | null>(null);

  const addField = () => {
    onChange([
      ...metadata,
      { key: '', value: '', type: 'string' },
    ]);
  };

  const removeField = (index: number) => {
    const newMetadata = [...metadata];
    newMetadata.splice(index, 1);
    onChange(newMetadata);
  };

  const updateField = (index: number, field: Partial<MetadataField>) => {
    const newMetadata = [...metadata];
    newMetadata[index] = { ...newMetadata[index], ...field };
    
    try {
      metadataSchema.parse(newMetadata[index]);
      setError(null);
    } catch (e) {
      if (e instanceof z.ZodError) {
        setError(e.errors[0].message);
      }
    }
    
    onChange(newMetadata);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Custom Metadata</h3>
        <Button 
          onClick={addField} 
          variant="outline" 
          size="sm"
          disabled={disabled}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Field
        </Button>
      </div>
      
      {error && (
        <div className="text-sm text-destructive">{error}</div>
      )}
      
      <div className="space-y-4">
        {metadata.map((field, index) => (
          <div key={index} className="flex gap-4 items-start">
            <div className="flex-1">
              <Label>Key</Label>
              <Input
                value={field.key}
                onChange={(e) => updateField(index, { key: e.target.value })}
                placeholder="Enter field key"
                disabled={disabled}
              />
            </div>
            <div className="flex-1">
              <Label>Value</Label>
              <Input
                value={field.value}
                onChange={(e) => updateField(index, { value: e.target.value })}
                placeholder="Enter field value"
                disabled={disabled}
              />
            </div>
            <div className="flex-1">
              <Label>Type</Label>
              <select
                className="w-full h-10 px-3 rounded-md border border-input bg-background"
                value={field.type}
                onChange={(e) => updateField(index, { type: e.target.value as MetadataField['type'] })}
                disabled={disabled}
              >
                <option value="string">String</option>
                <option value="number">Number</option>
                <option value="boolean">Boolean</option>
                <option value="date">Date</option>
              </select>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="mt-6"
              onClick={() => removeField(index)}
              disabled={disabled}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}