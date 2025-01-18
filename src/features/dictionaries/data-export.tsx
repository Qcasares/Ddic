import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { exportDictionary } from '@/lib/api';
import { FileJson, FileSpreadsheet } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface DataExportProps {
  dictionaryId: string;
}

export function DataExport({ dictionaryId }: DataExportProps) {
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  const handleExport = async (format: 'json' | 'csv') => {
    try {
      setIsExporting(true);
      const { data: exportData, error } = await exportDictionary(dictionaryId, format);
      if (error) throw error;
      
      // Ensure exportData is a string
      const exportString = typeof exportData === 'string' ? exportData : JSON.stringify(exportData);
      
      // Create blob and download
      const blob = new Blob([exportString], { type: format === 'json' ? 'application/json' : 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `dictionary-export.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: 'Export Successful',
        description: `Dictionary exported as ${format.toUpperCase()}`,
      });
    } catch (error) {
      toast({
        title: 'Export Failed',
        description: error instanceof Error ? error.message : 'Failed to export dictionary',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => handleExport('json')}
        disabled={isExporting}
      >
        <FileJson className="h-4 w-4 mr-2" />
        Export JSON
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => handleExport('csv')}
        disabled={isExporting}
      >
        <FileSpreadsheet className="h-4 w-4 mr-2" />
        Export CSV
      </Button>
    </div>
  );
}