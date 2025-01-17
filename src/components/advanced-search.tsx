import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, Plus, X } from 'lucide-react';

interface SearchCriteria {
  field: string;
  operator: string;
  value: string;
}

interface AdvancedSearchProps {
  onSearch: (criteria: SearchCriteria[]) => void;
}

const SEARCH_FIELDS = [
  { value: 'field_name', label: 'Field Name' },
  { value: 'data_type', label: 'Data Type' },
  { value: 'description', label: 'Description' },
  { value: 'validation_rules', label: 'Validation Rules' },
  { value: 'sample_values', label: 'Sample Values' },
];

const OPERATORS = [
  { value: 'contains', label: 'Contains' },
  { value: 'equals', label: 'Equals' },
  { value: 'starts_with', label: 'Starts with' },
  { value: 'ends_with', label: 'Ends with' },
];

export function AdvancedSearch({ onSearch }: AdvancedSearchProps) {
  const [criteria, setCriteria] = useState<SearchCriteria[]>([
    { field: 'field_name', operator: 'contains', value: '' },
  ]);

  const addCriteria = () => {
    setCriteria([
      ...criteria,
      { field: 'field_name', operator: 'contains', value: '' },
    ]);
  };

  const removeCriteria = (index: number) => {
    setCriteria(criteria.filter((_, i) => i !== index));
  };

  const updateCriteria = (index: number, field: keyof SearchCriteria, value: string) => {
    const newCriteria = [...criteria];
    newCriteria[index] = { ...newCriteria[index], [field]: value };
    setCriteria(newCriteria);
  };

  const handleSearch = () => {
    onSearch(criteria.filter(c => c.value.trim() !== ''));
  };

  return (
    <div className="space-y-4">
      <div className="space-y-4">
        {criteria.map((criterion, index) => (
          <div key={index} className="flex gap-4 items-start">
            <div className="flex-1">
              <Label className="sr-only">Field</Label>
              <Select
                value={criterion.field}
                onValueChange={(value) => updateCriteria(index, 'field', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SEARCH_FIELDS.map((field) => (
                    <SelectItem key={field.value} value={field.value}>
                      {field.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex-1">
              <Label className="sr-only">Operator</Label>
              <Select
                value={criterion.operator}
                onValueChange={(value) => updateCriteria(index, 'operator', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {OPERATORS.map((op) => (
                    <SelectItem key={op.value} value={op.value}>
                      {op.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex-1">
              <Label className="sr-only">Value</Label>
              <Input
                value={criterion.value}
                onChange={(e) => updateCriteria(index, 'value', e.target.value)}
                placeholder="Enter search value"
              />
            </div>
            
            <Button
              variant="ghost"
              size="icon"
              onClick={() => removeCriteria(index)}
              disabled={criteria.length === 1}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
      
      <div className="flex justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={addCriteria}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Criteria
        </Button>
        
        <Button onClick={handleSearch}>
          <Search className="h-4 w-4 mr-2" />
          Search
        </Button>
      </div>
    </div>
  );
}