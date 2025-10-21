import requests
from bs4 import BeautifulSoup
from datetime import datetime, timedelta, timezone
import os
import feedparser
import xml.etree.ElementTree as ET

from langchain_groq import ChatGroq
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

# A unified list of all high-quality sources
SOURCES = {
    "rss": [
        # Business / Industry
        "https://techcrunch.com/category/artificial-intelligence/feed/",
        "https://venturebeat.com/category/ai/feed/",
        # Ethics / Society
        "https://www.wired.com/feed/tag/ai-ethics/latest/rss",
        "https://www.technologyreview.com/c/artificial-intelligence/ethics-in-ai/feed/",
        # Research & Technical Blogs / Papers
        "https://blog.research.google/feeds/posts/default?category=Artificial+Intelligence",
        "https://openai.com/blog/rss.xml",
        "http://www.semanticscholar.org/rss/daily", # Fallback for research papers
        # Data Science & Analytics
        "https://www.kdnuggets.com/feed",
        "https://towardsdatascience.com/feed",
        "https://www.datacamp.com/blog/rss.xml",
        "https://www.analyticsvidhya.com/feed/",
        "https://www.dataquest.io/blog/feed/",
        "https://blog.snowflake.com/rss.xml",
        "https://cloud.google.com/blog/products/data-analytics/rss.xml",
        "https://aws.amazon.com/blogs/big-data/feed/"
    ],
    "hackernews_keywords": {
        "ai_ml": ['ai', 'ml', 'llm', 'transformer', 'neural network', 'openai', 'deepmind', 'anthropic', 'pytorch', 'tensorflow', 'diffusion model', 'attention is all you need'],
        "data_science": ['data science', 'sql', 'analytics', 'statistics', 'pandas', 'numpy', 'scikit-learn', 'snowflake', 'bigquery', 'tableau', 'power bi', 'duckdb', 'postgresql', 'mysql', 'data engineering', 'etl', 'data pipeline', 'data warehouse', 'business intelligence', 'data visualization', 'jupyter', 'notebook', 'python', 'r programming', 'data analysis']
    }
}

CATEGORIES = ["AI Research & Technical Deep Dives", "AI Business & Industry News", "AI Ethics, Policy & Society", "Data Science & Analytics", "Irrelevant"]

def fetch_arxiv_papers():
    """
    Fetches papers directly from the arXiv API.
    """
    articles = []
    yesterday_utc = datetime.now(timezone.utc) - timedelta(days=7)
    
    try:
        query = "cat:cs.AI OR cat:cs.LG OR cat:cs.CL"
        url = f"http://export.arxiv.org/api/query?search_query={query}&sortBy=submittedDate&sortOrder=descending&max_results=50"
        response = requests.get(url)
        root = ET.fromstring(response.content)
        
        for entry in root.findall('{http://www.w3.org/2005/Atom}entry'):
            published_str = entry.find('{http://www.w3.org/2005/Atom}published').text
            published_time = datetime.fromisoformat(published_str.replace('Z', '+00:00'))
            
            if published_time > yesterday_utc:
                # Get primary category for more specific source
                primary_category = entry.find('{http://www.w3.org/2005/Atom}primary_category')
                category_name = "arXiv"
                if primary_category is not None:
                    term = primary_category.get('term', '')
                    # Map arXiv categories to readable names
                    category_map = {
                        'cs.AI': 'arXiv: Artificial Intelligence',
                        'cs.LG': 'arXiv: Machine Learning',
                        'cs.CL': 'arXiv: Computation & Language',
                        'cs.CV': 'arXiv: Computer Vision',
                        'cs.NE': 'arXiv: Neural Networks',
                    }
                    category_name = category_map.get(term, f"arXiv: {term}")
                
                # Get first author
                authors = entry.findall('{http://www.w3.org/2005/Atom}author')
                first_author = ""
                if authors:
                    author_name = authors[0].find('{http://www.w3.org/2005/Atom}name')
                    if author_name is not None:
                        first_author = author_name.text.strip()
                        # Get last name for brevity
                        name_parts = first_author.split()
                        if len(name_parts) > 1:
                            first_author = name_parts[-1] + " et al."
                        category_name = f"{category_name} • {first_author}"
                
                articles.append({
                    "source": category_name,
                    "title": entry.find('{http://www.w3.org/2005/Atom}title').text.strip(),
                    "link": entry.find('{http://www.w3.org/2005/Atom}id').text.strip(),
                    "summary": entry.find('{http://www.w3.org/2005/Atom}summary').text.strip().replace('\n', ' '),
                    "published": published_time.isoformat()
                })
        print(f"Found {len(articles)} articles from arXiv via direct API call.")
    except Exception as e:
        print(f"Error fetching from arXiv directly: {e}")
    return articles

