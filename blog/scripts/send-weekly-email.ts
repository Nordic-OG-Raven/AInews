/**
 * Weekly Email Blast
 * 
 * Sends latest published digests to verified subscribers via Resend API
 * 
 * Usage:
 *   npm run send-email           # Live mode (sends emails)
 *   npm run send-email:dry-run   # Dry run (preview only)
 */

import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const resendKey = process.env.RESEND_API_KEY || '';
const isDryRun = process.argv.includes('--dry-run');

const supabase = createClient(supabaseUrl, supabaseKey);
const resend = new Resend(resendKey);

interface Subscriber {
  email: string;
  unsubscribe_token: string;
}

async function getLatestDigest() {
  const { data: digest } = await supabase
    .from('digests')
    .select('*')
    .eq('status', 'published')
    .order('published_date', { ascending: false })
    .limit(1)
    .single();

  return digest;
}

async function getVerifiedSubscribers(): Promise<Subscriber[]> {
  const { data: subscribers } = await supabase
    .from('subscribers')
    .select('email, unsubscribe_token')
    .eq('verified', true)
    .eq('frequency', 'weekly');

  return subscribers || [];
}

function generateEmailHTML(digest: any, unsubscribeToken: string): string {
  const siteUrl = process.env.PUBLIC_SITE_URL || 'https://ainewsblog.jonashaahr.com';
  const articles = digest.content || [];
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${digest.title}</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #f8f9fa; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
    <h1 style="color: #1a1a1a; margin-top: 0;">${digest.title}</h1>
    <p style="color: #666; margin-bottom: 0;">
      📅 ${new Date(digest.published_date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
    </p>
  </div>

  <div style="margin-bottom: 30px;">
    ${articles.map((article: any, index: number) => `
      <div style="margin-bottom: 25px; padding-bottom: 25px; border-bottom: 1px solid #e5e7eb;">
        <h2 style="color: #2563eb; font-size: 18px; margin-bottom: 10px;">
          ${index + 1}. <a href="${article.url}" style="color: #2563eb; text-decoration: none;">${article.title}</a>
        </h2>
        <p style="color: #4b5563; margin-bottom: 8px;">${article.summary}</p>
        <p style="color: #9ca3af; font-size: 14px; margin: 0;">
          <em>Source: ${article.source}</em>
        </p>
      </div>
    `).join('')}
  </div>

  <div style="background-color: #eff6ff; border-radius: 8px; padding: 20px; text-align: center; margin-bottom: 20px;">
    <p style="margin-bottom: 15px; font-size: 16px;">💬 <strong>Have thoughts on these articles?</strong></p>
    <a href="${siteUrl}/digest/${digest.id}" style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
      Read & Comment Online →
    </a>
  </div>

  <div style="border-top: 2px solid #e5e7eb; padding-top: 20px; margin-top: 30px; text-align: center; color: #6b7280; font-size: 14px;">
    <p>You're receiving this because you subscribed to <strong>AI News Blog</strong></p>
    <p style="margin-top: 10px;">
      <a href="${siteUrl}/unsubscribe?token=${unsubscribeToken}" style="color: #6b7280; text-decoration: underline;">Unsubscribe</a>
      | <a href="${siteUrl}" style="color: #6b7280; text-decoration: underline;">Visit Website</a>
    </p>
    <p style="margin-top: 15px; font-size: 12px;">
      AI News Blog · Curated by Nordic Raven Solutions
    </p>
  </div>
</body>
</html>
  `;
}

function generateEmailText(digest: any, unsubscribeToken: string): string {
  const siteUrl = process.env.PUBLIC_SITE_URL || 'https://ainewsblog.jonashaahr.com';
  const articles = digest.content || [];
  
  return `
${digest.title}
${'='.repeat(digest.title.length)}

📅 ${new Date(digest.published_date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}

${articles.map((article: any, index: number) => `
${index + 1}. ${article.title}
${article.url}

${article.summary}

Source: ${article.source}
`).join('\n---\n')}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💬 Have thoughts on these articles?
Read & comment online: ${siteUrl}/digest/${digest.id}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

You're receiving this because you subscribed to AI News Blog.
Unsubscribe: ${siteUrl}/unsubscribe?token=${unsubscribeToken}
Website: ${siteUrl}

AI News Blog · Curated by Nordic Raven Solutions
  `;
}

async function sendEmailBatch(subscribers: Subscriber[], digest: any) {
  const batchSize = 100; // Resend allows up to 100 per batch
  let sent = 0;
  let failed = 0;

  for (let i = 0; i < subscribers.length; i += batchSize) {
    const batch = subscribers.slice(i, i + batchSize);
    
    console.log(`\nSending batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(subscribers.length / batchSize)} (${batch.length} emails)...`);

    const promises = batch.map(async (subscriber) => {
      try {
        const { data, error } = await resend.emails.send({
          from: 'AI News Blog <news@ainewsblog.jonashaahr.com>',
          to: subscriber.email,
          subject: digest.title,
          html: generateEmailHTML(digest, subscriber.unsubscribe_token),
          text: generateEmailText(digest, subscriber.unsubscribe_token)
        });

        if (error) {
          console.error(`Failed to send to ${subscriber.email}:`, error);
          failed++;
        } else {
          console.log(`✓ Sent to ${subscriber.email} (ID: ${data?.id})`);
          sent++;
        }
      } catch (error) {
        console.error(`Error sending to ${subscriber.email}:`, error);
        failed++;
      }
    });

    await Promise.all(promises);
    
    // Rate limit: wait 1 second between batches
    if (i + batchSize < subscribers.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  return { sent, failed };
}

async function main() {
  console.log(isDryRun ? '🔍 DRY RUN MODE - No emails will be sent\n' : '📧 LIVE MODE - Sending emails\n');

  try {
    // Get latest digest
    console.log('📚 Fetching latest digest...');
    const digest = await getLatestDigest();
    
    if (!digest) {
      console.log('❌ No published digests found');
      process.exit(1);
    }
    
    console.log(`✓ Found: ${digest.title}`);

    // Get subscribers
    console.log('\n👥 Fetching verified subscribers...');
    const subscribers = await getVerifiedSubscribers();
    console.log(`✓ Found ${subscribers.length} verified subscribers`);

    if (subscribers.length === 0) {
      console.log('ℹ️  No subscribers to email');
      process.exit(0);
    }

    if (isDryRun) {
      console.log('\n📧 Preview (first subscriber):');
      console.log('━'.repeat(60));
      console.log('To:', subscribers[0].email);
      console.log('Subject:', digest.title);
      console.log('━'.repeat(60));
      console.log(generateEmailText(digest, subscribers[0].unsubscribe_token));
      console.log('━'.repeat(60));
      console.log(`\nWould send to ${subscribers.length} subscribers`);
    } else {
      // Send emails
      console.log('\n📧 Sending emails...');
      const { sent, failed } = await sendEmailBatch(subscribers, digest);
      
      console.log('\n✅ Email blast complete!');
      console.log(`   Sent: ${sent}`);
      console.log(`   Failed: ${failed}`);
      console.log(`   Total: ${subscribers.length}`);
    }
  } catch (error) {
    console.error('❌ Email blast failed:', error);
    process.exit(1);
  }
}

main();

