import os
import random
from collections import defaultdict
from datetime import datetime
from dotenv import load_dotenv
from src.agents import (
    fetch_all_articles,
    categorize_article,
    get_full_article_text,
    summarize_article,
    generate_joke,
    format_html_email,
    send_email,
    send_to_linkedin
)
from config import get_current_day_schedule, get_schedule_for_day, WEEKLY_SCHEDULE
from tqdm import tqdm

ARTICLES_PER_CATEGORY = 5  # Increased since we're focusing on one category per day

def run_digest_for_day(day_name=None, test_mode=False):
    """
    Runs the digest for a specific day or for today.
    
    Args:
        day_name: Specific day to run (e.g., 'monday', 'wednesday', 'friday')
                  If None, uses current day
        test_mode: If True, saves HTML but doesn't send email
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
    
    # 1. Fetch all potential articles from all sources
    all_articles = fetch_all_articles()
    
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
        print(f"No relevant articles found for {target_category}. Exiting.")
        return

    final_articles_to_summarize = []
    final_categorized_articles = {}
    
    for category, articles in categorized_articles.items():
        sorted_articles = sorted(articles, key=lambda x: x.get('published', ''), reverse=True)
        selected = sorted_articles[:ARTICLES_PER_CATEGORY]
        final_categorized_articles[category] = selected
        final_articles_to_summarize.extend(selected)

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
    
    # 9. Send email (or just save if test mode)
    if test_mode:
        timestamp = datetime.now().strftime('%Y-%m-%d_%H-%M-%S')
        output_dir = "outputs/email_archives"
        os.makedirs(output_dir, exist_ok=True)
        output_file = f"{output_dir}/{day_name or 'today'}_{timestamp}.html"
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(html_content)
        print(f"TEST MODE: Email saved to {output_file}")
    else:
        send_email(html_content)
        
        # 10. Post to LinkedIn (production only, not in test mode)
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
                    <h1>{schedule['name']}</h1>
                    <p>{schedule['description']}</p>
                    <p style="font-size: 14px; margin-top: 10px; color: white; opacity: 0.9;">{datetime.now().strftime('%B %d, %Y')}</p>
                </div>
                <div class="content">
    """
    
    # Featured category with joke
    if featured_category in categorized_articles and categorized_articles[featured_category]:
        html += f"""
                    <h2>{featured_category}</h2>
                    <div class="joke">
                        <div class="joke-label">💡 Joke of the Day</div>
                        <div class="joke-text">{joke}</div>
                        <div style="margin-top: 12px; font-size: 13px; color: #9ca3af; font-style: normal;">(See "{joke_article_title}" below to get it)</div>
                    </div>
        """
        for article in categorized_articles[featured_category]:
            html += f"""
                    <div class="article">
                        <h3><a href="{article['link']}">{article['title']}</a></h3>
                        <p class="source">Source: {article['source']}</p>
                        <p>{article['summary']}</p>
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

