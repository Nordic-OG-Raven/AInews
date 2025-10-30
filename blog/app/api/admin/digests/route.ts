import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';

async function checkAuth(): Promise<boolean> {
  const cookieStore = await cookies();
  const adminToken = cookieStore.get('admin_session');
  return adminToken?.value === process.env.ADMIN_PASSWORD;
}

export async function GET(request: NextRequest) {
  if (!(await checkAuth())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const status = searchParams.get('status');

  const supabase = createAdminClient();
  
  let query = supabase
    .from('digests_with_counts')
    .select('*')
    .order('created_at', { ascending: false });

  if (status && status !== 'all') {
    query = query.eq('status', status);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ digests: data });
}

