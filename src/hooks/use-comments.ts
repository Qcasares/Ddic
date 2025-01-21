import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/features/auth/auth-context'
import { User } from '@supabase/supabase-js'
import { Tables } from '@/types/supabase'
import { PostgrestError } from '@supabase/supabase-js'

export type Comment = Tables<'comments'> & {
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

type CommentWithAuthor = Tables<'comments'> & {
  users?: {
    id: string
    email: string
    raw_user_meta_data?: { full_name?: string }
  } | null
}

const isValidCommentWithAuthor = (comment: any): comment is CommentWithAuthor => {
  return comment && typeof comment === 'object' && 
         (!comment.users || (
           typeof comment.users === 'object' && 
           typeof comment.users.id === 'string' && 
           typeof comment.users.email === 'string'
         ))
}

export function useComments({ commentableId, fieldName }: UseCommentsProps) {
  const [comments, setComments] = useState<Comment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const { toast } = useToast()
  const { session } = useAuth()
  const user = session?.user as User | null

  const processComment = (comment: CommentWithAuthor): Comment => ({
    ...comment,
    author: comment.users ? {
      id: comment.users.id,
      email: comment.users.email,
      full_name: comment.users.raw_user_meta_data?.full_name
    } : undefined
  })

  const fetchComments = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const query = supabase
        .from('comments')
        .select('*, users:author_id(*)')
        .eq('entry_id', commentableId)
        .order('created_at', { ascending: true })

      const { data, error } = await (fieldName 
        ? query.eq('field_name', fieldName) 
        : query)

      if (error) throw error

      const processedComments = (data as any[])
        .filter(isValidCommentWithAuthor)
        .map(processComment)

      setComments(processedComments)
    } catch (err) {
      console.error('Error fetching comments:', err)
      const errorObj = err as PostgrestError
      setError(errorObj instanceof Error ? errorObj : new Error('Failed to fetch comments'))
      toast({
        title: 'Error',
        description: errorObj.message || 'Failed to load comments. Please try again.',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }, [commentableId, fieldName, toast])

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
          entry_id: commentableId,
          author_id: user.id,
          text
        })
        .select('*, users:author_id(*)')
        .single()

      if (error) throw error

      if (!isValidCommentWithAuthor(data)) {
        throw new Error('Invalid comment data')
      }

      const newComment = processComment(data)
      setComments(prev => [...prev, newComment])
      toast({
        title: 'Success',
        description: 'Comment added successfully.'
      })
    } catch (err) {
      console.error('Error adding comment:', err)
      const errorObj = err as PostgrestError
      toast({
        title: 'Error',
        description: errorObj.message || 'Failed to add comment. Please try again.',
        variant: 'destructive'
      })
    }
  }, [commentableId, user, toast])

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
        .eq('author_id', user.id)
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
      const errorObj = err as PostgrestError
      toast({
        title: 'Error',
        description: errorObj.message || 'Failed to update comment. Please try again.',
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
        .eq('author_id', user.id)

      if (error) throw error

      setComments(prev => prev.filter(comment => comment.id !== commentId))
      toast({
        title: 'Success',
        description: 'Comment deleted successfully.'
      })
    } catch (err) {
      console.error('Error deleting comment:', err)
      const errorObj = err as PostgrestError
      toast({
        title: 'Error',
        description: errorObj.message || 'Failed to delete comment. Please try again.',
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
          filter: `entry_id=eq.${commentableId}`
        },
        () => {
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