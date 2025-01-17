import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import {
  Pencil,
  Trash2,
  History,
  Link2,
  Copy,
  Share2,
  Eye,
  MessageSquare,
} from 'lucide-react';

interface EntryContextMenuProps {
  children: React.ReactNode;
  onEdit: () => void;
  onDelete: () => void;
  onViewHistory: () => void;
  onManageRelations: () => void;
  onCopy: () => void;
  onShare: () => void;
  onView: () => void;
  onComment: () => void;
}

export function EntryContextMenu({
  children,
  onEdit,
  onDelete,
  onViewHistory,
  onManageRelations,
  onCopy,
  onShare,
  onView,
  onComment,
}: EntryContextMenuProps) {
  return (
    <ContextMenu>
      <ContextMenuTrigger>{children}</ContextMenuTrigger>
      <ContextMenuContent className="w-64">
        <ContextMenuItem onSelect={onView}>
          <Eye className="mr-2 h-4 w-4" />
          View Details
        </ContextMenuItem>
        <ContextMenuItem onSelect={onEdit}>
          <Pencil className="mr-2 h-4 w-4" />
          Edit Entry
        </ContextMenuItem>
        <ContextMenuItem onSelect={onComment}>
          <MessageSquare className="mr-2 h-4 w-4" />
          Add Comment
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onSelect={onViewHistory}>
          <History className="mr-2 h-4 w-4" />
          View History
        </ContextMenuItem>
        <ContextMenuItem onSelect={onManageRelations}>
          <Link2 className="mr-2 h-4 w-4" />
          Manage Relations
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onSelect={onCopy}>
          <Copy className="mr-2 h-4 w-4" />
          Copy to Clipboard
        </ContextMenuItem>
        <ContextMenuItem onSelect={onShare}>
          <Share2 className="mr-2 h-4 w-4" />
          Share Entry
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem 
          onSelect={onDelete}
          className="text-destructive focus:text-destructive"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Delete Entry
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}