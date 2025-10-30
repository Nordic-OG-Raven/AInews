import type { APIRoute } from 'astro';
import { createAdminClient } from '../../../lib/supabase';

/**
 * Hash IP address for privacy using Web Crypto API
 */
async function hashIp(ip: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(ip);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export const POST: APIRoute = async ({ params, request, clientAddress }) => {
  const { digestId } = params;
  
  if (!digestId) {
    return new Response(JSON.stringify({ error: 'Digest ID required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const body = await request.json();
    const { reactionType } = body;

    if (!reactionType || !['thumbs_up', 'middle_finger'].includes(reactionType)) {
      return new Response(JSON.stringify({ error: 'Invalid reaction type' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const supabase = createAdminClient();
    const ipHash = await hashIp(clientAddress || 'unknown');

    // Insert reaction
    const { error } = await supabase.from('reactions').insert({
      digest_id: digestId,
      reaction_type: reactionType,
      ip_hash: ipHash,
    });

    if (error) {
      // Check if it's a duplicate (unique constraint violation)
      if (error.code === '23505') {
        return new Response(JSON.stringify({ error: 'You have already reacted to this digest' }), {
          status: 409,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      throw error;
    }

    // Get updated counts
    const { data: counts } = await supabase
      .from('reactions')
      .select('reaction_type')
      .eq('digest_id', digestId);

    const thumbsUp = counts?.filter(r => r.reaction_type === 'thumbs_up').length || 0;
    const middleFinger = counts?.filter(r => r.reaction_type === 'middle_finger').length || 0;

    return new Response(JSON.stringify({ 
      success: true,
      thumbsUp,
      middleFinger
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error adding reaction:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

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
    
    const { data: counts } = await supabase
      .from('reactions')
      .select('reaction_type')
      .eq('digest_id', digestId);

    const thumbsUp = counts?.filter(r => r.reaction_type === 'thumbs_up').length || 0;
    const middleFinger = counts?.filter(r => r.reaction_type === 'middle_finger').length || 0;

    return new Response(JSON.stringify({ thumbsUp, middleFinger }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error getting reactions:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

