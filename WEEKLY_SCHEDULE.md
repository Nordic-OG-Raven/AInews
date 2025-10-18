# Weekly AI News Digest Schedule

## 📅 Schedule Overview

Each day focuses on a specific category with a catchy, memorable theme:

| Day | Theme | Category | Description |
|-----|-------|----------|-------------|
| **Monday** | 🤖 **ML Monday** | AI Research & Technical Deep Dives | Latest ML research, papers, and technical breakthroughs from arXiv and top research labs |
| **Wednesday** | 💼 **Business Briefing** | AI Business & Industry News | AI startups, funding rounds, product launches, and industry moves |
| **Friday** | ⚖️ **Ethics Friday** | AI Ethics, Policy & Society | AI safety, regulation, societal impact, and policy debates |

## 🚀 Usage

### Run for Current Day
```bash
python main_scheduled.py
```
This automatically detects today's day and runs the appropriate digest (or skips if not a scheduled day).

### Run for Specific Day (Test Mode)
```bash
# Test Monday's digest
python main_scheduled.py monday

# Test Wednesday's digest
python main_scheduled.py wednesday

# Test Friday's digest
python main_scheduled.py friday
```

### Test All Days at Once
```bash
python main_scheduled.py test-all
```
This runs all three digests and saves HTML files for each without sending emails.

## 📧 Output

All emails are automatically saved to:
```
outputs/email_archives/[day]_[timestamp].html
```

Examples:
- `outputs/email_archives/monday_2025-10-18_16-05-34.html`
- `outputs/email_archives/wednesday_2025-10-18_16-10-22.html`
- `outputs/email_archives/friday_2025-10-18_16-15-48.html`

## 🎨 Email Design

Each themed email includes:
- **Gradient header** with theme name and description
- **Date stamp** for context
- **Joke of the day** in a colorful card
- **5 curated articles** per category with:
  - Clickable titles
  - Source attribution
  - Professional summaries (no "The article discusses" fluff)
- **Modern, mobile-responsive design**

## 🤖 GitHub Actions Automation

The workflow (`.github/workflows/weekly-digest.yml`) runs automatically:
- **Mondays** @ 8:00 AM UTC → ML Monday
- **Wednesdays** @ 8:00 AM UTC → Business Briefing  
- **Fridays** @ 8:00 AM UTC → Ethics Friday

### Manual Triggers
You can also manually run specific days or test all from the GitHub Actions UI.

## 🔧 Configuration

Edit `config.py` to:
- Change schedule days
- Modify theme names
- Update descriptions
- Add new categories

## ✨ Key Improvements

1. **Better Summaries**: Direct, punchy writing that gets to the point. No more "The article discusses..."
2. **Focused Content**: Each day targets a specific audience interest
3. **Professional Design**: Beautiful HTML emails suitable for paying subscribers
4. **Easy Testing**: Test individual days or all at once before deploying
5. **Automatic Saving**: Every email is archived for review

## 💡 Potential Expansions

Future themes could include:
- **Tuesday**: "Tech Tuesday" (implementation tutorials, tools)
- **Thursday**: "Startup Thursday" (deep dives into AI companies)
- **Saturday**: "Data Science Saturday" (data engineering, analytics, visualization)

