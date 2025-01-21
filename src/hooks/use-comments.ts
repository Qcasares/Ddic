import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/features/auth/auth-context'
import { User } from '@supabase/supabase-js'

export type Comment = {
  id: string
  commentable_id: string
  commentable_type: string
  field_name?: string
  author_id: string
  text: string
  created_at: string
  updated_at: string
  author?: {
    id: string
    email: string
    full_name?: string
  }
}

type UseCommentsProps = {
  commentableId: string
  commentableType: 'dictionary_entries' | 'quality_rules'
  fieldName?: string
}

export function useComments({ commentableId, commentableType, fieldName }: UseCommentsProps) {
  const [comments, setComments] = useState<Comment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const { toast } = useToast()
  const { session } = useAuth()
  const user = session?.user as User | null

  const fetchComments = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      let query = supabase
        .from('comments')
        .select(`
          *,
          author:author_id (
            id,
            email,
            raw_user_meta_data->full_name
          )
        `)
        .eq('commentable_id', commentableId)
        .eq('commentable_type', commentableType)
        .order('created_at', { ascending: true })

      if (fieldName) {
        query = query.eq('field_name', fieldName)
      }

      const { data, error } = await query

      if (error) throw error

      setComments(data.map(comment => ({
        ...comment,
        author: comment.author ? {
          id: comment.author.id,
          email: comment.author.email,
          full_name: comment.author.raw_user_meta_data?.full_name
        } : undefined
      })))
    } catch (err) {
      console.error('Error fetching comments:', err)
      setError(err instanceof Error ? err : new Error('Failed to fetch comments'))
      toast({
        title: 'Error',
        description: 'Failed to load comments. Please try again.',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }, [commentableId, commentableType, fieldName, toast])

  const addComment = useCallback(async (text: string) => {
    if (!user) {
      toast({
        title: 'Error',
        description: 'You must be logged in to add comments.',
        variant: 'destructive'
      })
      return
    }

    try {
      const { data, error } = await supabase
        .from('comments')
        .insert({
          commentable_id: commentableId,
          commentable_type: commentableType,
          field_name: fieldName,
          author_id: user.id,
          text
        })
        .select(`
          *,
          author:author_id (
            id,
            email,
            raw_user_meta_data->full_name
          )
        `)
        .single()

      if (error) throw error

      const newComment: Comment = {
        ...data,
        author: data.author ? {
          id: data.author.id,
          email: data.author.email,
          full_name: data.author.raw_user_meta_data?.full_name
        } : undefined
      }

      setComments(prev => [...prev, newComment])
      toast({
        title: 'Success',
        description: 'Comment added successfully.'
      })
    } catch (err) {
      console.error('Error adding comment:', err)
      toast({
        title: 'Error',
        description: 'Failed to add comment. Please try again.',
        variant: 'destructive'
      })
    }
  }, [commentableId, commentableType, fieldName, user, toast])

  const updateComment = useCallback(async (commentId: string, text: string) => {
    if (!user) {
      toast({
        title: 'Error',
        description: 'You must be logged in to update comments.',
        variant: 'destructive'
      })
      return
    }

    try {
      const { data, error } = await supabase
        .from('comments')
        .update({ text })
        .eq('id', commentId)
        .eq('author_id', user.id) // Ensure user can only update their own comments
        .select()
        .single()

      if (error) throw error

      setComments(prev =>
        prev.map(comment =>
          comment.id === commentId ? { ...comment, text, updated_at: data.updated_at } : comment
        )
      )
      toast({
        title: 'Success',
        description: 'Comment updated successfully.'
      })
    } catch (err) {
      console.error('Error updating comment:', err)
      toast({
        title: 'Error',
        description: 'Failed to update comment. Please try again.',
        variant: 'destructive'
      })
    }
  }, [user, toast])

  const deleteComment = useCallback(async (commentId: string) => {
    if (!user) {
      toast({
        title: 'Error',
        description: 'You must be logged in to delete comments.',
        variant: 'destructive'
      })
      return
    }

    try {
      const { error } = await supabase
        .from('comments')
        .delete()
        .eq('id', commentId)
        .eq('author_id', user.id) // Ensure user can only delete their own comments

      if (error) throw error

      setComments(prev => prev.filter(comment => comment.id !== commentId))
      toast({
        title: 'Success',
        description: 'Comment deleted successfully.'
      })
    } catch (err) {
      console.error('Error deleting comment:', err)
      toast({
        title: 'Error',
        description: 'Failed to delete comment. Please try again.',
        variant: 'destructive'
      })
    }
  }, [user, toast])

  useEffect(() => {
    fetchComments()
  }, [fetchComments])

  // Set up real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel(`comments-${commentableId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'comments',
          filter: `commentable_id=eq.${commentableId}`
        },
        (payload) => {
          // Refresh comments when changes occur
          fetchComments()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [commentableId, fetchComments])

  return {
    comments,
    isLoading,
    error,
    addComment,
    updateComment,
    deleteComment,
    refresh: fetchComments
  }
}