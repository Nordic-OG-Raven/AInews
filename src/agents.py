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
        "http://www.semanticscholar.org/rss/daily" # Fallback for research papers
    ],
    "hackernews_keywords": ['ai', 'ml', 'llm', 'transformer', 'neural network', 'openai', 'deepmind', 'anthropic', 'pytorch', 'tensorflow', 'diffusion model', 'attention is all you need']
}

CATEGORIES = ["AI Research & Technical Deep Dives", "AI Business & Industry News", "AI Ethics, Policy & Society", "Irrelevant"]

def fetch_arxiv_papers():
    """
    Fetches papers directly from the arXiv API.
    """
    articles = []
    yesterday_utc = datetime.now(timezone.utc) - timedelta(days=2)
    
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

def fetch_all_articles():
    """
    Fetches all articles from all defined sources into a single list.
    """
    all_articles = []
    yesterday_utc = datetime.now(timezone.utc) - timedelta(days=1)
    
    # --- Direct arXiv Fetch ---
    all_articles.extend(fetch_arxiv_papers())
    
    # --- RSS Feed Fetching ---
    for url in SOURCES["rss"]:
        feed = feedparser.parse(url)
        source_title = feed.feed.title if hasattr(feed.feed, 'title') else url
        for entry in feed.entries:
            published_time = datetime(*entry.published_parsed[:6], tzinfo=timezone.utc) if hasattr(entry, 'published_parsed') else datetime.now(timezone.utc)
            if published_time > yesterday_utc:
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
                if published_time > yesterday_utc:
                    title = story.get('title', '').lower()
                    if any(keyword in title for keyword in SOURCES["hackernews_keywords"]):
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

def categorize_article(article):
    """
    Uses an LLM to assign an article to a predefined category.
    """
    llm = get_llm()
    prompt = ChatPromptTemplate.from_messages([
        ("system", f"You are an expert editor for an AI research newsletter. Your job is to categorize articles based on their title and summary. Please assign the following article to one of these categories: {', '.join(CATEGORIES)}. Respond with only the category name and nothing else."),
        ("human", "Title: {title}\nSummary: {summary}")
    ])
    parser = StrOutputParser()
    chain = prompt | llm | parser
    # Ensure we only process articles with content
    if not article['summary'] or len(article['summary'].strip()) < 20:
        return "Irrelevant"
        
    category = chain.invoke({"title": article['title'], "summary": article['summary']})
    # Clean up the response to match a category name exactly
    return next((c for c in CATEGORIES if c in category), "Irrelevant")

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
        ("system", """You are a professional tech newsletter writer creating summaries for paying subscribers.
        
Write direct, punchy summaries that get straight to the point. Focus on:
- What was developed/discovered/announced
- Key technical details and capabilities
- Practical implications and impact

Write in active voice. Start with the main finding or announcement, not "The article discusses" or "The paper presents".
Keep it 3-5 sentences. Make every word count."""),
        ("human", "{article}")
    ])
    parser = StrOutputParser()
    chain = prompt | llm | parser
    summary = chain.invoke({"article": article_content})
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
    joke = chain.invoke({"title": article['title'], "summary": article['summary']})
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
