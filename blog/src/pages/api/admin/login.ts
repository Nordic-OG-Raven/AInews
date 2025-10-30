import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const formData = await request.formData();
    const password = formData.get('password');

    const adminPassword = import.meta.env.ADMIN_PASSWORD || 'nordicraven2025';

    if (password === adminPassword) {
      // Set session cookie (expires in 24 hours)
      cookies.set('admin_session', 'active', {
        path: '/',
        maxAge: 60 * 60 * 24, // 24 hours
        httpOnly: true,
        secure: import.meta.env.PROD,
        sameSite: 'lax'
      });

      return new Response(null, {
        status: 302,
        headers: { 'Location': '/admin' }
      });
    } else {
      return new Response(null, {
        status: 302,
        headers: { 'Location': '/admin?error=invalid' }
      });
    }
  } catch (error) {
    console.error('Login error:', error);
    return new Response(null, {
      status: 302,
      headers: { 'Location': '/admin?error=server' }
    });
  }
};

