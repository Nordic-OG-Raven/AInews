import { createClient } from '../supabase/server';
import { createAdminClient } from '../supabase/admin';
import type { Comment } from '../types';
import { createHash } from 'crypto';

/**
 * Hash email for privacy
 */
function hashEmail(email: string): string {
  return createHash('sha256').update(email.toLowerCase()).digest('hex');
}

/**
 * Get all approved comments for a digest
 */
export async function getCommentsByDigestId(digestId: string): Promise<Comment[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('comments')
    .select('*')
    .eq('digest_id', digestId)
    .eq('approved', true)
    .is('parent_comment_id', null) // Only root comments
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching comments:', error);
    return [];
  }

  // Fetch replies for each comment
  const commentsWithReplies = await Promise.all(
    (data as Comment[]).map(async (comment) => {
      const { data: replies } = await supabase
        .from('comments')
        .select('*')
        .eq('parent_comment_id', comment.id)
        .eq('approved', true)
        .order('created_at', { ascending: true });

      return {
        ...comment,
        replies: replies as Comment[] || [],
      };
    })
  );

  return commentsWithReplies;
}

/**
 * Create a new comment (requires moderation)
 */
export async function createComment(data: {
  digestId: string;
  authorName: string;
  authorEmail: string;
  authorWebsite?: string;
  content: string;
  parentCommentId?: string;
}): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient();

  const { error } = await supabase.from('comments').insert({
    digest_id: data.digestId,
    parent_comment_id: data.parentCommentId || null,
    author_name: data.authorName,
    author_email_hash: hashEmail(data.authorEmail),
    author_website: data.authorWebsite || null,
    content: data.content,
    approved: false, // Requires admin approval
  });

  if (error) {
    console.error('Error creating comment:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Get comment count for a digest
 */
export async function getCommentCount(digestId: string): Promise<number> {
  const supabase = await createClient();

  const { count } = await supabase
    .from('comments')
    .select('*', { count: 'exact', head: true })
    .eq('digest_id', digestId)
    .eq('approved', true);

  return count || 0;
}

