/**
 * LinkedIn Scraper
 * 
 * Scrapes the last 7 days of LinkedIn posts from Nordic Raven Solutions company page
 * and creates draft digests in Supabase.
 * 
 * Usage:
 *   npm run scrape-linkedin           # Live mode (writes to database)
 *   npm run scrape-linkedin:dry-run   # Dry run (preview only)
 */

import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';

const LINKEDIN_COMPANY_URL = 'https://www.linkedin.com/company/nordic-raven-solutions/posts';
const supabaseUrl = process.env.PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const linkedinEmail = process.env.LINKEDIN_EMAIL || '';
const linkedinPassword = process.env.LINKEDIN_PASSWORD || '';
const isDryRun = process.argv.includes('--dry-run');

interface Article {
  title: string;
  url: string;
  summary: string;
  source: string;
}

interface ScrapedPost {
  date: string;
  category: string;
  title: string;
  articles: Article[];
}

async function scrapeLinkedInPosts(): Promise<ScrapedPost[]> {
  console.log('🚀 Launching browser...');
  
  if (!linkedinEmail || !linkedinPassword) {
    throw new Error('LINKEDIN_EMAIL and LINKEDIN_PASSWORD environment variables are required');
  }
  
  const browser = await chromium.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1920, height: 1080 }
    });
    
    const page = await context.newPage();
    
    // Login to LinkedIn first
    console.log('🔐 Logging in to LinkedIn...');
    await page.goto('https://www.linkedin.com/login', { waitUntil: 'networkidle' });
    
    await page.fill('#username', linkedinEmail);
    await page.fill('#password', linkedinPassword);
    await page.click('button[type="submit"]');
    
    // Wait for navigation after login
    await page.waitForURL('https://www.linkedin.com/feed/', { timeout: 30000 }).catch(() => {
      console.log('⚠️  Login redirect timeout, continuing anyway...');
    });
    
    // Add delay to avoid rate limiting
    await page.waitForTimeout(2000);
    
    console.log('📡 Navigating to company page...');
    await page.goto(LINKEDIN_COMPANY_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    
    // Wait for posts to load (increased timeout)
    await page.waitForSelector('[data-id*="urn:li:activity"]', { timeout: 20000 });
    
    console.log('🔍 Scraping posts...');
    
    // Get all posts from the last 7 days
    const posts = await page.$$('[data-id*="urn:li:activity"]');
    const scrapedPosts: ScrapedPost[] = [];
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    for (const post of posts.slice(0, 7)) { // Limit to 7 most recent posts
      try {
        // Extract post text
        const postText = await post.$eval('.feed-shared-update-v2__description', 
          el => el.textContent?.trim() || '');
        
        // Check if post is a digest (contains multiple articles)
        if (!postText.includes('http') || postText.length < 100) continue;
        
        // Parse digest from post text
        // Expected format: Title, then articles with "1." "2." etc.
        const lines = postText.split('\n').filter(line => line.trim());
        
        if (lines.length < 3) continue; // Need at least title + 2 articles
        
        const title = lines[0];
        const articles: Article[] = [];
        
        // Extract category from title (e.g., "ML Monday", "Tech Tuesday")
        let category = 'ml_monday'; // default
        if (title.toLowerCase().includes('tech tuesday')) category = 'tech_tuesday';
        else if (title.toLowerCase().includes('web wednesday')) category = 'web_wednesday';
        else if (title.toLowerCase().includes('thought thursday')) category = 'thought_thursday';
        else if (title.toLowerCase().includes('fun friday')) category = 'fun_friday';
        
        // Parse articles (numbered 1. 2. 3. etc.)
        let currentArticle: Partial<Article> = {};
        
        for (const line of lines.slice(1)) {
          const numberMatch = line.match(/^(\d+)\.\s*(.+)/);
          
          if (numberMatch) {
            // Save previous article if exists
            if (currentArticle.title) {
              articles.push(currentArticle as Article);
            }
            
            // Start new article
            const titleText = numberMatch[2];
            const urlMatch = titleText.match(/https?:\/\/[^\s]+/);
            
            currentArticle = {
              title: titleText.replace(/https?:\/\/[^\s]+/, '').trim(),
              url: urlMatch ? urlMatch[0] : '',
              summary: '',
              source: urlMatch ? new URL(urlMatch[0]).hostname : 'Unknown'
            };
          } else if (currentArticle.title && line.trim() && !line.startsWith('http')) {
            // Add to summary
            currentArticle.summary = (currentArticle.summary || '') + ' ' + line.trim();
          }
        }
        
        // Add last article
        if (currentArticle.title) {
          articles.push(currentArticle as Article);
        }
        
        if (articles.length >= 3) { // Only add if we got at least 3 articles
          scrapedPosts.push({
            date: new Date().toISOString().split('T')[0],
            category,
            title,
            articles
          });
          
          console.log(`✓ Scraped: ${title} (${articles.length} articles)`);
        }
      } catch (error) {
        console.error('Error parsing post:', error);
      }
    }
    
    await browser.close();
    
    return scrapedPosts;
  } catch (error) {
    await browser.close();
    throw error;
  }
}

async function saveToDatabase(posts: ScrapedPost[]) {
  if (posts.length === 0) {
    console.log('ℹ️  No posts to save');
    return;
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  for (const post of posts) {
    const { data, error } = await supabase.from('digests').insert({
      title: post.title,
      category: post.category,
      published_date: post.date,
      content: post.articles,
      status: 'draft', // Requires admin approval
      view_count: 0
    }).select().single();
    
    if (error) {
      console.error(`❌ Error saving "${post.title}":`, error.message);
    } else {
      console.log(`✅ Saved as draft: ${post.title} (ID: ${data.id})`);
    }
  }
}

async function main() {
  console.log(isDryRun ? '🔍 DRY RUN MODE - No database writes\n' : '💾 LIVE MODE - Will write to database\n');
  
  try {
    const posts = await scrapeLinkedInPosts();
    
    console.log(`\n📊 Found ${posts.length} digests\n`);
    
    if (isDryRun) {
      console.log('Preview:');
      posts.forEach((post, i) => {
        console.log(`\n${i + 1}. ${post.title}`);
        console.log(`   Category: ${post.category}`);
        console.log(`   Articles: ${post.articles.length}`);
        post.articles.forEach((article, j) => {
          console.log(`   ${j + 1}. ${article.title}`);
        });
      });
    } else {
      await saveToDatabase(posts);
    }
    
    console.log('\n✅ Scraping complete!');
  } catch (error) {
    console.error('❌ Scraping failed:', error);
    process.exit(1);
  }
}

main();

