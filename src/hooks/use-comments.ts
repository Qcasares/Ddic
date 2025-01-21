import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/features/auth/auth-context'
import { User } from '@supabase/supabase-js'
import { Tables } from '@/types/supabase'
import { PostgrestError } from '@supabase/supabase-js'
import { useRealtimeSync } from '@/hooks/use-realtime-sync'

export type Comment = Tables<'comments'> & {
  author?: {
    id: string
    email: string
    full_name?: string
  }
}

type UseCommentsProps = {
  entryId: string
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

export function useComments({ entryId, fieldName }: UseCommentsProps) {
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
        .eq('entry_id', entryId)
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
  }, [entryId, fieldName, toast])

  // Use realtime sync hook
  const { syncStatus } = useRealtimeSync(`comments-${entryId}`, 'comments', comments, {
    onDataUpdate: fetchComments,
    priority: 'high'
  })

  const addComment = useCallback(async (text: string) => {
    if (!user) {
      toast({
        title: 'Error',
        description: 'You must be logged in to add comments.',
        variant: 'destructive'
      })
      return
    }

    // Optimistic update
    const tempId = `temp-${Date.now()}`
    const newComment: Comment = {
      id: tempId,
      entry_id: entryId,
      author_id: user.id,
      text,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      field_name: fieldName || null,
      author: {
        id: user.id,
        email: user.email || '',
        full_name: user.user_metadata?.full_name
      }
    }

    setComments(prev => [...prev, newComment])

    try {
      const { data, error } = await supabase
        .from('comments')
        .insert({
          entry_id: entryId,
          author_id: user.id,
          text,
          field_name: fieldName || null
        })
        .select('*, users:author_id(*)')
        .single()

      if (error) throw error

      if (!isValidCommentWithAuthor(data)) {
        throw new Error('Invalid comment data')
      }

      // Replace optimistic update with real data
      setComments(prev => [
        ...prev.filter(c => c.id !== tempId),
        processComment(data)
      ])
      
      toast({
        title: 'Success',
        description: 'Comment added successfully.'
      })
    } catch (err) {
      // Rollback optimistic update
      setComments(prev => prev.filter(c => c.id !== tempId))
      
      console.error('Error adding comment:', err)
      const errorObj = err as PostgrestError
      toast({
        title: 'Error',
        description: errorObj.message || 'Failed to add comment. Please try again.',
        variant: 'destructive'
      })
    }
  }, [entryId, fieldName, user, toast])

  const updateComment = useCallback(async (commentId: string, text: string) => {
    if (!user) {
      toast({
        title: 'Error',
        description: 'You must be logged in to update comments.',
        variant: 'destructive'
      })
      return
    }

    // Optimistic update
    setComments(prev =>
      prev.map(comment =>
        comment.id === commentId ? { 
          ...comment, 
          text,
          updated_at: new Date().toISOString()
        } : comment
      )
    )

    try {
      const { data, error } = await supabase
        .from('comments')
        .update({ text })
        .eq('id', commentId)
        .eq('author_id', user.id)
        .select()
        .single()

      if (error) throw error

      toast({
        title: 'Success',
        description: 'Comment updated successfully.'
      })
    } catch (err) {
      // Rollback optimistic update
      fetchComments()
      
      console.error('Error updating comment:', err)
      const errorObj = err as PostgrestError
      toast({
        title: 'Error',
        description: errorObj.message || 'Failed to update comment. Please try again.',
        variant: 'destructive'
      })
    }
  }, [user, toast, fetchComments])

  const deleteComment = useCallback(async (commentId: string) => {
    if (!user) {
      toast({
        title: 'Error',
        description: 'You must be logged in to delete comments.',
        variant: 'destructive'
      })
      return
    }

    // Optimistic update
    const deletedComment = comments.find(c => c.id === commentId)
    setComments(prev => prev.filter(c => c.id !== commentId))

    try {
      const { error } = await supabase
        .from('comments')
        .delete()
        .eq('id', commentId)
        .eq('author_id', user.id)

      if (error) throw error

      toast({
        title: 'Success',
        description: 'Comment deleted successfully.'
      })
    } catch (err) {
      // Rollback optimistic update
      if (deletedComment) {
        setComments(prev => [...prev, deletedComment])
      }
      
      console.error('Error deleting comment:', err)
      const errorObj = err as PostgrestError
      toast({
        title: 'Error',
        description: errorObj.message || 'Failed to delete comment. Please try again.',
        variant: 'destructive'
      })
    }
  }, [user, toast, comments])

  useEffect(() => {
    fetchComments()
  }, [fetchComments])

  return {
    comments,
    isLoading,
    error,
    syncStatus,
    addComment,
    updateComment,
    deleteComment,
    refresh: fetchComments
  }
}