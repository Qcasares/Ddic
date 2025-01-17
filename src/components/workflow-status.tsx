import { useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Clock, CheckCircle2, XCircle, AlertCircle, Archive, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { withErrorHandling, validateWorkflowTransition, AppError, ErrorType } from '@/lib/error-handler';

interface WorkflowStatusProps {
  entryId: string;
  currentStatus: string;
  onStatusChange?: () => void;
}

const WORKFLOW_STATUSES = [
  { value: 'draft', label: 'Draft', icon: Clock, color: 'bg-yellow-100 text-yellow-800' },
  { value: 'review', label: 'In Review', icon: AlertCircle, color: 'bg-blue-100 text-blue-800' },
  { value: 'approved', label: 'Approved', icon: CheckCircle2, color: 'bg-green-100 text-green-800' },
  { value: 'rejected', label: 'Rejected', icon: XCircle, color: 'bg-red-100 text-red-800' },
  { value: 'archived', label: 'Archived', icon: Archive, color: 'bg-gray-100 text-gray-800' }
];

export function WorkflowStatus({ entryId, currentStatus, onStatusChange }: WorkflowStatusProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();

  const handleStatusChange = async (newStatus: string) => {
    if (!validateWorkflowTransition(currentStatus, newStatus)) {
      toast({
        title: 'Invalid Transition',
        description: `Cannot change status from ${currentStatus} to ${newStatus}`,
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsUpdating(true);

      await withErrorHandling(async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          throw new AppError('Not authenticated', ErrorType.AUTH);
        }

        const { error } = await supabase
          .from('dictionary_entries')
          .update({ 
            workflow_status: newStatus,
            last_reviewed_at: new Date().toISOString(),
            last_reviewed_by: user.id
          })
          .eq('id', entryId);

        if (error) throw error;

        toast({
          title: 'Status Updated',
          description: `Entry status changed to ${newStatus}`,
        });

        onStatusChange?.();
      }, {
        maxRetries: 2,
        retryDelay: 500,
        showToast: true
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const status = WORKFLOW_STATUSES.find(s => s.value === currentStatus) || WORKFLOW_STATUSES[0];
  const StatusIcon = status.icon;

  return (
    <div className="flex items-center gap-2">
      <Badge variant="secondary" className={status.color}>
        {isUpdating ? (
          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
        ) : (
          <StatusIcon className="h-4 w-4 mr-1" />
        )}
        {status.label}
      </Badge>
      
      <Select
        value={currentStatus}
        onValueChange={handleStatusChange}
        disabled={isUpdating}
      >
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="Change status" />
        </SelectTrigger>
        <SelectContent>
          {WORKFLOW_STATUSES.map((status) => {
            const isValidTransition = validateWorkflowTransition(currentStatus, status.value);
            return (
              <SelectItem 
                key={status.value} 
                value={status.value}
                disabled={!isValidTransition}
                className={!isValidTransition ? 'opacity-50' : ''}
              >
                <div className="flex items-center">
                  <status.icon className="h-4 w-4 mr-2" />
                  {status.label}
                </div>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
    </div>
  );
}