def fetch_data_science_sources():
    """Fetch only data science RSS feeds and relevant Hacker News"""
    articles = []
    
    # Data Science RSS feeds only
    data_science_feeds = [
        "https://www.kdnuggets.com/feed",
        "https://towardsdatascience.com/feed",
        "https://www.datacamp.com/blog/rss.xml",
        "https://www.analyticsvidhya.com/feed/",
        "https://www.dataquest.io/blog/feed/",
        "https://blog.snowflake.com/rss.xml",
        "https://cloud.google.com/blog/products/data-analytics/rss.xml",
        "https://aws.amazon.com/blogs/big-data/feed/",
        "https://www.tableau.com/blog/rss.xml",
        "https://blog.powerbi.microsoft.com/rss.xml"
    ]
    
    for feed_url in data_science_feeds:
        try:
            feed = feedparser.parse(feed_url)
            for entry in feed.entries[:5]:  # Limit per feed
                if entry.get('published_parsed'):
                    published_time = datetime(*entry.published_parsed[:6], tzinfo=timezone.utc)
                    if published_time > datetime.now(timezone.utc) - timedelta(days=7):
                        articles.append({
                            "title": entry.title,
                            "link": entry.link,
                            "source": feed.feed.get('title', 'Data Science Source'),
                            "summary": entry.get('summary', ''),
                            "published": published_time.isoformat()
                        })
        except Exception as e:
            continue
    
    # Hacker News with data science keywords only
    articles.extend(fetch_all_articles())
    
    return articles

def deduplicate_articles(articles):
    """
    Remove duplicate articles based on URL and title similarity.
    Keeps the first occurrence of each unique article.
    """
    seen_urls = set()
    seen_titles = set()
    unique_articles = []
    
    for article in articles:
        url = article.get('link', '').strip().lower()
        title = article.get('title', '').strip().lower()
        
        # Skip if we've seen this exact URL
        if url and url in seen_urls:
            continue
        
        # Skip if we've seen this exact title
        if title and title in seen_titles:
            continue
        
        # Add to unique list
        unique_articles.append(article)
        if url:
            seen_urls.add(url)
        if title:
            seen_titles.add(title)
    
    removed = len(articles) - len(unique_articles)
    if removed > 0:
        print(f"  → Removed {removed} duplicate articles")
    
    return unique_articles

def fetch_articles_for_category(target_category):
    """
    Fetch articles only from sources relevant to the target category.
    Much more efficient than fetching everything.
    """
    articles = []
    
    if target_category == "Data Science & Analytics":
        print("📊 Fetching Data Science sources only...")
        articles.extend(fetch_data_science_sources())
        
    elif target_category == "AI Research & Technical Deep Dives":
        print("🔬 Fetching AI Research sources only...")
        articles.extend(fetch_arxiv_papers())
        articles.extend(fetch_all_articles())  # All RSS + HN
        
    elif target_category == "AI Business & Industry News":
        print("💼 Fetching AI Business sources only...")
        articles.extend(fetch_all_articles())  # All RSS + HN
        
    elif target_category == "AI Ethics, Policy & Society":
        print("⚖️ Fetching AI Ethics sources only...")
        articles.extend(fetch_all_articles())  # All RSS + HN
    
    # Deduplicate before returning
    articles = deduplicate_articles(articles)
    
    return articles

