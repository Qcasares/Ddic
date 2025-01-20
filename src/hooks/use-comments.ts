import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from './use-toast';

interface Comment {
  id: string;
  entry_id: string;
  author_id: string;
  text: string;
  created_at: string;
  updated_at: string;
  author: {
    email: string;
  };
}

interface UseCommentsProps {
  entryId: string;
}

export function useComments({ entryId }: UseCommentsProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchComments = useCallback(async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('comments')
        .select(`
          *,
          author:author_id(
            email
          )
        `)
        .eq('entry_id', entryId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setComments(data || []);
    } catch (error) {
      console.error('Error fetching comments:', error);
      toast({
        title: 'Error',
        description: 'Failed to load comments',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [entryId, toast]);

  const addComment = useCallback(async (text: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('comments')
        .insert([
          {
            entry_id: entryId,
            author_id: user.id,
            text,
          },
        ]);

      if (error) throw error;

      // Refresh comments
      fetchComments();

      toast({
        title: 'Success',
        description: 'Comment added successfully',
      });
    } catch (error) {
      console.error('Error adding comment:', error);
      toast({
        title: 'Error',
        description: 'Failed to add comment',
        variant: 'destructive',
      });
    }
  }, [entryId, fetchComments, toast]);

  const deleteComment = useCallback(async (commentId: string) => {
    try {
      const { error } = await supabase
        .from('comments')
        .delete()
        .eq('id', commentId);

      if (error) throw error;

      // Update local state
      setComments(comments => comments.filter(comment => comment.id !== commentId));

      toast({
        title: 'Success',
        description: 'Comment deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting comment:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete comment',
        variant: 'destructive',
      });
    }
  }, [toast]);

  const updateComment = useCallback(async (commentId: string, text: string) => {
    try {
      const { error } = await supabase
        .from('comments')
        .update({ text })
        .eq('id', commentId);

      if (error) throw error;

      // Update local state
      setComments(comments =>
        comments.map(comment =>
          comment.id === commentId
            ? { ...comment, text, updated_at: new Date().toISOString() }
            : comment
        )
      );

      toast({
        title: 'Success',
        description: 'Comment updated successfully',
      });
    } catch (error) {
      console.error('Error updating comment:', error);
      toast({
        title: 'Error',
        description: 'Failed to update comment',
        variant: 'destructive',
      });
    }
  }, [toast]);

  return {
    comments,
    isLoading,
    fetchComments,
    addComment,
    deleteComment,
    updateComment,
  };
}