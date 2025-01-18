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
import { importDictionary } from '@/lib/api';
import { Upload, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface DataImportProps {
  dictionaryId: string;
  onSuccess?: () => void;
}

export function DataImport({ dictionaryId, onSuccess }: DataImportProps) {
  const [isImporting, setIsImporting] = useState(false);
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsImporting(true);
      const text = await file.text();
      const data = file.type === 'application/json' ? 
        JSON.parse(text) : 
        parseCSV(text);

      await importDictionary(dictionaryId, data);

      toast({
        title: 'Import Successful',
        description: 'Dictionary data imported successfully',
      });

      setOpen(false);
      onSuccess?.();
    } catch (error) {
      toast({
        title: 'Import Failed',
        description: error instanceof Error ? error.message : 'Failed to import dictionary data',
        variant: 'destructive',
      });
    } finally {
      setIsImporting(false);
    }
  };

  const parseCSV = (csv: string) => {
    const lines = csv.split('\n');
    const headers = lines[0].split(',');
    return lines.slice(1).map(line => {
      const values = line.split(',');
      return headers.reduce((obj, header, index) => ({
        ...obj,
        [header]: values[index]
      }), {});
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Upload className="h-4 w-4 mr-2" />
          Import Data
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Import Dictionary Data</DialogTitle>
          <DialogDescription>
            Upload a JSON or CSV file containing dictionary entries.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="flex items-center justify-center border-2 border-dashed rounded-lg p-8">
            <label className="cursor-pointer text-center">
              <input
                type="file"
                accept=".json,.csv"
                onChange={handleFileUpload}
                className="hidden"
                disabled={isImporting}
              />
              {isImporting ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Importing...
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">
                  Click to upload or drag and drop
                  <br />
                  JSON or CSV files only
                </div>
              )}
            </label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}