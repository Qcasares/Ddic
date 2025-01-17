import { useEffect, useState } from 'react';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  Book, 
  History, 
  Users2, 
  Settings,
  Database,
  FileText,
  Command
} from 'lucide-react';

interface CommandPaletteProps {
  dictionaries: any[];
  onNavigate: (path: string) => void;
  onSelectDictionary: (id: string) => void;
}

export function CommandPalette({ 
  dictionaries, 
  onNavigate, 
  onSelectDictionary 
}: CommandPaletteProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-transparent shadow-sm hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2"
      >
        <Command className="w-4 h-4 mr-2" />
        <span>Search...</span>
        <kbd className="ml-auto pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
          <span className="text-xs">⌘</span>K
        </kbd>
      </button>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Type a command or search..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Quick Actions">
            <CommandItem onSelect={() => onNavigate('/dictionaries')}>
              <Book className="mr-2 h-4 w-4" />
              <span>Go to Dictionaries</span>
            </CommandItem>
            <CommandItem onSelect={() => onNavigate('/history')}>
              <History className="mr-2 h-4 w-4" />
              <span>View History</span>
            </CommandItem>
            <CommandItem onSelect={() => onNavigate('/team')}>
              <Users2 className="mr-2 h-4 w-4" />
              <span>Team Management</span>
            </CommandItem>
            <CommandItem onSelect={() => onNavigate('/settings')}>
              <Settings className="mr-2 h-4 w-4" />
              <span>Settings</span>
            </CommandItem>
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Dictionaries">
            {dictionaries.map((dict) => (
              <CommandItem
                key={dict.id}
                onSelect={() => {
                  onSelectDictionary(dict.id);
                  setOpen(false);
                }}
              >
                <Database className="mr-2 h-4 w-4" />
                <span>{dict.name}</span>
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Documentation">
            <CommandItem onSelect={() => window.open('/docs', '_blank')}>
              <FileText className="mr-2 h-4 w-4" />
              <span>Documentation</span>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}