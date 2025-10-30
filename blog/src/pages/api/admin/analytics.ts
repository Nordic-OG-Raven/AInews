import type { APIRoute } from 'astro';
import { createAdminClient } from '../../../lib/supabase';

export const GET: APIRoute = async ({ cookies }) => {
  // Check admin session
  const adminSession = cookies.get('admin_session');
  if (!adminSession?.value) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const supabase = createAdminClient();

    // Total digests
    const { count: totalDigests } = await supabase
      .from('digests')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'published');

    // Total views (sum of view_count)
    const { data: viewData } = await supabase
      .from('digests')
      .select('view_count')
      .eq('status', 'published');
    const totalViews = viewData?.reduce((sum, d) => sum + (d.view_count || 0), 0) || 0;

    // Total reactions
    const { count: totalReactions } = await supabase
      .from('reactions')
      .select('*', { count: 'exact', head: true });

    // Reaction breakdown
    const { data: reactions } = await supabase
      .from('reactions')
      .select('reaction_type');
    const thumbsUp = reactions?.filter(r => r.reaction_type === 'thumbs_up').length || 0;
    const middleFinger = reactions?.filter(r => r.reaction_type === 'middle_finger').length || 0;

    // Total comments
    const { count: totalComments } = await supabase
      .from('comments')
      .select('*', { count: 'exact', head: true });

    // Pending comments
    const { count: pendingComments } = await supabase
      .from('comments')
      .select('*', { count: 'exact', head: true })
      .eq('approved', false);

    // Total subscribers
    const { count: totalSubscribers } = await supabase
      .from('subscribers')
      .select('*', { count: 'exact', head: true });

    // Verified subscribers
    const { count: verifiedSubscribers } = await supabase
      .from('subscribers')
      .select('*', { count: 'exact', head: true })
      .eq('verified', true);

    // Top digests by views
    const { data: topByViews } = await supabase
      .from('digests_with_counts')
      .select('*')
      .eq('status', 'published')
      .order('view_count', { ascending: false })
      .limit(5);

    // Top digests by reactions
    const { data: topByReactions } = await supabase
      .from('digests_with_counts')
      .select('*')
      .eq('status', 'published')
      .order('thumbs_up', { ascending: false })
      .limit(5);

    // Recent subscriber growth (last 30 days, grouped by day)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const { data: recentSubscribers } = await supabase
      .from('subscribers')
      .select('subscribed_at')
      .gte('subscribed_at', thirtyDaysAgo.toISOString())
      .order('subscribed_at', { ascending: true });

    // Group by date
    const subscribersByDate: Record<string, number> = {};
    recentSubscribers?.forEach(sub => {
      const date = sub.subscribed_at.split('T')[0];
      subscribersByDate[date] = (subscribersByDate[date] || 0) + 1;
    });

    // Category breakdown
    const { data: allDigests } = await supabase
      .from('digests')
      .select('category')
      .eq('status', 'published');
    
    const categoryCount: Record<string, number> = {};
    allDigests?.forEach(d => {
      categoryCount[d.category] = (categoryCount[d.category] || 0) + 1;
    });

    return new Response(JSON.stringify({
      overview: {
        totalDigests: totalDigests || 0,
        totalViews,
        totalReactions: totalReactions || 0,
        totalComments: totalComments || 0,
        pendingComments: pendingComments || 0,
        totalSubscribers: totalSubscribers || 0,
        verifiedSubscribers: verifiedSubscribers || 0
      },
      reactions: {
        thumbsUp,
        middleFinger,
        total: totalReactions || 0
      },
      topDigests: {
        byViews: topByViews || [],
        byReactions: topByReactions || []
      },
      subscriberGrowth: subscribersByDate,
      categoryBreakdown: categoryCount
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

