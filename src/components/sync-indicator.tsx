import { Loader2, Wifi, WifiOff } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { 
  Tooltip,
  TooltipContent,
  TooltipTrigger 
} from '@/components/ui/tooltip';
import { formatDistanceToNow } from 'date-fns';

interface SyncIndicatorProps {
  isSyncing: boolean;
  isOnline: boolean;
  lastSyncedAt: Date | null;
  error: Error | null;
}

export function SyncIndicator({ isSyncing, isOnline, lastSyncedAt, error }: SyncIndicatorProps) {
  if (error) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="destructive" className="gap-1 font-medium">
            <WifiOff className="h-4 w-4" />
            Error
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p className="font-medium">{error.message}</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  if (isSyncing) {
    return (
      <Badge variant="secondary" className="gap-1 font-medium bg-secondary/80">
        <Loader2 className="h-4 w-4 animate-spin" />
        Syncing...
      </Badge>
    );
  }

  if (!isOnline) {
    return (
      <Badge variant="outline" className="gap-1 font-medium border-warning/50 text-warning bg-warning/10">
        <WifiOff className="h-4 w-4" />
        Offline
      </Badge>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge variant="outline" className="gap-1 font-medium border-success/50 text-success bg-success/10">
          <Wifi className="h-4 w-4" />
          Synced
        </Badge>
      </TooltipTrigger>
      <TooltipContent>
        <p className="font-medium">
          {lastSyncedAt 
            ? `Last synced ${formatDistanceToNow(lastSyncedAt, { addSuffix: true })}` 
            : 'Synced'}
        </p>
      </TooltipContent>
    </Tooltip>
  );
}