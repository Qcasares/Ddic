import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useComments } from '@/hooks/use-comments';
import { formatDistanceToNow } from 'date-fns';
import { Loader2, Send, Edit2, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface CommentsProps {
  entryId: string;
}

export default function CommentsSection({ entryId }: CommentsProps) {
  const [newComment, setNewComment] = useState('');
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const {
    comments,
    isLoading,
    fetchComments,
    addComment,
    deleteComment,
    updateComment,
  } = useComments({ entryId });

  useEffect(() => {
    fetchComments();
    // Get current user
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setCurrentUser(user.id);
    });
  }, [fetchComments]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    await addComment(newComment);
    setNewComment('');
  };

  const handleEdit = async (commentId: string) => {
    const comment = comments.find(c => c.id === commentId);
    if (comment) {
      setEditingCommentId(commentId);
      setEditText(comment.text);
    }
  };

  const handleSaveEdit = async (commentId: string) => {
    if (!editText.trim()) return;

    await updateComment(commentId, editText);
    setEditingCommentId(null);
    setEditText('');
  };

  const handleCancelEdit = () => {
    setEditingCommentId(null);
    setEditText('');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <ScrollArea className="h-[400px] pr-4">
        <div className="space-y-4">
          {comments.map((comment) => (
            <div
              key={comment.id}
              className="border rounded-lg p-4 space-y-2"
            >
              {editingCommentId === comment.id ? (
                <div className="space-y-2">
                  <Textarea
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    className="min-h-[100px]"
                  />
                  <div className="flex gap-2 justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCancelEdit}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => handleSaveEdit(comment.id)}
                    >
                      Save
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-medium text-sm">{comment.author.email}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                        {comment.updated_at !== comment.created_at && ' (edited)'}
                      </p>
                    </div>
                    {currentUser === comment.author_id && (
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(comment.id)}
                        >
                          <Edit2 className="h-4 w-4" />
                          <span className="sr-only">Edit comment</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteComment(comment.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                          <span className="sr-only">Delete comment</span>
                        </Button>
                      </div>
                    )}
                  </div>
                  <p className="text-sm">{comment.text}</p>
                </>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>

      <form onSubmit={handleSubmit} className="space-y-2">
        <Textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Write a comment..."
          className="min-h-[100px]"
        />
        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={!newComment.trim()}
          >
            <Send className="h-4 w-4 mr-2" />
            Send
          </Button>
        </div>
      </form>
    </div>
  );
}