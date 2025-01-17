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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useTeam } from '@/hooks/use-team';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { Users, UserPlus, Loader2, Trash2, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { withErrorHandling, AppError, ErrorType } from '@/lib/error-handler';
import { z } from 'zod';

interface TeamManagementProps {
  dictionaryId: string;
}

const teamMemberSchema = z.object({
  email: z.string().email('Invalid email address'),
  role: z.enum(['editor', 'viewer'], {
    errorMap: () => ({ message: 'Invalid role' })
  })
});

export function TeamManagement({ dictionaryId }: TeamManagementProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'editor' | 'viewer'>('viewer');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [processingMembers, setProcessingMembers] = useState<Set<string>>(new Set());
  const { data: team, isLoading: isLoadingTeam, refetch } = useTeam({ dictionaryId });
  const { toast } = useToast();

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // Validate input
      const validatedData = teamMemberSchema.parse({ email, role });
      setErrors({});
      setIsLoading(true);

      await withErrorHandling(async () => {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          throw new AppError('Not authenticated', ErrorType.AUTH);
        }

        // Check if user exists
        const { data: users, error: userError } = await supabase
          .from('users')
          .select('id')
          .eq('email', validatedData.email)
          .single();

        if (userError || !users) {
          throw new AppError('User not found', ErrorType.NOT_FOUND);
        }

        // Check if user is already a team member
        const { data: existingMember } = await supabase
          .from('team_members')
          .select('id')
          .eq('dictionary_id', dictionaryId)
          .eq('user_id', users.id)
          .single();

        if (existingMember) {
          throw new AppError('User is already a team member', ErrorType.TEAM);
        }

        // Add team member
        const { error } = await supabase
          .from('team_members')
          .insert([
            {
              dictionary_id: dictionaryId,
              user_id: users.id,
              role: validatedData.role,
              invited_by: user.id,
            },
          ]);

        if (error) throw error;

        toast({
          title: 'Success',
          description: 'Team member added successfully!',
        });

        setEmail('');
        setRole('viewer');
        refetch();
      }, {
        maxRetries: 2,
        retryDelay: 500
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          const field = err.path[0]?.toString();
          if (field) {
            newErrors[field] = err.message;
          }
        });
        setErrors(newErrors);
      } else {
        throw error;
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    try {
      setProcessingMembers(prev => new Set(prev).add(userId));

      await withErrorHandling(async () => {
        const { error } = await supabase
          .from('team_members')
          .delete()
          .eq('dictionary_id', dictionaryId)
          .eq('user_id', userId);

        if (error) throw error;

        toast({
          title: 'Success',
          description: 'Team member removed successfully!',
        });

        refetch();
      }, {
        maxRetries: 2,
        retryDelay: 500
      });
    } finally {
      setProcessingMembers(prev => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Users className="h-4 w-4 mr-2" />
          Manage Team
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Team Management</DialogTitle>
          <DialogDescription>
            Invite team members and manage their access to this dictionary.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Invite Form */}
          <form onSubmit={handleInvite} className="space-y-4">
            <div className="grid grid-cols-[1fr,auto] gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (errors.email) {
                      const newErrors = { ...errors };
                      delete newErrors.email;
                      setErrors(newErrors);
                    }
                  }}
                  placeholder="Enter email address"
                  className={errors.email ? 'border-destructive' : ''}
                  disabled={isLoading}
                />
                {errors.email && (
                  <p className="text-sm text-destructive">{errors.email}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select 
                  value={role} 
                  onValueChange={(value: 'editor' | 'viewer') => {
                    setRole(value);
                    if (errors.role) {
                      const newErrors = { ...errors };
                      delete newErrors.role;
                      setErrors(newErrors);
                    }
                  }}
                  disabled={isLoading}
                >
                  <SelectTrigger id="role" className="w-[120px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="editor">Editor</SelectItem>
                    <SelectItem value="viewer">Viewer</SelectItem>
                  </SelectContent>
                </Select>
                {errors.role && (
                  <p className="text-sm text-destructive">{errors.role}</p>
                )}
              </div>
            </div>
            <Button type="submit" disabled={isLoading || !email}>
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Inviting...
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Invite Member
                </>
              )}
            </Button>
          </form>

          {/* Team List */}
          <div className="space-y-2">
            <h4 className="font-medium">Team Members</h4>
            <ScrollArea className="h-[300px]">
              {isLoadingTeam ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
                    <p className="text-sm text-muted-foreground">Loading team members...</p>
                  </div>
                </div>
              ) : team?.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center h-[300px]">
                  <Users className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium">No Team Members</h3>
                  <p className="text-sm text-muted-foreground">
                    Start by inviting team members
                  </p>
                </div>
              ) : (
                <div className="p-4 space-y-4">
                  {team?.map((member) => (
                    <div
                      key={member.id}
                      className="border rounded-lg p-4 space-y-2"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium">{member.user.email}</p>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span className="capitalize bg-secondary px-2 py-0.5 rounded-full">
                              {member.role}
                            </span>
                            <span className="flex items-center">
                              <Clock className="h-3 w-3 mr-1" />
                              {formatDistanceToNow(new Date(member.invited_at), { addSuffix: true })}
                            </span>
                          </div>
                        </div>
                        {member.role !== 'owner' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveMember(member.user_id)}
                            disabled={processingMembers.has(member.user_id)}
                          >
                            {processingMembers.has(member.user_id) ? (
                              <Loader2 className="h-4 w-4 animate-spin text-destructive" />
                            ) : (
                              <Trash2 className="h-4 w-4 text-destructive" />
                            )}
                          </Button>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Invited by {member.inviter.email}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}