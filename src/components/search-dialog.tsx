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
import { Filter } from 'lucide-react';
import { AdvancedSearch } from './advanced-search';

interface SearchDialogProps {
  onSearch: (criteria: any) => void;
}

export function SearchDialog({ onSearch }: SearchDialogProps) {
  const [open, setOpen] = useState(false);

  const handleSearch = (criteria: any) => {
    onSearch(criteria);
    setOpen(false);
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