import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Filter } from 'lucide-react';
import { AdvancedSearch } from './advanced-search';

import type { SearchCriteria } from '@/components/advanced-search';

interface SearchDialogProps {
  onSearch: (criteria: SearchCriteria[]) => void;
}

export function SearchDialog({ onSearch }: SearchDialogProps) {
  const [open, setOpen] = useState(false);

  const handleSearch = (criteria: SearchCriteria[]) => {
    try {
      // Validate criteria array
      if (!Array.isArray(criteria)) {
        throw new Error('Search criteria must be an array');
      }
      
      if (criteria.length === 0) {
        throw new Error('At least one search criterion is required');
      }

      // Validate each criterion
      criteria.forEach((criterion, index) => {
        if (!criterion.field) {
          throw new Error(`Search criterion ${index + 1} is missing a field`);
        }
        if (!criterion.operator) {
          throw new Error(`Search criterion ${index + 1} is missing an operator`);
        }
        if (criterion.value === undefined || criterion.value === null) {
          throw new Error(`Search criterion ${index + 1} is missing a value`);
        }
      });

      // Check for duplicate fields
      const fields = criteria.map(c => c.field);
      const duplicates = fields.filter((field, index) => fields.indexOf(field) !== index);
      if (duplicates.length > 0) {
        throw new Error(`Duplicate search criteria for field: ${duplicates[0]}`);
      }

      onSearch(criteria);
      setOpen(false);
    } catch (error) {
      toast({
        title: 'Search Error',
        description: error instanceof Error ? error.message : 'Failed to perform search',
        variant: 'destructive'
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon">
          <Filter className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Advanced Search</DialogTitle>
          <DialogDescription>
            Search and filter dictionary entries using multiple criteria.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <AdvancedSearch onSearch={handleSearch} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