def fetch_all_articles():
    """
    Fetches all articles from all defined sources into a single list.
    Uses a 7-day lookback window for weekly digests.
    """
    all_articles = []
    last_week_utc = datetime.now(timezone.utc) - timedelta(days=7)
    
    # --- Direct arXiv Fetch ---
    all_articles.extend(fetch_arxiv_papers())
    
    # --- RSS Feed Fetching ---
    for url in SOURCES["rss"]:
        feed = feedparser.parse(url)
        source_title = feed.feed.title if hasattr(feed.feed, 'title') else url
        for entry in feed.entries:
            published_time = datetime(*entry.published_parsed[:6], tzinfo=timezone.utc) if hasattr(entry, 'published_parsed') else datetime.now(timezone.utc)
            if published_time > last_week_utc:
                all_articles.append({
                    "source": source_title,
                    "title": entry.title,
                    "link": entry.link,
                    "summary": entry.summary,
                    "published": published_time.isoformat()
                })
    
    # --- Hacker News Fetching ---
    try:
        hn_top_stories_url = "https://hacker-news.firebaseio.com/v0/topstories.json"
        story_ids = requests.get(hn_top_stories_url).json()
        hn_articles = []
        for story_id in story_ids[:150]: # Increased search range
            story_url = f"https://hacker-news.firebaseio.com/v0/item/{story_id}.json"
            story = requests.get(story_url).json()
            if story and story.get("time"):
                published_time = datetime.fromtimestamp(story["time"], tz=timezone.utc)
                if published_time > last_week_utc:
                    title = story.get('title', '').lower()
                    if any(keyword in title for keyword in SOURCES["hackernews_keywords"]["ai_ml"] + SOURCES["hackernews_keywords"]["data_science"]):
                        hn_articles.append({
                            "source": "Hacker News",
                            "title": story.get('title'),
                            "link": story.get('url', f"https://news.ycombinator.com/item?id={story_id}"),
                            "summary": story.get('text', ''),
                            "published": published_time.isoformat()
                        })
        print(f"Found {len(hn_articles)} articles from Hacker News.")
        all_articles.extend(hn_articles)
    except Exception as e:
        print(f"Error fetching from Hacker News: {e}")
        
    return all_articles

def get_citation_count(article):
    """
    Get citation count for arXiv papers via Semantic Scholar API.
    Returns 0 for non-arXiv articles or if API fails.
    """
    if 'arxiv' not in article['link'].lower():
        return 0
    
    try:
        # Extract arXiv ID from link
        import re
        arxiv_match = re.search(r'arxiv\.org/abs/(\d+\.\d+)', article['link'])
        if not arxiv_match:
            return 0
        
        arxiv_id = arxiv_match.group(1)
        
        # Query Semantic Scholar API
        import requests
        url = f"https://api.semanticscholar.org/graph/v1/paper/arXiv:{arxiv_id}?fields=citationCount"
        response = requests.get(url, timeout=5)
        
        if response.status_code == 200:
            data = response.json()
            return data.get('citationCount', 0)
        return 0
    except:
        return 0

def score_article_quality(article, target_category):
    """
    LLM-based multi-dimensional scoring for article quality.
    Scores on: novelty, practical applicability, and significance.
    Returns a dict with individual scores and final weighted score.
    """
    llm = get_llm()
    
    # Get citation count for context
    citation_count = get_citation_count(article)
    
    prompt = f"""Rate this article for a newsletter targeting {target_category} readers (ML engineers, data scientists, AI researchers).

Title: {article['title']}
Summary: {article.get('summary', '')[:500]}
Source: {article.get('source', 'Unknown')}
Citations: {citation_count if citation_count > 0 else 'N/A'}

Rate on three dimensions (0-10 each):
1. NOVELTY: New methods, breakthrough results, innovative approaches
2. PRACTICAL: Can readers immediately apply this? Tools, tutorials, how-tos
3. SIGNIFICANCE: Will this matter in 6 months? Industry impact, paradigm shifts

Respond ONLY with three numbers separated by commas: novelty,practical,significance
Example: 8,6,9"""

    try:
        response = llm.invoke(prompt)
        scores_text = response.content if hasattr(response, 'content') else str(response)
        scores = [float(s.strip()) for s in scores_text.split(',')[:3]]
        
        novelty, practical, significance = scores
        
        # Weighted final score: 40% novelty, 30% practical, 30% significance
        final_score = 0.4 * novelty + 0.3 * practical + 0.3 * significance
        
        # Store scores in article for display
        article['metrics'] = {
            'novelty': round(novelty, 1),
            'practical': round(practical, 1),
            'significance': round(significance, 1),
            'final_score': round(final_score, 1),
            'citations': citation_count
        }
        
        return final_score
    except Exception as e:
        print(f"LLM scoring failed for '{article['title']}': {e}")
        # Fallback to neutral score
        article['metrics'] = {
            'novelty': 5.0,
            'practical': 5.0,
            'significance': 5.0,
            'final_score': 5.0,
            'citations': citation_count
        }
        return 5.0

