# AI News Digest
**Version 4.0** - Advanced Multi-Agent System with RAG & ReACT

An automated Python-based system powered by advanced LLM agents that fetches, filters, and curates AI tech news. Features RAG-based deduplication, ReACT agents with tool use, and LangSmith observability for production monitoring.

## Features

### Core Capabilities
- **Multi-source news fetching** from arXiv, Hacker News, TechCrunch, VentureBeat, and 15+ specialized feeds
- **Multi-agent filtering pipeline** with 5 stages (categorization, relevance gate, quality scoring, threshold filter, negative filter)
- **Intent-based categorization** (not just keywords) - distinguishes "data analysis" from "model building"
- **Transparent quality metrics** - publication date, citations, Hacker News upvotes displayed with each article
- **Weekly themed execution** via GitHub Actions (ML Monday, Business Briefing, Ethics Friday, Data Science Saturday)
- **Contextual joke generator** that references featured articles
- **Refresher of the Day** - Educational content with interview prep focus

### Advanced Features (v4.0)
- **🔄 RAG (Retrieval-Augmented Generation)**: Vector-based article memory prevents repetitive content within 60 days
- **🤖 ReACT Agents**: Quality scorer uses web search, citation lookup, and trend analysis to verify claims
- **📊 LangSmith Observability**: Production monitoring with cost tracking ($0.47/digest), latency analysis, and accuracy metrics
- **🎯 Intent-Based Categorization**: "What does the data say?" (Sat) vs "What will happen next?" (Mon)

## Quick Start

See [SETUP.md](SETUP.md) for detailed setup instructions.

### Local Usage

1. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

2. Create a `.env` file with your API keys and email credentials (see SETUP.md)

3. Run the script:
   ```bash
   python main.py
   ```

## Configuration

- **Articles per category:** Modify `ARTICLES_PER_CATEGORY` in `main.py`
- **News sources:** Update `SOURCES` dictionary in `src/agents.py`
- **Categories:** Modify `CATEGORIES` list in `src/agents.py`
- **Schedule:** Edit cron expression in `.github/workflows/daily-news.yml`

## Project Structure

```
AInews/
├── main_scheduled.py      # Main orchestration for scheduled digests
├── src/
│   ├── agents.py          # Multi-agent pipeline, LLM agents, email sending
│   ├── article_memory.py  # RAG vector store for deduplication (v4.0)
│   ├── react_agents.py    # ReACT agents with tool use (v4.0)
│   └── refresher.py       # Refresher of the Day system
├── config.py              # Weekly schedule configuration
├── refreshers.yaml        # 103 curated educational topics
├── data/
│   ├── article_memory/    # Chroma vector DB (persistent)
│   └── refresher_history.json  # Rotation tracking
├── .github/workflows/
│   └── weekly-digest.yml  # GitHub Actions workflow
├── requirements.txt       # Python dependencies
├── SETUP.md              # Detailed setup instructions
├── PRD.md                # Product Requirements Document (v4.0)
└── README.md             # This file
```

## How It Works

### Article Processing Pipeline (v4.0)

1. **Fetch** articles from multiple sources (arXiv API, RSS feeds, Hacker News) - category-specific for efficiency
2. **Deduplicate** using URL and title similarity checks
3. **Categorize** using hybrid approach:
   - Rule-based pre-filter (keywords, patterns)
   - Intent-based LLM categorization (audience + outcome)
4. **Memory Check (RAG)**: Query vector DB for similar articles sent in last 60 days (>85% similarity = reject)
5. **Relevance Gate**: Strict binary filter with category-specific examples ("YES" or "NO" - no gray area)
6. **Quality Scoring (ReACT)**:
   - LLM scores 3 dimensions: novelty, practical, significance
   - ReACT agent uses tools: web search, citation lookup, trend check
   - Verifies claims, checks context, assesses impact
7. **Threshold Filter**: Reject articles scoring <6.0/10
8. **Negative Filter**: Veto agent rejects "waste of time" articles (marketing fluff, beginner content)
9. **Enhance** with source-specific metrics (citations for arXiv, upvotes for HN)
10. **Summarize** using LLM with strict plain-text guidelines
11. **Generate** contextual joke referencing featured article
12. **Select** "Refresher of the Day" from curated topic pool (103 topics across 4 categories)
13. **Format** into HTML email with metrics displayed
14. **Store** sent articles in vector DB for future RAG queries
15. **Send** email digest + track metrics in LangSmith

## Requirements

- Python 3.11+
- **API Keys:**
  - Groq API key (primary LLM - free tier)
  - OpenAI API key (optional - for joke generation & embeddings)
  - LangSmith API key (optional - for observability)
- **Email:** Gmail account with App Password
- **Storage:** ~50MB for vector DB (grows with article history)

## License

For personal/educational use.

