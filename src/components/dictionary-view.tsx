import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { CreateEntryDialog } from './create-entry-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SearchDialog } from './search-dialog';
import { useDebounce } from '@/hooks/use-debounce';
import { DataLineage } from './data-lineage';
import { QualityDashboard } from './quality-dashboard';
import { AnalyticsDashboard } from './analytics-dashboard';
import { ApprovalQueue } from './approval-queue';
import { BusinessGlossary } from './business-glossary';
import { VersionHistory } from './version-history';
import { CommentsSection } from './comments-section';
import { FieldManagement } from './field-management';

interface DictionaryViewProps {
  dictionaryId: string;
}

export function DictionaryView({ dictionaryId }: DictionaryViewProps) {
  const [selectedEntry, setSelectedEntry] = useState<string | null>(null);

  const handleViewHistory = useCallback((entryId: string) => {
    setSelectedEntry(entryId);
  }, []);

  return (
    <Tabs defaultValue="fields" className="space-y-6">
      <TabsList className="bg-muted/50 p-1 gap-1">
        <TabsTrigger 
          value="fields"
          className="data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
        >
          Fields
        </TabsTrigger>
        <TabsTrigger 
          value="lineage"
          className="data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
        >
          Data Lineage
        </TabsTrigger>
        <TabsTrigger 
          value="quality"
          className="data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
        >
          Quality
        </TabsTrigger>
        <TabsTrigger 
          value="analytics"
          className="data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
        >
          Analytics
        </TabsTrigger>
        <TabsTrigger 
          value="approvals"
          className="data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
        >
          Approvals
        </TabsTrigger>
        <TabsTrigger 
          value="glossary"
          className="data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
        >
          Business Glossary
        </TabsTrigger>
        <TabsTrigger 
          value="history"
          className="data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
        >
          History
        </TabsTrigger>
        <TabsTrigger 
          value="comments"
          className="data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
        >
          Comments
        </TabsTrigger>
      </TabsList>

      <TabsContent value="fields">
        <FieldManagement 
          dictionaryId={dictionaryId}
          onViewHistory={handleViewHistory}
        />
      </TabsContent>

      <TabsContent value="lineage">
        <DataLineage dictionaryId={dictionaryId} />
      </TabsContent>

      <TabsContent value="quality">
        <QualityDashboard dictionaryId={dictionaryId} />
      </TabsContent>

      <TabsContent value="analytics">
        <AnalyticsDashboard dictionaryId={dictionaryId} />
      </TabsContent>

      <TabsContent value="approvals">
        <ApprovalQueue 
          dictionaryId={dictionaryId}
          onEntrySelect={setSelectedEntry}
        />
      </TabsContent>

      <TabsContent value="glossary">
        <BusinessGlossary 
          dictionaryId={dictionaryId}
          onTermSelect={setSelectedEntry}
        />
      </TabsContent>

      <TabsContent value="history">
        <VersionHistory 
          dictionaryId={dictionaryId}
          selectedEntryId={selectedEntry}
        />
      </TabsContent>

      <TabsContent value="comments">
        <CommentsSection entryId={selectedEntry || ''} />
      </TabsContent>
    </Tabs>
  );
}