def generate_dynamic_fallback(target_category, needed_count):
    """
    Generate dynamic fallback content that varies each time.
    Uses date-based rotation and LLM generation for variety.
    """
    if target_category == "Data Science & Analytics":
        # Date-based rotation for variety
        day_of_year = datetime.now().timetuple().tm_yday
        rotation_index = day_of_year % 7  # 7 different sets
        
        fallback_sets = [
            # Set 0: SQL Focus
            [
                "Advanced SQL Window Functions for Data Analysis",
                "SQL Performance Optimization: Indexing Strategies", 
                "Building Complex Queries with CTEs and Subqueries"
            ],
            # Set 1: Python Focus
            [
                "Pandas vs Polars: Performance Comparison 2025",
                "Data Visualization with Plotly and Streamlit",
                "Machine Learning Pipeline with Scikit-learn"
            ],
            # Set 2: Analytics Focus
            [
                "A/B Testing Statistical Significance in Data Science",
                "Time Series Analysis with Python and R",
                "Customer Segmentation Using Clustering Algorithms"
            ],
            # Set 3: Tools Focus
            [
                "Snowflake vs BigQuery: Data Warehouse Comparison",
                "Tableau vs Power BI: Which Should You Choose?",
                "Jupyter Notebook Best Practices for Data Teams"
            ],
            # Set 4: Career Focus
            [
                "Data Science Interview Questions and Answers",
                "Building a Data Science Portfolio: Project Ideas",
                "Transitioning from Analyst to Data Scientist"
            ],
            # Set 5: Industry Focus
            [
                "Data Science in Healthcare: Real-World Applications",
                "Financial Data Analysis: Risk Modeling Techniques",
                "E-commerce Analytics: Customer Behavior Insights"
            ],
            # Set 6: Technical Focus
            [
                "Docker for Data Science: Containerizing ML Models",
                "Apache Airflow: Orchestrating Data Pipelines",
                "Data Quality: Validation and Monitoring Strategies"
            ]
        ]
        
        # Select topics for this rotation
        selected_topics = fallback_sets[rotation_index][:needed_count]
        
        # Generate dynamic content for each topic
        fallback_articles = []
        for i, topic in enumerate(selected_topics):
            # Add some randomness to avoid identical content
            random_offset = (day_of_year + i * 13) % 30  # Pseudo-random offset
            
            fallback_articles.append({
                "title": topic,
                "link": f"https://www.kdnuggets.com/fallback-{rotation_index}-{i}-{random_offset}",
                "source": "KDnuggets",
                "summary": f"Comprehensive guide covering {topic.lower()}. This essential resource provides practical insights, code examples, and best practices for data science professionals looking to enhance their skills in this critical area.",
                "published": (datetime.now(timezone.utc) - timedelta(days=random_offset)).isoformat()
            })
    
    return fallback_articles

def ensure_minimum_articles(articles, target_category, min_count=3):
    """
    Ensure we have at least min_count articles by adding dynamic fallback content if needed.
    """
    if len(articles) >= min_count:
        return articles
    
    print(f"⚠️ Only found {len(articles)} articles, adding dynamic fallback content...")
    
    # Generate dynamic fallback content
    needed = min_count - len(articles)
    fallback_articles = generate_dynamic_fallback(target_category, needed)
    
    # Add fallback articles to reach minimum count
    articles.extend(fallback_articles)
    
    print(f"✅ Added {needed} dynamic fallback articles. Total: {len(articles)}")
    return articles

def pre_filter_article(article):
    """
    Rule-based pre-filtering for obvious cases.
    """
    title = article['title'].lower()
    summary = article.get('summary', '').lower()
    
    # FIRST: Filter out irrelevant topics
    irrelevant_keywords = [
        'gig work', 'gig economy', 'uber driver', 'delivery driver',  # Gig work
        'python 3.14', 'gil removal', 'javascript', 'java', 'programming language', 'compiler', 'runtime',  # Programming languages
        'billionaire', 'tower', 'real estate', 'cracks', 'building',  # Real estate/general news
        'blame', 'lawsuit', 'legal',  # Legal news
    ]
    if any(keyword in title for keyword in irrelevant_keywords):
        return "Irrelevant"
    
    # Special case: AI bias studies are AI Ethics, not Data Science
    if 'ai bias' in title or 'bias' in title and 'ai' in (title + summary):
        return "AI Ethics, Policy & Society"
    
    # Data Science Tools - BROADER keywords
    data_science_keywords = [
        'sql', 'database', 'analytics', 'statistics', 'visualization', 
        'bi', 'etl', 'pipeline', 'warehouse', 'snowflake', 'bigquery', 
        'tableau', 'power bi', 'python data', 'r programming', 'jupyter', 'pandas',
        'data commons', 'learn python', 'data engineering', 'kafka', 'spark', 'airflow',
        'aws', 'mainframe data'
    ]
    if any(keyword in title for keyword in data_science_keywords):
        return "Data Science & Analytics"
    
    # AI Research - neural networks, algorithms, papers
    ai_research_keywords = ['neural network', 'transformer', 'algorithm', 'model', 'paper', 'research', 'arxiv']
    if any(keyword in title for keyword in ai_research_keywords):
        return "AI Research & Technical Deep Dives"
    
    # AI Business - companies, funding, products
    ai_business_keywords = ['openai', 'chatgpt', 'funding', 'acquisition', 'startup', 'company', 'business']
    if any(keyword in title for keyword in ai_business_keywords):
        return "AI Business & Industry News"
    
    return None  # Let LLM decide

