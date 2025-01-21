import { useState } from 'react'
import { useComments, type Comment } from '@/hooks/use-comments'
import { useAuth } from '@/features/auth/auth-context'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import { Avatar } from '@/components/ui/avatar'
import { formatDistanceToNow } from 'date-fns'
import { Loader2, Send, Pencil, Trash2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface CommentsSectionProps {
  entryId: string
  fieldName?: string
}

export function CommentsSection({ entryId, fieldName }: CommentsSectionProps) {
  const [newComment, setNewComment] = useState('')
  const [editingComment, setEditingComment] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const { session } = useAuth()
  const user = session?.user

  const {
    comments,
    isLoading,
    error,
    addComment,
    updateComment,
    deleteComment
  } = useComments({ entryId, fieldName })

  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!newComment.trim()) {
      toast({
        title: 'Error',
        description: 'Comment cannot be empty',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsSubmitting(true);
      await addComment(newComment.trim());
      setNewComment('');
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
  }, [addComment, newComment, toast]);
    e.preventDefault()
    if (!newComment.trim()) return

    await addComment(newComment.trim())
    setNewComment('')
  }

  const handleEdit = async (commentId: string) => {
    if (!editText.trim()) return

    await updateComment(commentId, editText.trim())
    setEditingComment(null)
    setEditText('')
  }

  const startEditing = (comment: Comment) => {
    setEditingComment(comment.id)
    setEditText(comment.text)
  }

  if (error) {
    return (
      <Card className="p-4 text-red-500">
        Failed to load comments. Please try refreshing the page.
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="space-y-4">
        {isLoading ? (
          <div className="flex justify-center p-4">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : comments.length === 0 ? (
          <p className="text-center text-muted-foreground">No comments yet</p>
        ) : (
          comments.map((comment) => (
            <Card key={comment.id} className="p-4">
              <div className="flex items-start gap-4">
                <Avatar className="h-8 w-8">
                  <div className="bg-primary text-primary-foreground rounded-full h-full w-full flex items-center justify-center text-sm font-semibold">
                    {comment.author?.email?.[0].toUpperCase() || '?'}
                  </div>
                </Avatar>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-semibold">
                        {comment.author?.full_name || comment.author?.email || 'Unknown User'}
                      </span>
                      <span className="text-sm text-muted-foreground ml-2">
                        {comment.created_at ? formatDistanceToNow(new Date(comment.created_at), { addSuffix: true }) : 'Unknown time'}
                      </span>
                      {comment.updated_at !== comment.created_at && (
                        <span className="text-sm text-muted-foreground ml-2">(edited)</span>
                      )}
                    </div>
                    {user?.id === comment.author_id && (
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => startEditing(comment)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteComment(comment.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                  {editingComment === comment.id ? (
                    <form onSubmit={(e) => {
                      e.preventDefault()
                      handleEdit(comment.id)
                    }}>
                      <Textarea
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        className="min-h-[100px]"
                      />
                      <div className="flex justify-end gap-2 mt-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setEditingComment(null)
                            setEditText('')
                          }}
                        >
                          Cancel
                        </Button>
                        <Button type="submit">Save</Button>
                      </div>
                    </form>
                  ) : (
                    <p className="text-sm">{comment.text}</p>
                  )}
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {user && (
        <form onSubmit={handleSubmit} className="mt-4">
          <Textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a comment..."
            className="min-h-[100px]"
          />
          <div className="flex justify-end mt-2">
            <Button type="submit" disabled={!newComment.trim() || isSubmitting}>
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              {isSubmitting ? 'Sending...' : 'Send'}
            </Button>
          </div>
        </form>
      )}
    </div>
  )
}
