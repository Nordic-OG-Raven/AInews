"""
Refresher of the Day - Educational content for the newsletter
"""
import yaml
import random
import json
from datetime import datetime
from pathlib import Path

REFRESHERS_FILE = Path(__file__).parent.parent / 'refreshers.yaml'
HISTORY_FILE = Path(__file__).parent.parent / 'data' / 'refresher_history.json'

def load_refreshers():
    """Load all refresher topics from YAML"""
    with open(REFRESHERS_FILE, 'r') as f:
        return yaml.safe_load(f)

def load_history():
    """Load history of shown refreshers"""
    if not HISTORY_FILE.exists():
        HISTORY_FILE.parent.mkdir(parents=True, exist_ok=True)
        return {}
    try:
        with open(HISTORY_FILE, 'r') as f:
            return json.load(f)
    except:
        return {}

def save_history(history):
    """Save updated history"""
    HISTORY_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(HISTORY_FILE, 'w') as f:
        json.dump(history, f, indent=2)

def get_refresher_for_category(category_map):
    """
    Select a refresher topic for the given category.
    Uses rotation to avoid showing same topic too soon.
    
    Args:
        category_map (dict): Maps newsletter categories to refresher categories
            e.g. {"AI Research & Technical Deep Dives": "ml_research"}
    
    Returns:
        dict: Refresher topic with name, why, misconception, explanation_prompt, source
    """
    refreshers = load_refreshers()
    history = load_history()
    
    # Map newsletter category to refresher category
    newsletter_category = list(category_map.keys())[0]
    refresher_category = category_map[newsletter_category]
    
    if refresher_category not in refreshers:
        return None
    
    topics = refreshers[refresher_category]
    
    # Get topics not shown recently (last 30 days)
    today = datetime.now().strftime('%Y-%m-%d')
    recent_topics = set(history.get(refresher_category, {}).get('recent', []))
    
    # Filter out recently shown topics
    available_topics = [t for t in topics if t['name'] not in recent_topics]
    
    # If all shown, reset (start rotation again)
    if not available_topics:
        available_topics = topics
        recent_topics = set()
    
    # Select random topic
    topic = random.choice(available_topics)
    
    # Update history
    if refresher_category not in history:
        history[refresher_category] = {'recent': [], 'last_shown': {}}
    
    recent_topics.add(topic['name'])
    history[refresher_category]['recent'] = list(recent_topics)[-20:]  # Keep last 20
    history[refresher_category]['last_shown'][topic['name']] = today
    
    save_history(history)
    
    return topic

def generate_refresher_explanation(topic, llm):
    """
    Generate explanation using LLM based on the topic's explanation_prompt.
    Returns a 2-3 sentence explanation suitable for the newsletter.
    """
    try:
        response = llm.invoke(topic['explanation_prompt'])
        explanation = response.content if hasattr(response, 'content') else str(response)
        return explanation.strip()
    except Exception as e:
        print(f"Failed to generate explanation for {topic['name']}: {e}")
        # Fallback to 'why' field
        return topic['why']

def format_refresher_html(topic, explanation):
    """
    Format refresher as HTML for email insertion.
    """
    html = f"""
    <div style="background-color: #f0fdf4; border-left: 4px solid #10b981; padding: 20px; margin: 20px 0; border-radius: 0 8px 8px 0;">
        <div style="color: #059669; font-weight: 600; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 10px;">
            🔄 Refresher: {topic['name']}
        </div>
        <div style="color: #374151; font-size: 14px; line-height: 1.6; margin-bottom: 12px;">
            {explanation}
        </div>
        <div style="background-color: #fef3c7; border-left: 3px solid #f59e0b; padding: 12px; margin-top: 12px; border-radius: 0 4px 4px 0;">
            <div style="color: #92400e; font-weight: 600; font-size: 12px; margin-bottom: 6px;">
                ⚠️ Common Misconception:
            </div>
            <div style="color: #78350f; font-size: 13px; line-height: 1.5;">
                {topic['misconception']}
            </div>
        </div>
        <div style="margin-top: 12px; font-size: 12px;">
            <a href="{topic['source']}" style="color: #059669; text-decoration: none;">
                📚 Learn more →
            </a>
        </div>
    </div>
    """
    return html