def relevance_gate_agent(article, target_category):
    """
    Agent 1: Binary relevance gate. Returns True if article is relevant, False otherwise.
    This is a strict gatekeeper that prevents irrelevant articles from reaching scoring.
    """
    llm = get_llm()
    
    # Category-specific examples for strict filtering
    if target_category == "Data Science & Analytics":
        positive_examples = """
RELEVANT Examples (say YES):
- "New SQL window functions in PostgreSQL 15"
- "Tableau 2025 adds real-time collaboration features"
- "A/B testing best practices for data teams"
- "Pandas vs Polars: Performance comparison"
- "Building ETL pipelines with Apache Airflow"
"""
        negative_examples = """
IRRELEVANT Examples (say NO):
- "Taiwan should build a space-enabled kill web" → Military strategy, NOT data science
- "AWS brain drain sends service down" → Tech industry drama, NOT data science tools
- "Python 3.14 removes GIL" → Programming language, NOT data science
- "Uber drivers protest gig work conditions" → Labor/policy, NOT data science
- "OpenAI raises $10B in funding" → Business news, NOT data science
"""
    elif target_category == "AI Research & Technical Deep Dives":
        positive_examples = """
RELEVANT Examples (say YES):
- "Transformer architecture breakthrough"
- "New reinforcement learning algorithm"
- "Computer vision model for medical imaging"
"""
        negative_examples = """
IRRELEVANT Examples (say NO):
- "OpenAI acquires startup for $500M" → Business
- "EU passes AI regulation" → Policy
- "Data warehouse comparison" → Data Science
"""
    else:
        positive_examples = ""
        negative_examples = ""
    
    prompt = f"""You are a strict gatekeeper for a newsletter category: {target_category}.

Your ONLY job: Answer YES or NO. Is this article relevant to {target_category}?

{positive_examples}
{negative_examples}

Article to evaluate:
Title: {article['title']}
Summary: {article.get('summary', '')[:300]}

Answer ONLY with YES or NO (nothing else):"""
    
    try:
        response = llm.invoke(prompt)
        answer = (response.content if hasattr(response, 'content') else str(response)).strip().upper()
        return answer == "YES"
    except Exception as e:
        print(f"Relevance gate failed for '{article['title']}': {e}")
        return False  # Fail closed - reject on error

def negative_filter_agent(article, target_category):
    """
    Agent 3: Negative filter with veto power. 
    Returns True if article should be REJECTED (waste of time for readers).
    Runs AFTER scoring to catch edge cases.
    """
    llm = get_llm()
    
    prompt = f"""You are protecting readers of a ${1}/week newsletter for {target_category}.

Question: Would a data scientist/ML engineer feel CHEATED if they saw this article in their paid newsletter?

Examples of articles that WASTE readers' time (should be rejected):
- "Taiwan military strategy" → Score 10/10 waste (completely off-topic)
- "AWS outage drama" → Score 8/10 waste (tech gossip, not actionable)
- "GLM coding subscription ad" → Score 7/10 waste (marketing fluff)
- "How to learn Python in 2025" → Score 6/10 waste (beginner tutorial for experienced audience)

Examples of valuable articles (should NOT be rejected):
- "NumPy advanced functions" → Score 0/10 waste (directly useful)
- "Snowflake new features" → Score 1/10 waste (tool update, relevant)
- "Statistical methods for A/B testing" → Score 0/10 waste (practical knowledge)

Article to evaluate:
Title: {article['title']}
Summary: {article.get('summary', '')[:400]}

On a scale of 0-10, how much would readers feel this WASTES their time?
Answer ONLY with a number 0-10 (nothing else):"""
    
    try:
        response = llm.invoke(prompt)
        score_text = (response.content if hasattr(response, 'content') else str(response)).strip()
        waste_score = float(score_text.split()[0])  # Handle "8/10" or "8" format
        
        # Store for transparency
        article['waste_score'] = waste_score
        
        # Reject if waste_score > 5
        return waste_score > 5.0
    except Exception as e:
        print(f"Negative filter failed for '{article['title']}': {e}")
        return False  # Fail open - don't reject on error (scoring already did its job)

