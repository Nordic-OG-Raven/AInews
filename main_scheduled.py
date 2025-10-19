import os
import random
import json
from collections import defaultdict
from datetime import datetime
from dotenv import load_dotenv
from src.agents import (
    fetch_all_articles,
    fetch_articles_for_category,
    categorize_article,
    get_full_article_text,
    summarize_article,
    generate_joke,
    format_html_email,
    send_email,
    send_to_linkedin,
    score_article_quality,
    ensure_minimum_articles
)
from config import get_current_day_schedule, get_schedule_for_day, WEEKLY_SCHEDULE
from tqdm import tqdm

ARTICLES_PER_CATEGORY = 5  # Increased since we're focusing on one category per day
MIN_ARTICLES_REQUIRED = 3  # Minimum articles required for a digest

def load_cached_data():
    """Load cached test data for fast testing"""
    try:
        with open('test_data.json', 'r') as f:
            return json.load(f)
    except FileNotFoundError:
        return None

def run_digest_for_day(day_name=None, test_mode=False):
    """
    Runs the digest for a specific day or for today.
    
    Args:
        day_name: Specific day to run (e.g., 'monday', 'wednesday', 'friday')
                  If None, uses current day
        test_mode: If True, uses fast cached mode (no LLM calls)
    """
    load_dotenv()
    
    # Get schedule for the day
    if day_name:
        schedule = get_schedule_for_day(day_name)
    else:
        schedule = get_current_day_schedule()
    
    if not schedule:
        print(f"No digest scheduled for {day_name or datetime.now().strftime('%A')}")
        return
    
    print(f"\n{'='*60}")
    print(f"  {schedule['name'].upper()}")
    print(f"  {schedule['description']}")
    print(f"{'='*60}\n")
    
    target_category = schedule['category']
    
    # Fast test mode using cached data
    if test_mode:
        print("🚀 FAST TEST MODE: Using cached data (no LLM calls)")
        cached_data = load_cached_data()
        if cached_data:
            # For test mode, just show the email structure with placeholder content
            print(f"📧 Generating {schedule['name']} email structure...")
            print(f"🎯 Target category: {target_category}")
            print("📝 Using placeholder content for fast testing")
            
            # Create minimal test content
            test_articles = [{
                "title": f"Sample {target_category} Article {i+1}",
                "link": "https://example.com",
                "source": "Test Source",
                "summary": f"This is a sample article summary for testing the {target_category} category. It demonstrates how the email will look with real content.",
                "published": "2025-10-19T12:00:00+00:00"
            } for i in range(3)]
            
            final_categorized_articles = {target_category: test_articles}
            joke = f"Why did the data scientist break up with their model? Because it kept overfitting to their expectations!"
            joke_article = {"title": "Sample Article 1", "link": "https://example.com"}
            
            # Generate HTML with test data
            html_content = format_themed_email(schedule, final_categorized_articles, joke, joke_article)
            
            # Save HTML file
            timestamp = datetime.now().strftime('%Y-%m-%d_%H-%M-%S')
            output_dir = "outputs/email_archives"
            os.makedirs(output_dir, exist_ok=True)
            output_file = f"{output_dir}/{day_name or 'today'}_{timestamp}.html"
            with open(output_file, 'w', encoding='utf-8') as f:
                f.write(html_content)
            print(f"✅ FAST TEST: Email structure saved to {output_file}")
            return
        else:
            print("⚠️ No cached data found, falling back to full processing...")
    
    # Full processing (production)
    
    # 1. Fetch articles from relevant sources only (efficient)
    all_articles = fetch_articles_for_category(target_category)
    
    # 2. Source Validation Step
    print("\n--- Source Validation Report ---")
    source_counts = defaultdict(int)
    for article in all_articles:
        source_counts[article['source']] += 1
    
    if not source_counts:
        print("No articles fetched from any source. Exiting.")
        return
        
    for source, count in source_counts.items():
        print(f"- {source}: {count} articles")
    print("--------------------------\n")

    print(f"Fetched {len(all_articles)} potential articles. Categorizing...")

    # 3. Categorize all articles using an LLM agent
    categorized_articles = defaultdict(list)
    for article in tqdm(all_articles, desc="Categorizing Articles"):
        category = categorize_article(article)
        if category == target_category:
            categorized_articles[category].append(article)

    # 4. Select top N articles from the target category
    if not categorized_articles:
        print(f"Not enough articles found for {target_category}. Found {len(categorized_articles.get(target_category, []))}, need at least {MIN_ARTICLES_REQUIRED}. Exiting.")
        return

    final_articles_to_summarize = []
    final_categorized_articles = {}
    
    # Quality scoring and selection for target category
    if target_category in categorized_articles:
        target_articles = categorized_articles[target_category]
        
        # Score articles by quality
        scored_articles = []
        for article in target_articles:
            score = score_article_quality(article, target_category)
            scored_articles.append((score, article))
        
        # Sort by quality score (highest first), then by recency
        scored_articles.sort(key=lambda x: (-x[0], x[1].get('published', '')), reverse=True)
        
        # Take top articles
        final_articles_to_summarize = [article for score, article in scored_articles[:ARTICLES_PER_CATEGORY]]
        
        # Ensure minimum articles with fallback content
        final_articles_to_summarize = ensure_minimum_articles(final_articles_to_summarize, target_category, MIN_ARTICLES_REQUIRED)
        
        final_categorized_articles[target_category] = final_articles_to_summarize

    print(f"\nFound {len(final_articles_to_summarize)} articles for {target_category}. Summarizing...")

    # 5. Summarize the curated list of articles
    with tqdm(total=len(final_articles_to_summarize), desc="Summarizing Articles") as pbar:
        for category, articles in final_categorized_articles.items():
            for article in articles:
                content_to_summarize = article['summary']
                if "arxiv" not in article['link']:
                    full_text = get_full_article_text(article['link'])
                    if full_text:
                        content_to_summarize = full_text
                
                article['summary'] = summarize_article(content_to_summarize)
                pbar.update(1)

    # 6. Print summaries to terminal for validation
    print(f"\n--- {schedule['name']} Digest ---")
    for category, articles in final_categorized_articles.items():
        print(f"\n## {category}\n")
        for article in articles:
            print(f"  - Source: {article['source']}")
            print(f"  - Title: {article['title']}")
            print(f"  - Summary: {article['summary']}\n")
    print("--------------------------\n")

    # 7. Get a joke from a random article
    random_article = random.choice(final_articles_to_summarize)
    joke = generate_joke(random_article)
    print(f"Joke of the day:\n{joke}\n")

    # 8. Format email with themed title
    html_content = format_themed_email(schedule, final_categorized_articles, joke, random_article)
    
    # 9. Always send email and save archive
    send_email(html_content)
    
    # 10. Save email archive
    timestamp = datetime.now().strftime('%Y-%m-%d_%H-%M-%S')
    output_dir = "outputs/email_archives"
    os.makedirs(output_dir, exist_ok=True)
    output_file = f"{output_dir}/{day_name or 'today'}_{timestamp}.html"
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(html_content)
    print(f"✅ Email sent and saved to {output_file}")
    
    # 11. Post to LinkedIn
    print("\n" + "="*60)
    print("  LINKEDIN POSTING")
    print("="*60)
    send_to_linkedin(final_categorized_articles, schedule)

