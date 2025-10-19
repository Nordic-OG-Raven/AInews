"""
Configuration for the AI News Digest weekly schedule.
Each day focuses on a specific category with a catchy theme.
"""

WEEKLY_SCHEDULE = {
    "monday": {
        "name": "ML Monday",
        "category": "AI Research & Technical Deep Dives",
        "description": "Latest ML research, papers, and technical breakthroughs"
    },
    "wednesday": {
        "name": "ML Business Briefing",
        "category": "AI Business & Industry News",
        "description": "AI startups, funding, products, and industry moves"
    },
    "friday": {
        "name": "Ethics Friday",
        "category": "AI Ethics, Policy & Society",
        "description": "AI safety, regulation, societal impact, and policy debates"
    },
    "saturday": {
        "name": "Data Science Saturday",
        "category": "Data Science & Analytics",
        "description": "Data science, analytics, SQL, statistics, and practical data insights"
    }
}

# Map categories to their schedule day for reverse lookup
CATEGORY_TO_DAY = {
    "AI Research & Technical Deep Dives": "monday",
    "AI Business & Industry News": "wednesday", 
    "AI Ethics, Policy & Society": "friday",
    "Data Science & Analytics": "saturday"
}

def get_schedule_for_day(day_name):
    """
    Get the schedule configuration for a specific day.
    Returns None if no digest is scheduled for that day.
    """
    return WEEKLY_SCHEDULE.get(day_name.lower())

def get_all_categories():
    """
    Get all active categories from the weekly schedule.
    """
    return [schedule["category"] for schedule in WEEKLY_SCHEDULE.values()]

def get_current_day_schedule():
    """
    Get the schedule for today.
    """
    from datetime import datetime
    day_name = datetime.now().strftime('%A').lower()
    return get_schedule_for_day(day_name)