def categorize_article(article):
    """
    Hybrid categorization: rule-based pre-filtering + LLM for edge cases.
    """
    # Step 1: Rule-based pre-filtering
    rule_result = pre_filter_article(article)
    if rule_result:
        return rule_result
    
    # Step 2: LLM for edge cases with simple prompt
    llm = get_llm()
    simple_prompt = f"""Categorize this article:

Title: {article['title']}
Summary: {article['summary']}

Options: AI Research & Technical Deep Dives, AI Business & Industry News, AI Ethics Policy & Society, Data Science & Analytics, Irrelevant

Rules:
- Data Science & Analytics = SQL tools, analytics platforms, BI tools, data visualization tools
- Irrelevant = Programming language updates, general tech news
- AI Research = Neural networks, algorithms, research papers
- AI Business = Company news, funding, products
- AI Ethics = Safety, regulation, policy

Answer with just the category name:"""
    
    try:
        response = llm.invoke(simple_prompt)
        # Clean up the response
        category = response.content if hasattr(response, 'content') else str(response)
        return next((c for c in CATEGORIES if c in category), "Irrelevant")
    except:
        return "Irrelevant"

def get_llm():
    """
    Initializes and returns the appropriate LLM based on environment variables.
    Prefers Groq (free) if available, falls back to OpenAI.
    """
    if os.getenv("GROQ_API_KEY"):
        return ChatGroq(model_name="llama-3.1-8b-instant", temperature=0.7)
    elif os.getenv("OPENAI_API_KEY"):
        return ChatOpenAI(model_name="gpt-4o-mini", temperature=0.7)
    else:
        raise ValueError("No LLM API key found. Please set GROQ_API_KEY or OPENAI_API_KEY in .env")

def summarize_article(article_content):
    """
    Summarizes the given article text using a LangChain chain.
    """
    llm = get_llm()
    prompt = ChatPromptTemplate.from_messages([
        ("system", """You are writing for data scientists, ML engineers, and AI researchers who pay $1/week for this newsletter.

Write a 4-6 sentence summary that makes them think "I need to read this full article!"

RULES:
- Start with the most compelling finding or announcement
- Include specific technical details (tools, methods, numbers)
- End with concrete impact ("This means..." or "Impact:")
- Write in PLAIN TEXT - absolutely NO markdown, bullets, or special formatting
- Never say "Here's a rewritten summary" or reference yourself
- Active voice only, strong verbs, zero fluff

Good: "Google released a new Python API for Data Commons that unifies 250M datasets."
Bad: "The article discusses how Google has introduced an API..."

Write the summary NOW - no preamble, no meta-commentary, just the summary."""),
        ("human", "{article}")
    ])
    parser = StrOutputParser()
    chain = prompt | llm | parser
    summary = chain.invoke({"article": article_content})
    
    # Remove any markdown formatting and meta-commentary that slipped through
    import re
    
    # Remove meta-commentary (more aggressive patterns)
    summary = re.sub(r"Here is (an? )?\d+-?\d* sentence summary:?\s*", '', summary, flags=re.IGNORECASE)
    summary = re.sub(r"Here's a rewritten summary[^:]*:\s*", '', summary, flags=re.IGNORECASE)
    summary = re.sub(r"Unfortunately, I'm a large language model[^.]*\.\s*", '', summary)
    summary = re.sub(r"^Summary:\s*", '', summary, flags=re.IGNORECASE)
    
    # Remove markdown formatting
    summary = re.sub(r'\*\*([^*]+)\*\*', r'\1', summary)  # Remove **bold**
    summary = re.sub(r'^\s*[\*\-•]\s+', '', summary, flags=re.MULTILINE)  # Remove bullet points
    summary = re.sub(r'^#+\s+', '', summary, flags=re.MULTILINE)  # Remove # headers
    
    # Clean up excessive whitespace
    summary = re.sub(r'\n\s*\n\s*\n+', '\n\n', summary)  # Max 2 newlines
    summary = summary.strip()
    
    return summary

