/**
 * Import Email Archives to Supabase
 * 
 * Parses HTML email archives from /outputs/email_archives/
 * and imports them into the Supabase digests table.
 * 
 * Usage:
 *   npm run import-digests              # Import all
 *   npm run import-digests -- --dry-run # Test without writing to DB
 */

import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { parse } from 'node-html-parser';
import { createAdminClient } from '../lib/supabase/admin';
import type { DigestCategory, Article } from '../lib/types';

const EMAIL_ARCHIVES_DIR = '../../outputs/email_archives';
const DRY_RUN = process.argv.includes('--dry-run');

interface ParsedDigest {
  title: string;
  category: DigestCategory;
  published_date: string;
  articles: Article[];
}

/**
 * Detect category from filename or content
 */
function detectCategory(filename: string, content: string): DigestCategory {
  const lower = filename.toLowerCase() + ' ' + content.toLowerCase();
  
  if (lower.includes('ml_monday') || lower.includes('monday')) {
    return 'ml_monday';
  } else if (lower.includes('business') || lower.includes('wednesday')) {
    return 'business_wednesday';
  } else if (lower.includes('ethics') || lower.includes('friday')) {
    return 'ethics_friday';
  } else if (lower.includes('data') || lower.includes('saturday')) {
    return 'data_saturday';
  }
  
  // Default to monday if unknown
  return 'ml_monday';
}

/**
 * Extract date from filename (e.g., "monday_2025-10-27_11-15-05.html")
 */
function extractDateFromFilename(filename: string): string | null {
  const dateMatch = filename.match(/(\d{4}-\d{2}-\d{2})/);
  return dateMatch ? dateMatch[1] : null;
}

/**
 * Parse HTML email into structured digest
 */
function parseEmailHTML(html: string, filename: string): ParsedDigest | null {
  const root = parse(html);
  
  // Try to find the title
  const h1 = root.querySelector('h1');
  const title = h1?.text?.trim() || `AI News Digest - ${filename}`;
  
  // Extract date
  const date = extractDateFromFilename(filename) || new Date().toISOString().split('T')[0];
  
  // Detect category
  const category = detectCategory(filename, html);
  
  // Parse articles - look for numbered items or links
  const articles: Article[] = [];
  
  // Strategy 1: Find all <a> tags with href (likely article links)
  const links = root.querySelectorAll('a[href]');
  const articleLinks = links.filter(link => {
    const href = link.getAttribute('href') || '';
    return href.startsWith('http') && !href.includes('linkedin.com') && !href.includes('supabase');
  });
  
  // Strategy 2: Find paragraphs that look like article summaries
  const paragraphs = root.querySelectorAll('p');
  
  // Combine strategies: match links with nearby text
  articleLinks.forEach((link, index) => {
    const href = link.getAttribute('href') || '';
    const linkText = link.text.trim();
    
    // Find nearby paragraph for summary
    let summary = '';
    const parent = link.parentNode;
    if (parent) {
      const nextSibling = parent.next;
      if (nextSibling?.tagName === 'P') {
        summary = nextSibling.text.trim().slice(0, 500);
      }
    }
    
    // If no summary found, use text after the link
    if (!summary) {
      summary = linkText.slice(0, 200) || 'Read the full article for details.';
    }
    
    articles.push({
      title: linkText || `Article ${index + 1}`,
      summary,
      url: href,
    });
  });
  
  // If no articles found, try to extract from plain text structure
  if (articles.length === 0) {
    const text = root.text;
    const urlRegex = /https?:\/\/[^\s]+/g;
    const urls = text.match(urlRegex) || [];
    
    urls.forEach((url, index) => {
      // Get text before URL as potential title/summary
      const urlIndex = text.indexOf(url);
      const textBefore = text.slice(Math.max(0, urlIndex - 200), urlIndex).trim();
      
      articles.push({
        title: `Article ${index + 1}`,
        summary: textBefore || 'Read more at the link.',
        url,
      });
    });
  }
  
  if (articles.length === 0) {
    console.warn(`⚠️  No articles found in ${filename}`);
    return null;
  }
  
  return {
    title,
    category,
    published_date: date,
    articles,
  };
}

/**
 * Import digest to Supabase
 */
async function importDigest(digest: ParsedDigest): Promise<void> {
  if (DRY_RUN) {
    console.log('\n📋 DRY RUN - Would import:');
    console.log(JSON.stringify(digest, null, 2));
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
      status: 'published', // Mark as published since these are historical
      view_count: 0,
    })
    .select()
    .single();
  
  if (error) {
    console.error(`❌ Error importing digest:`, error);
    throw error;
  }
  
  console.log(`✅ Imported: ${digest.title}`);
}

/**
 * Main import function
 */
async function main() {
  console.log('📚 Email Archive Importer');
  console.log('================================\n');
  
  if (DRY_RUN) {
    console.log('⚠️  DRY RUN MODE - No database writes\n');
  }
  
  const archivesPath = join(__dirname, EMAIL_ARCHIVES_DIR);
  
  try {
    const files = readdirSync(archivesPath).filter(f => f.endsWith('.html'));
    
    console.log(`📁 Found ${files.length} HTML files in email archives\n`);
    
    let imported = 0;
    let skipped = 0;
    
    for (const file of files) {
      console.log(`📄 Processing: ${file}`);
      
      const filepath = join(archivesPath, file);
      const html = readFileSync(filepath, 'utf-8');
      
      const digest = parseEmailHTML(html, file);
      
      if (digest) {
        await importDigest(digest);
        imported++;
      } else {
        console.log(`⏭️  Skipped: ${file} (no articles found)`);
        skipped++;
      }
    }
    
    console.log(`\n🎉 Import complete!`);
    console.log(`   Imported: ${imported}`);
    console.log(`   Skipped: ${skipped}`);
    
  } catch (error) {
    console.error('\n❌ Import failed:', error);
    process.exit(1);
  }
}

// Run importer
main();

