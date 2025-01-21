import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useDictionaries } from '@/hooks/use-dictionaries'
import { useDictionaryEntries } from '@/hooks/use-dictionary-entries'
import { Card } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CreateEntryDialog } from '@/components/create-entry-dialog'
import { EditEntryDialog } from '@/components/edit-entry-dialog'
import { CommentsSection } from '@/components/comments-section'
import { Loader2 } from 'lucide-react'

interface DictionaryEntry {
  id: string;
  dictionary_id: string;
  field_name: string;
  data_type: string;
  description: string | null;
  sample_values: any[];
  metadata: Record<string, any>;
  workflow_status: string;
  created_at: string;
  created_by: string;
}

export function DictionaryView() {
  const { dictionaryId } = useParams<{ dictionaryId: string }>()
  
  // Return early if no dictionaryId is provided
  if (!dictionaryId) {
    return (
      <div className="flex justify-center items-center h-full">
        <p>No dictionary selected</p>
      </div>
    )
  }

  const { data: dictionaries = [], isLoading: isDictionaryLoading } = useDictionaries()
  const { data: entriesData, isLoading: isEntriesLoading } = useDictionaryEntries({
    dictionaryId,
    page: 0,
    pageSize: 50,
    sortField: 'created_at',
    sortDirection: 'desc'
  })
  const [selectedEntry, setSelectedEntry] = useState<string | null>(null)

  const dictionary = dictionaries?.find((d) => d.id === dictionaryId)
  const entries: DictionaryEntry[] = entriesData?.entries ?? []

  useEffect(() => {
    // Reset selected entry when dictionary changes
    setSelectedEntry(null)
  }, [dictionaryId])

  if (isDictionaryLoading || isEntriesLoading) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    )
  }

  if (!dictionary) {
    return (
      <div className="flex justify-center items-center h-full">
        <p>Dictionary not found</p>
      </div>
    )
  }

  const selectedEntryData: DictionaryEntry | undefined = entries.find((entry) => entry.id === selectedEntry)

  return (
    <div className="container mx-auto p-4 space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">{dictionary.name}</h1>
        <CreateEntryDialog dictionaryId={dictionaryId} />
      </div>

      <div className="grid grid-cols-12 gap-4">
        {/* Entries List */}
        <div className="col-span-4 space-y-2">
          {entries.map((entry) => (
            <Card
              key={entry.id}
              className={`p-4 cursor-pointer hover:bg-accent ${
                selectedEntry === entry.id ? 'border-primary' : ''
              }`}
              onClick={() => setSelectedEntry(entry.id)}
            >
              <h3 className="font-semibold">{entry.field_name}</h3>
              <p className="text-sm text-muted-foreground truncate">
                {entry.description}
              </p>
            </Card>
          ))}
        </div>

        {/* Entry Details */}
        <div className="col-span-8">
          {selectedEntryData ? (
            <Card className="p-6">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-2xl font-bold mb-2">{selectedEntryData.field_name}</h2>
                  <p className="text-muted-foreground">{selectedEntryData.description}</p>
                </div>
                <EditEntryDialog
                  entry={selectedEntryData}
                  onClose={() => {}}
                  onSuccess={() => setSelectedEntry(null)}
                />
              </div>

              <Tabs defaultValue="comments">
                <TabsList>
                  <TabsTrigger value="comments">Comments</TabsTrigger>
                  <TabsTrigger value="history">History</TabsTrigger>
                </TabsList>
                <TabsContent value="comments" className="mt-4">
                  <CommentsSection
                    entryId={selectedEntryData.id}
                    fieldName={selectedEntryData.field_name}
                  />
                </TabsContent>
                <TabsContent value="history">
                  <div className="text-muted-foreground text-center p-4">
                    Entry history will be available soon
                  </div>
                </TabsContent>
              </Tabs>
            </Card>
          ) : (
            <Card className="p-6 flex justify-center items-center h-full text-muted-foreground">
              Select an entry to view details
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}