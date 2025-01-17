import { useState, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Plus, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CreateDictionaryDialog } from './create-dictionary-dialog';
import { EditDictionaryDialog } from './edit-dictionary-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useDictionaries } from '@/hooks/use-dictionaries';
import { SyncIndicator } from './sync-indicator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

interface DictionaryListProps {
  selectedDictionary: string | null;
  onSelect: (id: string) => void;
}

function DictionaryCardSkeleton() {
  return (
    <Card className="p-4">
      <Skeleton className="h-5 w-2/3 mb-2" />
      <Skeleton className="h-4 w-full" />
    </Card>
  );
}

export function DictionaryList({ selectedDictionary, onSelect }: DictionaryListProps) {
  const [editingDictionary, setEditingDictionary] = useState<any>(null);
  const [deletingDictionary, setDeletingDictionary] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { data: dictionaries, isLoading, error, refetch } = useDictionaries();
  const { toast } = useToast();

  const handleDelete = useCallback(async () => {
    if (!deletingDictionary) return;

    try {
      setIsDeleting(true);
      const { error } = await supabase
        .from('dictionaries')
        .delete()
        .eq('id', deletingDictionary.id);

      if (error) throw error;

      toast({
        title: 'Dictionary Deleted',
        description: 'The dictionary has been deleted successfully.',
      });

      if (selectedDictionary === deletingDictionary.id) {
        onSelect('');
      }

      refetch();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete dictionary',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
      setDeletingDictionary(null);
    }
  }, [deletingDictionary, selectedDictionary, onSelect, refetch, toast]);

  if (error) {
    return (
      <div className="space-y-4">
        <CreateDictionaryDialog onSuccess={refetch} />
        <div className="p-4 border rounded-lg bg-destructive/10 text-destructive">
          <p>{error.message}</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full rounded-md" />
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <DictionaryCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (!dictionaries || dictionaries.length === 0) {
    return (
      <div className="space-y-4">
        <CreateDictionaryDialog onSuccess={refetch} />
        <div className="flex h-[600px] items-center justify-center border rounded-lg bg-muted/50">
          <div className="text-center">
            <Plus className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium">No dictionaries</h3>
            <p className="text-sm text-muted-foreground">
              Create your first dictionary to get started
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <CreateDictionaryDialog onSuccess={refetch} />
        <SyncIndicator
          isSyncing={false}
          isOnline={true}
          lastSyncedAt={null}
          error={null}
        />
      </div>

      <ScrollArea className="h-[600px]">
        <div className="space-y-2 pr-4">
          {dictionaries.map((dictionary) => (
            <Card
              key={dictionary.id}
              className={cn(
                'p-4 cursor-pointer transition-colors hover:bg-accent',
                selectedDictionary === dictionary.id && 'bg-accent'
              )}
              onClick={() => onSelect(dictionary.id)}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-medium leading-none mb-2">{dictionary.name}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {dictionary.description}
                  </p>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={(e) => e.stopPropagation()}
                      className="h-8 w-8"
                    >
                      <MoreVertical className="h-4 w-4" />
                      <span className="sr-only">Open menu</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem 
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingDictionary(dictionary);
                      }}
                    >
                      <Pencil className="h-4 w-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeletingDictionary(dictionary);
                      }}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </Card>
          ))}
        </div>
      </ScrollArea>

      {editingDictionary && (
        <EditDictionaryDialog
          dictionary={editingDictionary}
          onClose={() => setEditingDictionary(null)}
          onSuccess={() => {
            setEditingDictionary(null);
            refetch();
          }}
        />
      )}

      <AlertDialog open={!!deletingDictionary} onOpenChange={() => setDeletingDictionary(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Dictionary</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this dictionary? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}