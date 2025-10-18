# AI News Digest

An automated Python-based system that fetches daily AI tech news from multiple sources, categorizes articles, generates high-quality summaries using LLMs, and sends a consolidated email digest.

## Features

- **Multi-source news fetching** from arXiv, Hacker News, TechCrunch, VentureBeat, Wired, and more
- **AI-powered categorization** into relevant topics (Research, Business, Ethics & Policy)
- **Intelligent summarization** using LangChain with OpenAI or Groq
- **Automated email delivery** with beautiful HTML formatting
- **Daily execution** via GitHub Actions
- **Joke generator** for a touch of humor

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
2. **Categorize** using LLM to assign articles to relevant categories
3. **Select** top N articles from each category based on recency
4. **Summarize** articles using LLM for high-quality, concise summaries
5. **Generate** a tech-themed joke based on a random article
6. **Format** content into beautiful HTML email
7. **Send** email digest to configured recipient

## Requirements

- Python 3.11+
- OpenAI API key or Groq API key
- Gmail account for sending emails

## License

For personal/educational use.

