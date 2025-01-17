import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Loader2, MessageSquare, Reply, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

interface CommentsProps {
  entryId: string;
}

interface Comment {
  id: string;
  content: string;
  created_at: string;
  created_by: string;
  parent_id: string | null;
  user: {
    email: string;
  };
  replies?: Comment[];
}

export function CommentsSection({ entryId }: CommentsProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!entryId) return;
    loadComments();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('comments')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'comments',
        filter: `entry_id=eq.${entryId}`,
      }, () => {
        loadComments();
      })
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [entryId]);

  const loadComments = async () => {
    if (!entryId) return;
    
    try {
      setIsLoading(true);
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const { data, error } = await supabase
        .from('comments')
        .select(`
          id,
          content,
          created_at,
          created_by,
          parent_id,
          user:users!comments_created_by_fkey (
            email
          )
        `)
        .eq('entry_id', entryId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Organize comments into threads
      const threads = data.reduce((acc: Comment[], comment) => {
        if (!comment.parent_id) {
          comment.replies = data.filter(c => c.parent_id === comment.id);
          acc.push(comment);
        }
        return acc;
      }, []);

      setComments(threads);
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to load comments',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (parentId: string | null = null) => {
    if (!entryId) return;
    
    try {
      setIsSubmitting(true);
      const content = parentId ? newComment : newComment.trim();
      
      if (!content) return;

      const { error } = await supabase
        .from('comments')
        .insert([{
          entry_id: entryId,
          content,
          parent_id: parentId
        }]);

      if (error) throw error;

      setNewComment('');
      setReplyTo(null);
      
      toast({
        title: 'Success',
        description: 'Comment added successfully',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to add comment',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    try {
      const { error } = await supabase
        .from('comments')
        .delete()
        .eq('id', commentId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Comment deleted successfully',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete comment',
        variant: 'destructive',
      });
    }
  };

  if (!entryId) {
    return (
      <div className="flex flex-col items-center justify-center h-[400px] text-center">
        <MessageSquare className="h-8 w-8 text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">
          Select an entry to view comments
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <MessageSquare className="h-5 w-5" />
        <h3 className="font-medium">Comments</h3>
      </div>

      <div className="space-y-4">
        <div className="flex gap-4">
          <Textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a comment..."
            className="flex-1"
          />
          <Button 
            onClick={() => handleSubmit(null)}
            disabled={isSubmitting || !newComment.trim()}
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              'Comment'
            )}
          </Button>
        </div>

        <ScrollArea className="h-[400px]">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : comments.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <MessageSquare className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                No comments yet. Start the discussion!
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {comments.map((comment) => (
                <div key={comment.id} className="space-y-4">
                  <div className="flex gap-4">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>
                        {comment.user?.email?.charAt(0).toUpperCase() || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{comment.user?.email}</span>
                          <span className="text-sm text-muted-foreground">
                            {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(comment.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <p className="text-sm">{comment.content}</p>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-muted-foreground"
                          onClick={() => setReplyTo(comment.id)}
                        >
                          <Reply className="h-4 w-4 mr-2" />
                          Reply
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Replies */}
                  {comment.replies && comment.replies.length > 0 && (
                    <div className="ml-12 space-y-4">
                      {comment.replies.map((reply) => (
                        <div key={reply.id} className="flex gap-4">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback>
                              {reply.user?.email?.charAt(0).toUpperCase() || '?'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{reply.user?.email}</span>
                                <span className="text-sm text-muted-foreground">
                                  {formatDistanceToNow(new Date(reply.created_at), { addSuffix: true })}
                                </span>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDelete(reply.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                            <p className="text-sm">{reply.content}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Reply input */}
                  {replyTo === comment.id && (
                    <div className="ml-12 flex gap-4">
                      <Textarea
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Write a reply..."
                        className="flex-1"
                      />
                      <div className="space-x-2">
                        <Button
                          onClick={() => handleSubmit(comment.id)}
                          disabled={isSubmitting || !newComment.trim()}
                        >
                          {isSubmitting ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            'Reply'
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={() => {
                            setReplyTo(null);
                            setNewComment('');
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  );
}