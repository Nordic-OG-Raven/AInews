import os
import random
from collections import defaultdict
from dotenv import load_dotenv
from src.agents import (
    fetch_all_articles,
    categorize_article,
    get_full_article_text,
    summarize_article,
    generate_joke,
    format_html_email,
    send_email
)
from tqdm import tqdm

ARTICLES_PER_CATEGORY = 3

def main():
    load_dotenv()
    print("AI News Retriever starting...")

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
        if category != "Irrelevant":
            categorized_articles[category].append(article)

    # 4. Select top N articles from each category
    final_articles_to_summarize = []
    final_categorized_articles = {}
    for category, articles in categorized_articles.items():
        sorted_articles = sorted(articles, key=lambda x: x.get('published', ''), reverse=True)
        selected = sorted_articles[:ARTICLES_PER_CATEGORY]
        final_categorized_articles[category] = selected
        final_articles_to_summarize.extend(selected)

    if not final_articles_to_summarize:
        print("No relevant articles found after categorization. Exiting.")
        return

    print(f"\nFound {len(final_articles_to_summarize)} relevant articles across {len(final_categorized_articles)} categories. Summarizing...")

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
    print("\n--- Summarized News Digest ---")
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

    # 8. Send the categorized email
    html_content = format_html_email(final_categorized_articles, joke)
    send_email(html_content)

if __name__ == "__main__":
    main()