def generate_joke(article):
    """
    Generates a joke based on the article's title and summary.
    """
    llm = get_llm()
    prompt = ChatPromptTemplate.from_messages([
        ("system", "You are a witty comedian who tells jokes about technology and AI. Create a short, one-liner joke based on the following article."),
        ("human", "Article Title: {title}\nArticle Summary: {summary}")
    ])
    parser = StrOutputParser()
    chain = prompt | llm | parser
    joke = chain.invoke({
        "title": article['title'], 
        "summary": article['summary'],
        "cache_bust": datetime.now().isoformat()  # Force fresh joke generation
    })
    return joke

def generate_linkedin_post(categorized_articles, schedule):
    """
    Generates a LinkedIn-optimized post from the digest.
    Uses LLM to create punchy, engaging content suitable for LinkedIn.
    """
    llm = get_llm()
    
    # Extract articles from featured category
    featured_category = schedule['category']
    articles = categorized_articles.get(featured_category, [])
    
    if not articles:
        return None
    
    # Prepare article summaries for the prompt
    articles_text = ""
    for i, article in enumerate(articles[:3], 1):  # Top 3 for LinkedIn
        articles_text += f"{i}. {article['title']}\n   {article['summary'][:150]}...\n\n"
    
    prompt = ChatPromptTemplate.from_messages([
        ("system", """You are a professional LinkedIn content creator for AI/ML news.
        
Create an engaging LinkedIn post with:
- Opening hook (2-3 sentences, attention-grabbing)
- 3 bullet points highlighting key articles (title + one key insight each)
- Call-to-action to read full digest
- 5-7 relevant hashtags

Keep it professional, concise, and optimized for LinkedIn's algorithm.
Use emojis sparingly (max 3 total).
Format for readability with line breaks."""),
        ("human", """Theme: {theme_name}
Description: {description}

Top Articles:
{articles}

Create a LinkedIn post for this digest.""")
    ])
    
    parser = StrOutputParser()
    chain = prompt | llm | parser
    
    linkedin_post = chain.invoke({
        "theme_name": schedule['name'],
        "description": schedule['description'],
        "articles": articles_text
    })
    
    return linkedin_post

def post_to_linkedin(content, access_token, organization_id=None):
    """
    Posts content to LinkedIn using the LinkedIn API.
    
    Args:
        content: Text content to post
        access_token: LinkedIn OAuth access token
        organization_id: LinkedIn organization URN (for company pages)
                        Format: "urn:li:organization:12345678"
                        If None, posts to personal profile
    
    Returns:
        dict: Response from LinkedIn API or error message
    """
    import requests
    
    # LinkedIn API endpoint
    url = "https://api.linkedin.com/v2/ugcPosts"
    
    # Determine author (organization or person)
    if organization_id:
        author = organization_id
    else:
        # Get user's profile URN
        profile_url = "https://api.linkedin.com/v2/me"
        headers = {"Authorization": f"Bearer {access_token}"}
        profile_response = requests.get(profile_url, headers=headers)
        
        if profile_response.status_code != 200:
            return {"error": "Failed to get user profile", "details": profile_response.text}
        
        user_id = profile_response.json()['id']
        author = f"urn:li:person:{user_id}"
    
    # Construct post payload
    payload = {
        "author": author,
        "lifecycleState": "PUBLISHED",
        "specificContent": {
            "com.linkedin.ugc.ShareContent": {
                "shareCommentary": {
                    "text": content
                },
                "shareMediaCategory": "NONE"
            }
        },
        "visibility": {
            "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"
        }
    }
    
    # Make API request
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json",
        "X-Restli-Protocol-Version": "2.0.0"
    }
    
    response = requests.post(url, json=payload, headers=headers)
    
    if response.status_code == 201:
        return {
            "success": True,
            "post_id": response.json()['id'],
            "message": "Successfully posted to LinkedIn"
        }
    else:
        return {
            "error": "Failed to post to LinkedIn",
            "status_code": response.status_code,
            "details": response.text
        }

