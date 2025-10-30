import type { APIRoute } from 'astro';
import { createAdminClient } from '../../lib/supabase';

function generateToken(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return new Response(JSON.stringify({ error: 'Email is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(JSON.stringify({ error: 'Invalid email address' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const supabase = createAdminClient();

    // Check if already subscribed
    const { data: existing } = await supabase
      .from('subscribers')
      .select('*')
      .eq('email', email.toLowerCase())
      .single();

    if (existing) {
      if (existing.verified) {
        return new Response(JSON.stringify({ error: 'This email is already subscribed' }), {
          status: 409,
          headers: { 'Content-Type': 'application/json' }
        });
      } else {
        // Resend verification email
        return new Response(JSON.stringify({ 
          message: 'A verification email has been sent. Please check your inbox.' 
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    // Generate tokens
    const verificationToken = generateToken();
    const unsubscribeToken = generateToken();

    // Insert subscriber
    const { error } = await supabase.from('subscribers').insert({
      email: email.toLowerCase(),
      verified: false,
      categories: ['all'],
      frequency: 'weekly',
      verification_token: verificationToken,
      unsubscribe_token: unsubscribeToken
    });

    if (error) throw error;

    // TODO: Send verification email via Resend API
    // For now, just return success
    const verificationUrl = `${import.meta.env.PUBLIC_SITE_URL}/verify?token=${verificationToken}`;
    console.log('Verification URL:', verificationUrl);

    return new Response(JSON.stringify({ 
      message: 'Subscription successful! Check your email to confirm.',
      // In dev, return the verification URL
      ...(import.meta.env.DEV ? { verificationUrl } : {})
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error subscribing:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

