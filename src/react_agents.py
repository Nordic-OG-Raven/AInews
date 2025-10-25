"""
ReACT Agents with Tool Use

Implements reasoning + acting pattern for article quality assessment.
Uses external tools to verify claims and gather context.
"""

import os
from typing import Dict, Optional
from langchain.agents import create_react_agent, AgentExecutor
from langchain.tools import Tool
from langchain_community.tools import DuckDuckGoSearchRun
from langchain_core.prompts import PromptTemplate
import requests


def create_web_search_tool() -> Tool:
    """
    Create web search tool using DuckDuckGo (no API key required).
    """
    try:
        search = DuckDuckGoSearchRun()
        return Tool(
            name="WebSearch",
            func=search.run,
            description="Search the web for information about articles, topics, or claims. "
                        "Input should be a search query string. "
                        "Returns top search results with snippets."
        )
    except Exception as e:
        print(f"⚠️  Web search tool unavailable: {e}")
        # Return dummy tool
        return Tool(
            name="WebSearch",
            func=lambda x: "Web search unavailable",
            description="Web search (currently unavailable)"
        )


def citation_lookup(query: str) -> str:
    """
    Look up citation count for academic papers using Semantic Scholar API.
    
    Args:
        query: Paper title or arXiv ID
    
    Returns:
        Citation count or error message
    """
    try:
        # Search Semantic Scholar
        base_url = "https://api.semanticscholar.org/graph/v1/paper/search"
        params = {"query": query, "limit": 1, "fields": "citationCount,title,year"}
        
        response = requests.get(base_url, params=params, timeout=10)
        response.raise_for_status()
        
        data = response.json()
        if data.get('data'):
            paper = data['data'][0]
            return (
                f"Found paper: '{paper['title']}' ({paper.get('year', 'N/A')})\n"
                f"Citations: {paper.get('citationCount', 0)}"
            )
        else:
            return "No paper found with that title"
            
    except Exception as e:
        return f"Citation lookup failed: {str(e)}"


def create_citation_tool() -> Tool:
    """
    Create citation lookup tool for academic papers.
    """
    return Tool(
        name="CitationLookup",
        func=citation_lookup,
        description="Look up citation count for academic papers. "
                    "Input should be a paper title or arXiv ID. "
                    "Returns citation count and basic paper info."
    )


def trend_check(topic: str) -> str:
    """
    Check if a topic is trending (simplified implementation).
    
    Note: Full implementation would use Google Trends API, but that requires setup.
    This version uses web search as a proxy for trendiness.
    
    Args:
        topic: Topic to check
    
    Returns:
        Trend status
    """
    try:
        search = DuckDuckGoSearchRun()
        recent_query = f"{topic} latest news 2025"
        results = search.run(recent_query)
        
        # Count mentions (very simple heuristic)
        result_count = len(results.split('\n'))
        
        if result_count > 10:
            return f"Topic '{topic}' appears to be trending (found {result_count} recent mentions)"
        elif result_count > 5:
            return f"Topic '{topic}' has moderate recent coverage ({result_count} mentions)"
        else:
            return f"Topic '{topic}' has limited recent coverage"
            
    except Exception as e:
        return f"Trend check failed: {str(e)}"


def create_trend_tool() -> Tool:
    """
    Create trend checking tool.
    """
    return Tool(
        name="TrendCheck",
        func=trend_check,
        description="Check if a topic is currently trending or getting recent coverage. "
                    "Input should be a topic name or keyword. "
                    "Returns trend status."
    )


def create_react_quality_agent(llm):
    """
    Create ReACT agent for quality assessment with tool use.
    
    Args:
        llm: Language model to use
    
    Returns:
        AgentExecutor that can reason and use tools
    """
    # Define tools
    tools = [
        create_web_search_tool(),
        create_citation_tool(),
        create_trend_tool()
    ]
    
    # Define ReACT prompt template
    template = """You are a quality assessment agent for a technical newsletter.
Your job is to evaluate if an article is high-quality and suitable for readers.

You have access to the following tools:

{tools}

Use the following format:

Question: the input question you must answer
Thought: you should always think about what to do
Action: the action to take, should be one of [{tool_names}]
Action Input: the input to the action
Observation: the result of the action
... (this Thought/Action/Action Input/Observation can repeat N times)
Thought: I now know the final answer
Final Answer: a quality score from 0-10 with brief reasoning

GUIDELINES:
- Use tools to verify claims (especially if article mentions "breakthrough" or specific numbers)
- Check citations for research papers (high citations = high impact)
- Check if topic is trending (trending = timely and relevant)
- Be skeptical of marketing claims
- Value novelty, practical applicability, and significance

Question: {input}

Thought: {agent_scratchpad}
"""
    
    prompt = PromptTemplate(
        template=template,
        input_variables=["input", "agent_scratchpad"],
        partial_variables={
            "tools": "\n".join([f"{tool.name}: {tool.description}" for tool in tools]),
            "tool_names": ", ".join([tool.name for tool in tools])
        }
    )
    
    # Create agent
    agent = create_react_agent(llm, tools, prompt)
    
    # Create executor
    agent_executor = AgentExecutor(
        agent=agent,
        tools=tools,
        verbose=False,  # Set to True for debugging
        max_iterations=5,
        handle_parsing_errors=True,
        return_intermediate_steps=True
    )
    
    return agent_executor


def score_article_with_react(article: Dict, target_category: str, llm) -> tuple[float, list]:
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
        # Create agent
        agent = create_react_quality_agent(llm)
        
        # Create query
        query = f"""Evaluate this article for a {target_category} newsletter:

Title: {article['title']}
Summary: {article.get('summary', '')[:500]}
Source: {article.get('source', 'Unknown')}

Score this article from 0-10 considering:
- Novelty: Is this new information or rehashed content?
- Practical: Can readers immediately use this?
- Significance: Will this matter in 6 months?

Use your tools to verify claims and assess impact."""
        
        # Run agent
        result = agent.invoke({"input": query})
        
        # Extract score from final answer
        final_answer = result.get('output', '0')
        reasoning_trail = result.get('intermediate_steps', [])
        
        # Parse score (handle various formats)
        score = 5.0  # Default
        try:
            # Try to extract number from answer
            import re
            numbers = re.findall(r'\d+\.?\d*', final_answer)
            if numbers:
                score = float(numbers[0])
                # Normalize to 0-10 if needed
                if score > 10:
                    score = score / 10
        except:
            pass
        
        return score, reasoning_trail
        
    except Exception as e:
        print(f"⚠️  ReACT scoring failed: {e}")
        # Fallback to simple scoring
        return 5.0, [f"ReACT agent failed: {str(e)}"]


def format_reasoning_trail(reasoning_trail: list) -> str:
    """
    Format ReACT reasoning trail for display.
    
    Args:
        reasoning_trail: List of (action, observation) tuples
    
    Returns:
        Formatted string
    """
    if not reasoning_trail:
        return "No reasoning trail available"
    
    output = []
    for i, (action, observation) in enumerate(reasoning_trail, 1):
        output.append(f"Step {i}:")
        output.append(f"  Action: {action}")
        output.append(f"  Result: {observation}")
    
    return "\n".join(output)