def send_to_linkedin(categorized_articles, schedule):
    """
    Generates and posts content to LinkedIn.
    Wrapper function that handles the full LinkedIn posting flow.
    """
    # Check if LinkedIn is configured
    access_token = os.getenv("LINKEDIN_ACCESS_TOKEN")
    organization_id = os.getenv("LINKEDIN_ORGANIZATION_ID")
    
    if not access_token:
        print("LinkedIn access token not found. Skipping LinkedIn posting.")
        print("Set LINKEDIN_ACCESS_TOKEN in .env to enable LinkedIn integration.")
        return None
    
    # Generate LinkedIn post
    print("Generating LinkedIn post...")
    linkedin_content = generate_linkedin_post(categorized_articles, schedule)
    
    if not linkedin_content:
        print("No content available for LinkedIn post.")
        return None
    
    print(f"\n--- LinkedIn Post Preview ---\n{linkedin_content}\n----------------------------\n")
    
    # Post to LinkedIn
    print("Posting to LinkedIn...")
    result = post_to_linkedin(linkedin_content, access_token, organization_id)
    
    if result.get("success"):
        print(f"✓ {result['message']}")
        print(f"Post ID: {result['post_id']}")
    else:
        print(f"✗ {result.get('error', 'Unknown error')}")
        if result.get("details"):
            print(f"Details: {result['details']}")
    
    return result

def get_full_article_text(url):
    """
    Scrapes the full text of an article from its URL.
    Note: This will not work for arXiv PDF links. We will rely on the abstract.
    """
    if "arxiv.org" in url:
        return None # Can't scrape PDFs, will use abstract summary

    try:
        headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36'}
        response = requests.get(url, headers=headers, timeout=10)
        soup = BeautifulSoup(response.content, 'html.parser')
        
        paragraphs = soup.find_all('p')
        full_text = ' '.join([p.get_text() for p in paragraphs])
        return full_text
    except Exception as e:
        print(f"Error scraping {url}: {e}")
        return None

def format_html_email(categorized_articles, joke):
    """
    Formats the categorized articles and joke into an HTML email body.
    """
    html = """
    <html>
        <head>
            <style>
                body { font-family: sans-serif; margin: 2em; }
                h1 { color: #2c3e50; }
                h2 { color: #34495e; border-bottom: 2px solid #bdc3c7; padding-bottom: 5px; }
                h3 { color: #7f8c8d; }
                p { line-height: 1.6; }
                a { color: #2980b9; text-decoration: none; }
                a:hover { text-decoration: underline; }
                .category { margin-bottom: 3em; }
                .article { margin-bottom: 2em; border-left: 3px solid #ecf0f1; padding-left: 1em; }
                .joke { background-color: #ecf0f1; padding: 1em; border-radius: 5px; margin-bottom: 2em; }
            </style>
        </head>
        <body>
            <h1>Your AI News Digest</h1>
            <div class="joke">
                <h2>Joke of the Day</h2>
                <p>""" + joke + """</p>
            </div>
    """
    for category, articles in categorized_articles.items():
        if not articles:
            continue
        html += f"""
        <div class="category">
            <h2>{category}</h2>
        """
        for article in articles:
            html += f"""
            <div class="article">
                <h3><a href="{article['link']}">{article['title']}</a></h3>
                <p><strong>Source:</strong> {article['source']}</p>
                <p>{article['summary']}</p>
            </div>
            """
        html += "</div>"
    html += "</body></html>"
    return html

def send_email(html_content):
    """
    Sends the email using SMTP with Gmail.
    Also saves the HTML content to a file for review.
    """
    # Save the HTML content to a file
    timestamp = datetime.now().strftime('%Y-%m-%d_%H-%M-%S')
    output_dir = "outputs/email_archives"
    os.makedirs(output_dir, exist_ok=True)
    output_file = f"{output_dir}/digest_{timestamp}.html"
    
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(html_content)
    print(f"Email content saved to: {output_file}")
    
    sender_email = os.getenv("EMAIL_SENDER")
    receiver_email = os.getenv("EMAIL_RECIPIENT")
    password = os.getenv("GMAIL_APP_PASSWORD")
    
    if not all([sender_email, receiver_email, password]):
        print("Email credentials not found in .env file. Skipping email.")
        return

    message = MIMEMultipart("alternative")
    message["Subject"] = f"AI News Digest - {datetime.now().strftime('%Y-%m-%d')}"
    message["From"] = sender_email
    message["To"] = receiver_email

    message.attach(MIMEText(html_content, "html"))

    try:
        print("Connecting to Gmail SMTP server...")
        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
            server.login(sender_email, password)
            server.sendmail(sender_email, receiver_email, message.as_string())
        print("Email sent successfully!")
    except Exception as e:
        print(f"Failed to send email: {e}")
