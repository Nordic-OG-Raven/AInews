/**
 * LinkedIn Scraper for AI News Digests
 * 
 * Scrapes the last 7 days of posts from linkedin.com/company/nordic-raven-solutions
 * Extracts digest content and saves to Supabase
 * 
 * Usage:
 *   npm run scrape-linkedin              # Normal run (saves to DB)
 *   npm run scrape-linkedin -- --dry-run # Test run (prints only)
 */

import { chromium } from 'playwright';
import { createAdminClient } from '../lib/supabase/admin';

const LINKEDIN_COMPANY_URL = 'https://www.linkedin.com/company/nordic-raven-solutions/posts/';
const DRY_RUN = process.argv.includes('--dry-run');

interface ScrapedPost {
  text: string;
  date: Date;
  url: string;
}

interface ParsedDigest {
  title: string;
  category: 'ml_monday' | 'business_wednesday' | 'ethics_friday' | 'data_saturday';
  published_date: string;
  articles: Array<{
    title: string;
    summary: string;
    url: string;
    source?: string;
  }>;
  linkedin_post_url: string;
}

/**
 * Scrape LinkedIn posts from the last 7 days
 */
async function scrapeLinkedInPosts(): Promise<ScrapedPost[]> {
  console.log('🚀 Launching browser...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
  });
  const page = await context.newPage();

  try {
    console.log(`📍 Navigating to ${LINKEDIN_COMPANY_URL}...`);
    await page.goto(LINKEDIN_COMPANY_URL, { waitUntil: 'networkidle' });

    // Wait for posts to load
    await page.waitForSelector('[data-urn]', { timeout: 10000 });
    
    console.log('📄 Extracting posts...');
    
    // Extract posts
    const posts = await page.evaluate(() => {
      const postElements = Array.from(document.querySelectorAll('[data-urn]'));
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      return postElements.map(post => {
        // Get post text
        const textElement = post.querySelector('.feed-shared-update-v2__description');
        const text = textElement?.textContent?.trim() || '';

        // Get post date
        const dateElement = post.querySelector('time');
        const dateStr = dateElement?.getAttribute('datetime') || '';
        const date = dateStr ? new Date(dateStr) : new Date();

        // Get post URL
        const linkElement = post.querySelector('a[href*="/posts/"]');
        const url = linkElement?.getAttribute('href') || '';

        return { text, date: date.toISOString(), url };
      }).filter(post => {
        const postDate = new Date(post.date);
        return postDate >= sevenDaysAgo && post.text.length > 100; // Filter recent posts with content
      });
    });

    console.log(`✅ Found ${posts.length} posts from the last 7 days`);
    
    return posts.map(p => ({ ...p, date: new Date(p.date) }));

  } catch (error) {
    console.error('❌ Error scraping LinkedIn:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

/**
 * Parse a LinkedIn post into a structured digest
 */
function parseDigestFromPost(post: ScrapedPost): ParsedDigest | null {
  const text = post.text;

  // Detect category from post content
  let category: ParsedDigest['category'] | null = null;
  let dayName = '';

  if (text.match(/ML Monday|Machine Learning Monday/i)) {
    category = 'ml_monday';
    dayName = 'ML Monday';
  } else if (text.match(/Business.*Wednesday|Wednesday.*Business/i)) {
    category = 'business_wednesday';
    dayName = 'Business Wednesday';
  } else if (text.match(/Ethics.*Friday|Friday.*Ethics/i)) {
    category = 'ethics_friday';
    dayName = 'Ethics Friday';
  } else if (text.match(/Data.*Saturday|Saturday.*Data/i)) {
    category = 'data_saturday';
    dayName = 'Data Saturday';
  }

  if (!category) {
    console.warn('⚠️  Could not determine category for post');
    return null;
  }

  // Extract title (first line or use category + date)
  const lines = text.split('\n').filter(l => l.trim());
  const title = lines[0]?.trim() || `${dayName} - ${post.date.toLocaleDateString()}`;

  // Parse articles - look for patterns like:
  // 1. Article Title
  // Summary text...
  // https://url.com
  const articles: ParsedDigest['articles'] = [];
  const articleRegex = /(\d+)\.\s+(.+?)(?:\n|$)([\s\S]+?)(?=\d+\.\s+|$)/g;
  let match;

  while ((match = articleRegex.exec(text)) !== null) {
    const [, , articleTitle, content] = match;
    
    // Find URL in content
    const urlMatch = content.match(/https?:\/\/[^\s]+/);
    const url = urlMatch ? urlMatch[0] : '';
    
    // Extract summary (text before URL)
    const summary = content
      .replace(/https?:\/\/[^\s]+/g, '')
      .trim()
      .slice(0, 300); // Limit summary length

    if (articleTitle && url) {
      articles.push({
        title: articleTitle.trim(),
        summary,
        url,
      });
    }
  }

  // Fallback: if regex didn't work, try simpler parsing
  if (articles.length === 0) {
    const urls = text.match(/https?:\/\/[^\s]+/g) || [];
    urls.forEach((url, i) => {
      articles.push({
        title: `Article ${i + 1}`,
        summary: 'See link for details',
        url,
      });
    });
  }

  if (articles.length === 0) {
    console.warn('⚠️  No articles found in post');
    return null;
  }

  return {
    title,
    category,
    published_date: post.date.toISOString().split('T')[0],
    articles,
    linkedin_post_url: post.url.startsWith('http') ? post.url : `https://linkedin.com${post.url}`,
  };
}

/**
 * Save digest to Supabase
 */
async function saveDigestToDatabase(digest: ParsedDigest): Promise<void> {
  if (DRY_RUN) {
    console.log('\n📋 DRY RUN - Would save:', JSON.stringify(digest, null, 2));
    return;
  }

  const supabase = createAdminClient();
  
  const { data, error } = await supabase
    .from('digests')
    .insert({
      title: digest.title,
      category: digest.category,
      published_date: digest.published_date,
      content: digest.articles,
      status: 'draft', // Admin must review before publishing
      linkedin_post_url: digest.linkedin_post_url,
    })
    .select()
    .single();

  if (error) {
    console.error('❌ Error saving digest:', error);
    throw error;
  }

  console.log(`✅ Saved digest: ${data.id}`);
}

/**
 * Log scraper run to database
 */
async function logScraperRun(status: 'success' | 'failed', postsScraped: number, errorMessage?: string): Promise<void> {
  if (DRY_RUN) return;

  const supabase = createAdminClient();
  
  await supabase.from('scraper_runs').insert({
    status,
    posts_scraped: postsScraped,
    error_message: errorMessage,
  });
}

/**
 * Main scraper function
 */
async function main() {
  console.log('🤖 AI News LinkedIn Scraper');
  console.log('================================\n');

  if (DRY_RUN) {
    console.log('⚠️  DRY RUN MODE - No database writes\n');
  }

  try {
    // Scrape posts
    const posts = await scrapeLinkedInPosts();

    if (posts.length === 0) {
      console.log('ℹ️  No new posts found');
      await logScraperRun('success', 0);
      return;
    }

    // Parse and save digests
    let savedCount = 0;
    for (const post of posts) {
      console.log(`\n📝 Processing post from ${post.date.toLocaleDateString()}...`);
      
      const digest = parseDigestFromPost(post);
      if (digest) {
        await saveDigestToDatabase(digest);
        savedCount++;
      }
    }

    await logScraperRun('success', savedCount);
    console.log(`\n🎉 Successfully processed ${savedCount} digest(s)!`);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('\n❌ Scraper failed:', errorMessage);
    await logScraperRun('failed', 0, errorMessage);
    process.exit(1);
  }
}

// Run scraper
main();

