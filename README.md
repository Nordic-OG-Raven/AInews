# AI News Digest

An automated Python-based system that fetches daily AI tech news from multiple sources, categorizes articles, generates high-quality summaries using LLMs, and sends a consolidated email digest.

## Features

- **Multi-source news fetching** from arXiv, Hacker News, TechCrunch, VentureBeat, Wired, and more
- **AI-powered categorization** using hybrid approach (rule-based + LLM)
- **LLM multi-dimensional quality scoring** (novelty, practical applicability, significance)
- **Citation tracking** via Semantic Scholar API for arXiv papers
- **Transparent quality metrics** displayed with each article
- **Intelligent summarization** using LangChain with Groq (free tier)
- **Automated email delivery** with beautiful HTML formatting
- **Weekly themed execution** via GitHub Actions (ML Monday, Business Briefing, Ethics Friday, Data Science Saturday)
- **Contextual joke generator** that references featured articles

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
├── main.py                 # Main orchestration script
├── src/
│   └── agents.py          # News fetching, LLM agents, email sending
├── .github/workflows/
│   └── daily-news.yml     # GitHub Actions workflow
├── requirements.txt       # Python dependencies
├── SETUP.md              # Detailed setup instructions
└── README.md             # This file
```

## How It Works

1. **Fetch** articles from multiple sources (arXiv API, RSS feeds, Hacker News)
2. **Categorize** using hybrid approach (rule-based + LLM) to assign articles to relevant categories
3. **Score** each article using LLM multi-dimensional scoring (novelty, practical applicability, significance)
4. **Select** top N articles from each category based on quality scores (not recency)
5. **Enhance** articles with citation counts (via Semantic Scholar API for arXiv papers)
6. **Summarize** articles using LLM for high-quality, concise summaries
7. **Generate** a tech-themed joke based on a random article
8. **Format** content into beautiful HTML email with quality metrics displayed
9. **Send** email digest to configured recipient

## Requirements

- Python 3.11+
- OpenAI API key or Groq API key
- Gmail account for sending emails

## License

For personal/educational use.