def format_themed_email(schedule, categorized_articles, joke, joke_article):
    """
    Formats the categorized articles and joke into a themed HTML email.
    Joke appears right before the featured category, followed by other categories.
    """
    featured_category = schedule['category']
    joke_article_title = joke_article['title'][:60] + "..." if len(joke_article['title']) > 60 else joke_article['title']
    
    html = f"""
    <html>
        <head>
            <style>
                body {{ font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5; }}
                .container {{ max-width: 700px; margin: 20px auto; background-color: white; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }}
                .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 30px; text-align: center; }}
                .header h1 {{ margin: 0; font-size: 32px; font-weight: 700; color: white; }}
                .header p {{ margin: 10px 0 0 0; font-size: 16px; color: white; opacity: 0.95; }}
                .content {{ padding: 30px; }}
                h2 {{ color: #2c3e50; border-bottom: 3px solid #667eea; padding-bottom: 10px; margin-top: 40px; margin-bottom: 20px; }}
                h3 {{ color: #34495e; margin-bottom: 8px; margin-top: 0; }}
                p {{ line-height: 1.8; color: #555; }}
                a {{ color: #667eea; text-decoration: none; font-weight: 600; }}
                a:hover {{ text-decoration: underline; }}
                .article {{ margin-bottom: 30px; border-left: 4px solid #667eea; padding: 20px; background-color: #fafafa; border-radius: 0 8px 8px 0; }}
                .joke {{ background-color: #f8f9fa; border-left: 4px solid #fbbf24; padding: 20px; margin: 30px 0; border-radius: 0 8px 8px 0; }}
                .joke-label {{ color: #f59e0b; font-weight: 600; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 10px; }}
                .joke-text {{ color: #374151; font-size: 15px; line-height: 1.6; font-style: italic; }}
                .source {{ color: #7f8c8d; font-size: 14px; font-style: italic; margin-bottom: 10px; }}
                .section-intro {{ color: #6b7280; font-size: 15px; margin-bottom: 25px; font-style: italic; }}
                .footer {{ background-color: #2c3e50; color: white; padding: 20px; text-align: center; font-size: 12px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <img src="https://raw.githubusercontent.com/Nordic-OG-Raven/AInews/main/assets/nordic-raven-logo.png" alt="Nordic Raven Solutions" style="height: 40px; margin-bottom: 15px;">
                    <h1>{schedule['name']}</h1>
                    <p>{schedule['description']}</p>
                    <p style="font-size: 14px; margin-top: 10px; color: white; opacity: 0.9;">{datetime.now().strftime('%B %d, %Y')}</p>
                </div>
                <div class="content">
    """
    
    # Featured category with joke at top, then tip, then joke article, then others
    if featured_category in categorized_articles and categorized_articles[featured_category]:
        html += f"""
                    <h2>{featured_category}</h2>
                    <div class="joke">
                        <div class="joke-label">💡 Joke of the Day</div>
                        <div class="joke-text">{joke}</div>
                        <div style="margin-top: 12px; font-size: 13px; color: #9ca3af; font-style: normal;">(See "{joke_article_title}" below to get it)</div>
                    </div>
                    <div style="background-color: #f0f8ff; border-left: 4px solid #4a90e2; padding: 12px; margin: 20px 0; border-radius: 0 6px 6px 0;">
                        <p style="margin: 0; color: #2c3e50; font-size: 12px; line-height: 1.4;">
                            <strong>💡 Tip:</strong> Click any article title below to read the full article from the original source.
                        </p>
                    </div>
        """
        
        # First, add the joke article
        for article in categorized_articles[featured_category]:
            if joke_article and article['link'] == joke_article.get('link'):
                html += f"""
                    <div class="article">
                        <h3><a href="{article['link']}" style="color: #2c3e50; text-decoration: none;">{article['title']}</a></h3>
                        <div class="source">Source: {article['source']}</div>
                        <div class="summary">{article['summary']}</div>
                    </div>
                """
                break
        
        # Then add the remaining articles
        for article in categorized_articles[featured_category]:
            if not joke_article or article['link'] != joke_article.get('link'):
                html += f"""
                    <div class="article">
                        <h3><a href="{article['link']}" style="color: #2c3e50; text-decoration: none;">{article['title']}</a></h3>
                        <div class="source">Source: {article['source']}</div>
                        <div class="summary">{article['summary']}</div>
                    </div>
                """
    
    # Other categories (if any articles found)
    other_categories = {k: v for k, v in categorized_articles.items() if k != featured_category and v}
    if other_categories:
        html += f"""
                    <p class="section-intro">Also worth checking out from the past few days...</p>
        """
        for category, articles in other_categories.items():
            html += f"""
                    <h2>{category}</h2>
            """
            for article in articles:
                html += f"""
                    <div class="article">
                        <h3><a href="{article['link']}">{article['title']}</a></h3>
                        <p class="source">Source: {article['source']}</p>
                        <p>{article['summary']}</p>
                    </div>
                """
    
    html += """
                </div>
                <div class="footer">
                    <p>AI News Digest • Delivered with 🤖</p>
                    <p style="font-size: 11px; margin-top: 10px; opacity: 0.8;">
                        This newsletter was created using an AI-powered MAS (Multi-Agent System) that automatically curates, categorizes, and summarizes AI news from multiple sources. 
                        <a href="https://github.com/Nordic-OG-Raven/AInews" style="color: #4a90e2;">View the source code on GitHub</a>
                    </p>
                    <p style="font-size: 11px; margin-top: 8px; opacity: 0.9;">
                        <strong>Open to work & collaboration:</strong> <a href="mailto:jonas.haahr@aol.com" style="color: #4a90e2;">jonas.haahr@aol.com</a> - Let's build something amazing together! 🚀
                    </p>
                </div>
            </div>
        </body>
    </html>
    """
    return html

def run_test_all_days():
    """
    Runs the digest for all scheduled days and saves them (test mode).
    """
    print("\n" + "="*60)
    print("  TESTING ALL WEEKLY DIGESTS")
    print("="*60 + "\n")
    
    for day_name in WEEKLY_SCHEDULE.keys():
        print(f"\n{'='*60}")
        print(f"  Running test for {day_name.upper()}")
        print(f"{'='*60}\n")
        run_digest_for_day(day_name, test_mode=True)
        print("\n")

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1:
        arg = sys.argv[1].lower()
        if arg == "test-all":
            run_test_all_days()
        elif arg in WEEKLY_SCHEDULE:
            run_digest_for_day(arg, test_mode=True)
        else:
            print(f"Usage: python main_scheduled.py [monday|wednesday|friday|test-all]")
    else:
        # Run for today
        run_digest_for_day()

