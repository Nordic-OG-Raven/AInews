import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';

export const runtime = 'edge';

async function checkAuth(): Promise<boolean> {
  const cookieStore = await cookies();
  const adminToken = cookieStore.get('admin_session');
  return adminToken?.value === process.env.ADMIN_PASSWORD;
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  if (!(await checkAuth())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;
  const body = await request.json();
  
  const supabase = createAdminClient();
  
  const { data, error } = await supabase
    .from('digests')
    .update(body)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ digest: data });
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  if (!(await checkAuth())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;
  
  const supabase = createAdminClient();
  
  const { error } = await supabase
    .from('digests')
    .delete()
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

