import type { APIRoute } from 'astro';
import { createAdminClient } from '../../../../lib/supabase';

export const GET: APIRoute = async ({ cookies }) => {
  // Check admin session
  const adminSession = cookies.get('admin_session');
  if (!adminSession?.value) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const supabase = createAdminClient();
    const { data: subscribers } = await supabase
      .from('subscribers')
      .select('*')
      .order('subscribed_at', { ascending: false });

    if (!subscribers) {
      return new Response('No subscribers found', { status: 404 });
    }

    // Generate CSV
    const headers = ['Email', 'Verified', 'Categories', 'Frequency', 'Subscribed At'];
    const rows = subscribers.map(sub => [
      sub.email,
      sub.verified ? 'Yes' : 'No',
      sub.categories.join(';'),
      sub.frequency,
      new Date(sub.subscribed_at).toISOString()
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    return new Response(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="subscribers-${new Date().toISOString().split('T')[0]}.csv"`
      }
    });
  } catch (error) {
    console.error('Error exporting subscribers:', error);
    return new Response('Internal server error', { status: 500 });
  }
};

