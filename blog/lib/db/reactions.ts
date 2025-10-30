import { createClient } from '../supabase/server';
import { createAdminClient } from '../supabase/admin';
import { createHash } from 'crypto';

/**
 * Hash IP address for privacy
 */
function hashIp(ip: string): string {
  return createHash('sha256').update(ip).digest('hex');
}

/**
 * Get reaction counts for a digest
 */
export async function getReactionCounts(digestId: string): Promise<{
  thumbs_up: number;
  middle_finger: number;
}> {
  const supabase = await createClient();

  const { data } = await supabase
    .from('reactions')
    .select('reaction_type')
    .eq('digest_id', digestId);

  const counts = {
    thumbs_up: 0,
    middle_finger: 0,
  };

  data?.forEach((row) => {
    if (row.reaction_type === 'thumbs_up') {
      counts.thumbs_up++;
    } else if (row.reaction_type === 'middle_finger') {
      counts.middle_finger++;
    }
  });

  return counts;
}

/**
 * Add a reaction (one per IP per digest)
 */
export async function addReaction(
  digestId: string,
  reactionType: 'thumbs_up' | 'middle_finger',
  ipAddress: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient();

  const { error } = await supabase.from('reactions').insert({
    digest_id: digestId,
    reaction_type: reactionType,
    ip_hash: hashIp(ipAddress),
  });

  if (error) {
    // Check if it's a duplicate (unique constraint violation)
    if (error.code === '23505') {
      return { success: false, error: 'You have already reacted to this digest' };
    }
    console.error('Error adding reaction:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Check if IP has already reacted to a digest
 */
export async function hasUserReacted(
  digestId: string,
  ipAddress: string
): Promise<boolean> {
  const supabase = await createClient();

  const { data } = await supabase
    .from('reactions')
    .select('id')
    .eq('digest_id', digestId)
    .eq('ip_hash', hashIp(ipAddress))
    .single();

  return !!data;
}

