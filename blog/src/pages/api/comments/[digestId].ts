import type { APIRoute } from 'astro';
import { createAdminClient } from '../../../lib/supabase';

/**
 * Hash email for privacy using Web Crypto API
 */
async function hashEmail(email: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(email.toLowerCase());
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export const GET: APIRoute = async ({ params }) => {
  const { digestId } = params;
  
  if (!digestId) {
    return new Response(JSON.stringify({ error: 'Digest ID required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const supabase = createAdminClient();
    
    const { data: comments, error } = await supabase
      .from('comments')
      .select('*')
      .eq('digest_id', digestId)
      .eq('approved', true)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return new Response(JSON.stringify({ comments: comments || [] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error getting comments:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const POST: APIRoute = async ({ params, request }) => {
  const { digestId } = params;
  
  if (!digestId) {
    return new Response(JSON.stringify({ error: 'Digest ID required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const body = await request.json();
    const { authorName, authorEmail, authorWebsite, content, parentCommentId } = body;

    // Validation
    if (!authorName || !authorEmail || !content) {
      return new Response(JSON.stringify({ error: 'Name, email, and comment are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (content.length > 2000) {
      return new Response(JSON.stringify({ error: 'Comment too long (max 2000 characters)' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(authorEmail)) {
      return new Response(JSON.stringify({ error: 'Invalid email address' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const supabase = createAdminClient();
    const emailHash = await hashEmail(authorEmail);

    const { error } = await supabase.from('comments').insert({
      digest_id: digestId,
      parent_comment_id: parentCommentId || null,
      author_name: authorName.trim(),
      author_email_hash: emailHash,
      author_website: authorWebsite?.trim() || null,
      content: content.trim(),
      approved: false, // Requires admin approval
    });

    if (error) throw error;

    return new Response(JSON.stringify({ 
      success: true,
      message: 'Comment submitted! It will appear after moderation.'
    }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error creating comment:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

