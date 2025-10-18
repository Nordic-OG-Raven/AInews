# AI News Digest - Setup Guide

## Prerequisites

- Python 3.11+
- Gmail account (for sending emails)
- OpenAI API key or Groq API key

## Local Setup

1. **Clone the repository and navigate to the project directory**

2. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Create a `.env` file in the project root with the following variables:**
   ```
   # LLM API Keys (at least one required)
   # Groq is preferred (free), OpenAI is fallback
   GROQ_API_KEY=your_groq_api_key_here
   OPENAI_API_KEY=your_openai_api_key_here
   
   # Email Configuration (required for sending digest)
   EMAIL_SENDER=your_gmail_address@gmail.com
   EMAIL_RECIPIENT=recipient_email@gmail.com
   GMAIL_APP_PASSWORD=your_gmail_app_password_here
   
   # LinkedIn Configuration (optional - for automated posting)
   LINKEDIN_ACCESS_TOKEN=your_linkedin_access_token
   LINKEDIN_ORGANIZATION_ID=urn:li:organization:your_org_id
   ```

4. **Get a Gmail App Password:**
   - Go to your Google Account settings
   - Security > 2-Step Verification (must be enabled)
   - App passwords > Generate new app password
   - Select "Mail" and "Other (Custom name)"
   - Copy the 16-character password (no spaces)

5. **Run the script:**
   ```bash
   # Test a specific themed digest
   python main_scheduled.py monday
   
   # Or run production (today's schedule)
   python main_scheduled.py
   ```

## GitHub Actions Deployment (Automated Daily Digest)

1. **Fork or push this repository to GitHub**

2. **Add GitHub Secrets:**
   - Go to your repository on GitHub
   - Settings > Secrets and variables > Actions
   - Add the following repository secrets:
     - `GROQ_API_KEY` (required - free API)
     - `EMAIL_SENDER` (your Gmail address)
     - `EMAIL_RECIPIENT` (recipient email)
     - `GMAIL_APP_PASSWORD` (16-character app password)
     - `LINKEDIN_ACCESS_TOKEN` (optional - for LinkedIn posting)
     - `LINKEDIN_ORGANIZATION_ID` (optional - for company page posting)

3. **Enable GitHub Actions:**
   - Go to the "Actions" tab in your repository
   - Enable workflows if prompted

4. **The workflow will run:**
   - Automatically every day at 8:00 AM UTC
   - Manually via the "Actions" tab > "Daily AI News Digest" > "Run workflow"

5. **Customize the schedule:**
   - Edit `.github/workflows/daily-news.yml`
   - Modify the cron expression (e.g., `0 8 * * *` = 8 AM UTC)
   - Use [crontab.guru](https://crontab.guru/) to help create cron schedules

## Configuration

### Adjust Articles Per Category
In `main.py`, change the `ARTICLES_PER_CATEGORY` constant:
```python
ARTICLES_PER_CATEGORY = 3  # Change to your preferred number
```

### Modify News Sources
In `src/agents.py`, update the `SOURCES` dictionary to add/remove RSS feeds or Hacker News keywords.

### Change Categories
In `src/agents.py`, update the `CATEGORIES` list to modify article categories.

## LinkedIn Integration (Optional)

To enable automated posting to LinkedIn:

1. **See detailed setup guide**: `LINKEDIN_SETUP.md`
2. **Quick summary**:
   - Create LinkedIn Developer App
   - Get access token and organization ID
   - Add to `.env` and GitHub Secrets
   - Automatic posting to company page enabled!

**Benefits**: Dual-channel distribution (Email + LinkedIn) for maximum reach

## Troubleshooting

- **No articles found:** Check if the sources are accessible and returning recent content
- **Email not sending:** Verify Gmail app password and that 2-Step Verification is enabled
- **LLM errors:** Ensure your API keys are valid and have sufficient credits
- **GitHub Actions failing:** Check the Actions logs and verify all secrets are set correctly
- **LinkedIn posting failed:** Check `LINKEDIN_SETUP.md` troubleshooting section

