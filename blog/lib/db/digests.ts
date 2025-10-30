import { createClient } from '../supabase/server';
import { createAdminClient } from '../supabase/admin';
import type { Digest } from '../types';

/**
 * Get all published digests with pagination
 */
export async function getPublishedDigests(
  page: number = 1,
  pageSize: number = 12,
  category?: string,
  searchQuery?: string
): Promise<{ digests: Digest[]; total: number }> {
  const supabase = await createClient();
  
  let query = supabase
    .from('digests_with_counts')
    .select('*', { count: 'exact' })
    .eq('status', 'published')
    .order('published_date', { ascending: false });

  // Filter by category
  if (category && category !== 'all') {
    query = query.eq('category', category);
  }

  // Search query (uses full-text search)
  if (searchQuery) {
    query = query.textSearch('search_vector', searchQuery);
  }

  // Pagination
  const start = (page - 1) * pageSize;
  const end = start + pageSize - 1;
  query = query.range(start, end);

  const { data, error, count } = await query;

  if (error) {
    console.error('Error fetching digests:', error);
    return { digests: [], total: 0 };
  }

  return {
    digests: data as Digest[],
    total: count || 0,
  };
}

/**
 * Get a single digest by ID
 */
export async function getDigestById(id: string): Promise<Digest | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('digests_with_counts')
    .select('*')
    .eq('id', id)
    .eq('status', 'published')
    .single();

  if (error) {
    console.error('Error fetching digest:', error);
    return null;
  }

  // Increment view count (non-blocking)
  incrementViewCount(id);

  return data as Digest;
}

/**
 * Increment view count for a digest
 */
async function incrementViewCount(digestId: string): Promise<void> {
  const supabase = createAdminClient();
  
  await supabase.rpc('increment_view_count', {
    digest_uuid: digestId,
  });
}

/**
 * Get recent digests (for sidebar/related)
 */
export async function getRecentDigests(limit: number = 5): Promise<Digest[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('digests_with_counts')
    .select('id, title, category, published_date, view_count')
    .eq('status', 'published')
    .order('published_date', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching recent digests:', error);
    return [];
  }

  return data as Digest[];
}

/**
 * Get digest categories with counts
 */
export async function getDigestStats(): Promise<{
  total: number;
  byCategory: Record<string, number>;
}> {
  const supabase = await createClient();

  // Get total count
  const { count: total } = await supabase
    .from('digests')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'published');

  // Get counts by category
  const { data: categories } = await supabase
    .from('digests')
    .select('category')
    .eq('status', 'published');

  const byCategory: Record<string, number> = {
    ml_monday: 0,
    business_wednesday: 0,
    ethics_friday: 0,
    data_saturday: 0,
  };

  categories?.forEach((row) => {
    if (row.category in byCategory) {
      byCategory[row.category]++;
    }
  });

  return {
    total: total || 0,
    byCategory,
  };
}

