"""
ReACT Agents with Tool Use (LangChain 1.0)

Implements reasoning + acting pattern for article quality assessment.
Uses external tools to verify claims and gather context.
"""

import os
from typing import Dict, Tuple, List
from langchain.agents.factory import create_agent
import requests


def web_search(query: str) -> str:
    """Search the web for information about articles, topics, or claims.
    
    Args:
        query: Search query string
        
    Returns:
        Top search results with snippets
    """
    try:
        from ddgs import DDGS
        
        with DDGS() as ddgs:
            results = list(ddgs.text(query, max_results=3))
            
        if not results:
            return "No search results found"
        
        output = []
        for i, result in enumerate(results, 1):
            output.append(f"{i}. {result['title']}")
            output.append(f"   {result['body'][:200]}...")
        
        return "\n".join(output)
        
    except Exception as e:
        return f"Web search failed: {str(e)}"


def citation_lookup(paper_title: str) -> str:
    """Look up citation count for academic papers using Semantic Scholar API.
    
    Args:
        paper_title: Paper title or arXiv ID
        
    Returns:
        Citation count and basic paper info
    """
    try:
        base_url = "https://api.semanticscholar.org/graph/v1/paper/search"
        params = {"query": paper_title, "limit": 1, "fields": "citationCount,title,year"}
        
        response = requests.get(base_url, params=params, timeout=10)
        response.raise_for_status()
        
        data = response.json()
        if data.get('data'):
            paper = data['data'][0]
            return (
                f"Found: '{paper['title']}' ({paper.get('year', 'N/A')})\n"
                f"Citations: {paper.get('citationCount', 0)}"
            )
        else:
            return "No paper found with that title"
            
    except Exception as e:
        return f"Citation lookup failed: {str(e)}"


def trend_check(topic: str) -> str:
    """Check if a topic is trending by looking at recent coverage.
    
    Args:
        topic: Topic to check
        
    Returns:
        Trend status with mention count
    """
    try:
        from ddgs import DDGS
        
        recent_query = f"{topic} latest news 2025"
        
        with DDGS() as ddgs:
            results = list(ddgs.text(recent_query, max_results=10))
        
        mention_count = len(results)
        
        if mention_count > 7:
            return f"Topic '{topic}' is TRENDING ({mention_count} recent mentions in top results)"
        elif mention_count > 4:
            return f"Topic '{topic}' has moderate coverage ({mention_count} recent mentions)"
        else:
            return f"Topic '{topic}' has limited recent coverage ({mention_count} mentions)"
            
    except Exception as e:
        return f"Trend check failed: {str(e)}"


def score_article_with_react(article: Dict, target_category: str, llm) -> Tuple[float, List]:
    """
    Score article quality using ReACT agent with tool use.
    
    Args:
        article: Article dict with title and summary
        target_category: Target newsletter category
        llm: Language model instance
        
    Returns:
        (score, reasoning_trail) tuple
    """
    try:
        # Create ReACT agent with tools
        tools = [web_search, citation_lookup, trend_check]
        
        system_prompt = f"""You are a quality assessment agent for a {target_category} newsletter.

Your job: Evaluate if this article is high-quality and suitable for technical readers who pay $1/week.

USE YOUR TOOLS to verify claims and assess impact:
- web_search: Verify "breakthrough" claims, check if topic is covered by major outlets
- citation_lookup: Check research paper impact (high citations = high impact)
- trend_check: Assess if topic is timely and relevant

SCORING CRITERIA (0-10 scale):
- Novelty: Is this new information or rehashed content?
- Practical: Can readers immediately use this?
- Significance: Will this matter in 6 months?

BE SKEPTICAL of:
- Marketing claims without evidence
- "Breakthrough" without external validation
- Papers with 0 citations published yesterday

After using tools, provide a final score from 0-10 with brief reasoning."""

        agent = create_agent(
            model=llm,
            tools=tools,
            system_prompt=system_prompt
        )
        
        # Create query
        query = f"""Evaluate this article:

Title: {article['title']}
Summary: {article.get('summary', '')[:500]}
Source: {article.get('source', 'Unknown')}

Use your tools to verify claims and assess quality. Then provide a score from 0-10."""
        
        # Run agent
        result = agent.invoke({"messages": [{"role": "user", "content": query}]})
        
        # Extract final message
        messages = result.get('messages', [])
        if not messages:
            return 5.0, ["No response from agent"]
        
        final_message = messages[-1]
        final_answer = final_message.content if hasattr(final_message, 'content') else str(final_message)
        
        # Extract reasoning trail from tool calls
        reasoning_trail = []
        for msg in messages:
            if hasattr(msg, 'tool_calls') and msg.tool_calls:
                for tool_call in msg.tool_calls:
                    reasoning_trail.append(f"Tool: {tool_call.get('name', 'unknown')}")
            if hasattr(msg, 'content') and 'ToolMessage' in str(type(msg)):
                reasoning_trail.append(f"Result: {msg.content[:100]}...")
        
        # Parse score from final answer
        score = 5.0  # Default
        try:
            import re
            numbers = re.findall(r'\b([0-9]|10)(?:\.\d+)?(?:/10)?\b', final_answer)
            if numbers:
                score = float(numbers[0])
                if score > 10:
                    score = score / 10
        except:
            pass
        
        return score, reasoning_trail
        
    except Exception as e:
        print(f"⚠️  ReACT scoring failed: {e}")
        # Fallback to simple scoring
        return 5.0, [f"ReACT agent failed: {str(e)}"]


def format_reasoning_trail(reasoning_trail: List) -> str:
    """
    Format ReACT reasoning trail for display.
    
    Args:
        reasoning_trail: List of reasoning steps
        
    Returns:
        Formatted string
    """
    if not reasoning_trail:
        return "No reasoning trail available"
    
    return "\n".join(f"  {step}" for step in reasoning_trail)
