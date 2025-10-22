# Product Requirements Document: AI News Digest

## 1. Executive Summary

### 1.1 Product Vision
An automated AI news curation and distribution system that delivers high-quality, categorized AI/ML news digests to subscribers via email and LinkedIn. Designed for AI researchers, developers, and industry professionals who need to stay current with technical developments without information overload.

### 1.2 Target Audience
- AI/ML researchers and developers
- Tech professionals interested in AI advancements
- Industry analysts tracking AI business developments
- Policy makers and ethicists concerned with AI's societal impact

### 1.3 Value Proposition
- **Curated Quality**: Only relevant, high-impact articles from trusted sources
- **Category Focus**: Themed days (ML Monday, Business Briefing, Ethics Friday)
- **Time-Efficient**: 5 articles per digest, professional summaries
- **Multi-Channel**: Email for deep reading, LinkedIn for discovery
- **Cost**: Free to operate (using Groq API)

---

## 2. Product Features

### 2.1 Core Features ✅

#### 2.1.1 Multi-Source News Aggregation
**Status**: Implemented

Sources:
- **arXiv API**: CS.AI, CS.LG, CS.CL categories (50 papers/run)
- **RSS Feeds**: 
  - TechCrunch AI
  - VentureBeat AI
  - Wired AI Ethics
  - MIT Tech Review
  - Google Research Blog
  - OpenAI Blog
- **Hacker News API**: Keyword-filtered top stories (150 stories scanned)

**Technical Implementation**:
- `fetch_arxiv_papers()`: Direct API integration with 2-day lookback window
- `fetch_all_articles()`: Unified RSS + HN fetching with timestamp filtering
- Deduplication and source attribution

#### 2.1.2 Multi-Agent Content Filtering System
**Status**: Implemented (v3.0 - Three-Agent Architecture)

**Architecture Overview**:
The system uses three specialized LLM agents working in sequence to ensure only high-quality, relevant content reaches readers:

1. **Agent 1: Relevance Gatekeeper** (Binary Filter)
   - Role: Strict binary YES/NO relevance check
   - Method: LLM with category-specific positive/negative examples
   - Fail mode: Closed (reject on error)
   - Purpose: Prevent off-topic articles from consuming scoring resources

2. **Agent 2: Quality Scorer** (Multi-Dimensional Assessment)
   - Role: Score articles on novelty, practical applicability, significance
   - Method: LLM rates each dimension 0-10, weighted average
   - Fail mode: Neutral (assign 5.0 on error)
   - Purpose: Identify highest-value content for target audience

3. **Agent 3: Negative Filter** (Veto Power)
   - Role: Reject articles that waste readers' time
   - Method: LLM rates "waste-of-time" factor 0-10
   - Threshold: Reject if > 5.0
   - Fail mode: Open (don't reject on error)
   - Purpose: Final safety net against edge cases

**5-Stage Filtering Pipeline**:
1. **Categorization**: Hybrid (rule-based + LLM) assigns articles to categories
2. **Relevance Gate**: Agent 1 filters out off-topic articles
3. **Quality Scoring**: Agent 2 scores remaining articles on 3 dimensions
4. **Threshold Filter**: Reject articles scoring < 6.0/10
5. **Negative Filter**: Agent 3 vetoes articles with waste_score > 5.0

**Performance Metrics** (Data Science Saturday test):
- 120 articles fetched → 5 published (96% rejection rate)
- Stage 1: 27 categorized → Stage 2: 21 passed relevance → Stage 3: 18 above 6.0/10 → Stage 4: 8 approved → Stage 5: 5 selected
- Average final quality score: 6.1/10
- Zero off-topic articles reached readers

**Why Multi-Agent**:
- **Separation of concerns**: Each agent has one job, does it well
- **Fail-safe design**: Different fail modes prevent cascading errors
- **Transparency**: Each stage logged for debugging
- **Quality guarantee**: Articles pass 5 independent checks before publication

**Cost**: ~$0.003 per article (3 LLM calls), still free with Groq

#### 2.1.3 Quality Metrics & Transparency
**Status**: Implemented (v3.0 - Multi-Agent Scores + Citations)

**Metrics Displayed to Readers**:
Each article shows:
- **Publication date**: When the article was published
- **Citation count**: For arXiv papers (via Semantic Scholar API)
- **Novelty score** (0-10): New methods, breakthrough results
- **Practical score** (0-10): Immediate applicability for readers
- **Significance score** (0-10): Long-term industry impact
- **Overall quality score** (0-10): Weighted average (40/30/30)

**Quality Score Calculation**:
```
Final Score = 0.4 × Novelty + 0.3 × Practical + 0.3 × Significance
```

**Selection Criteria**:
- **Minimum threshold**: 6.0/10 overall quality score
- **Negative filter**: Articles with waste_score > 5.0 are vetoed
- **Top N**: Best 5 articles per category after all filters

**Transparency Benefits**:
- Readers can verify why each article was selected
- Builds trust in the curation process
- Allows feedback loop for improving agent prompts

#### 2.1.4 Professional Summarization
**Status**: Implemented

Requirements:
- 3-5 sentences per article
- Direct, active voice (no "The article discusses..." filler)
- Technical details and practical implications
- Suitable for paying subscribers ($1/week quality bar)

**Technical Implementation**:
- LLM-based summarization with custom prompt
- Full-text scraping for non-arXiv sources
- Abstract-only for arXiv papers (PDF limitation)

#### 2.1.5 Contextual Joke Generation
**Status**: Implemented

Features:
- Generated from random article in featured category
- Appears right after category header (contextual placement)
- References specific article: "(See [article title] below for context)"
- Subtle design (light gray background, gold accent border)

#### 2.1.6 Enhanced Source Attribution
**Status**: Implemented

Format:
- **arXiv**: "arXiv: [Category] • [Last Author] et al."
  - Example: "arXiv • Huang et al."
- **RSS**: Original feed title
- **Hacker News**: "Hacker News"

---

### 2.2 Weekly Schedule System ✅

#### 2.2.1 Themed Days
**Status**: Implemented

| Day | Theme | Category | Time (UTC) |
|-----|-------|----------|------------|
| Monday | 🤖 **ML Monday** | AI Research & Technical Deep Dives | 8:00 AM |
| Wednesday | 💼 **ML Business Briefing** | AI Business & Industry News | 8:00 AM |
| Friday | ⚖️ **Ethics Friday** | AI Ethics, Policy & Society | 8:00 AM |

**Configuration**: `config.py` - easily extensible for new days/categories

#### 2.2.2 GitHub Actions Automation
**Status**: Implemented

Workflow: `.github/workflows/weekly-digest.yml`
- Three cron schedules (Mon/Wed/Fri @ 8:00 AM UTC)
- Manual trigger support with day selection
- Test mode option (`test-all` for validating all three digests)

---

### 2.3 Email Distribution ✅

#### 2.3.1 HTML Email Design
**Status**: Implemented

Design Principles (Gestalt Theory Applied):
- **Figure-ground**: White text on gradient header (high contrast)
- **Proximity**: Related elements grouped together
- **Hierarchy**: Clear visual flow from header → joke → articles
- **Simplicity**: Minimal design, professional appearance

**Styling**:
- Purple gradient header with theme name
- Light gray joke box with gold left border
- Article cards with blue left borders
- Mobile-responsive layout (max-width: 700px)
- Sans-serif typography (Segoe UI)

#### 2.3.2 Email Structure
**Status**: Implemented (v2.0 - Enhanced with Quality Metrics)

Flow:
1. **Header**: Theme name + description + date
2. **Featured Category**: Main content section
3. **Joke**: Contextual humor with article reference
4. **Tip Box**: Guidance to click article titles for full content
5. **Featured Articles**: 5 curated pieces with quality metrics
6. **Transition**: "Also worth checking out from the past few days..."
7. **Other Categories**: Additional relevant articles (if found)
8. **Footer**: Branding + collaboration email

**Article Card Structure** (NEW):
Each article now displays:
- **Title**: Clickable link to original source
- **Source**: Attribution (e.g., "arXiv • Author et al.", "TechCrunch AI")
- **Quality Metrics** (inline bullet list):
  - Publication date
  - Citation count (if applicable)
  - Novelty score (0-10)
  - Practical applicability score (0-10)
  - Significance score (0-10)
  - **Overall quality score** (weighted average, bolded)
- **Summary**: 4-6 sentence professional summary

#### 2.3.3 Email Delivery
**Status**: Implemented

Technical:
- Gmail SMTP with app password authentication
- HTML MIME type
- Subject line: "AI News Digest - [Date]"
- Configurable sender/recipient via `.env`

#### 2.3.4 Archiving
**Status**: Implemented

- Every email saved to `outputs/email_archives/`
- Filename format: `[day]_YYYY-MM-DD_HH-MM-SS.html`
- Browser-viewable for testing/review
- Version control for content history

---

### 2.4 Testing & Validation ✅

#### 2.4.1 Test Modes
**Status**: Implemented

Commands:
```bash
# Test specific day (saves HTML, no email)
python main_scheduled.py monday
python main_scheduled.py wednesday
python main_scheduled.py friday

# Test all days at once
python main_scheduled.py test-all

# Run for production (today's schedule)
python main_scheduled.py
```

#### 2.4.2 Source Validation
**Status**: Implemented

Output report showing:
- Articles fetched per source
- Total article count
- Categorization results
- Final selection count

---

## 3. Technical Architecture

### 3.1 Technology Stack

**Language**: Python 3.11+

**Core Dependencies**:
- `langchain` - LLM orchestration
- `langchain-groq` - Free Groq API integration
- `langchain-openai` - OpenAI fallback (optional)
- `feedparser` - RSS feed parsing
- `requests` - HTTP client for APIs
- `beautifulsoup4` - HTML scraping
- `python-dotenv` - Environment management
- `tqdm` - Progress bars
- `smtplib` - Email sending (built-in)

**APIs Used**:
- arXiv API (free, no key required)
- Hacker News API (free, no key required)
- RSS feeds (free, public)
- Groq API (free, requires key)
- Gmail SMTP (free, requires app password)

### 3.2 Project Structure

```
AInews/
├── main.py                      # Legacy: All-category digest
├── main_scheduled.py            # Production: Themed weekly digests
├── config.py                    # Schedule configuration
├── src/
│   └── agents.py               # Core logic (fetching, LLM, email)
├── .github/workflows/
│   ├── daily-news.yml          # Legacy workflow
│   └── weekly-digest.yml       # Production workflow
├── outputs/
│   └── email_archives/         # HTML email archives
├── .env                        # Secrets (not in git)
├── requirements.txt            # Python dependencies
├── PRD.md                      # This document
├── SETUP.md                    # Deployment instructions
├── WEEKLY_SCHEDULE.md          # Schedule documentation
└── README.md                   # Project overview
```

### 3.3 Data Flow

```
1. Scheduled Trigger (GitHub Actions cron or manual)
   ↓
2. Fetch Articles (arXiv + RSS + HN) → ~75 articles
   ↓
3. Categorize with LLM → Filter to featured category
   ↓
4. Select Top 5 → Sort by recency
   ↓
5. Summarize with LLM → Professional summaries
   ↓
6. Generate Joke with LLM → Contextual humor
   ↓
7. Format HTML Email → Themed design
   ↓
8. Send via SMTP & Archive → Email + Local file
```

### 3.4 LLM Strategy

**Primary**: Groq (Free Tier)
- Model: `llama-3.1-8b-instant`
- Cost: $0/month
- Rate limits: 14,400 requests/day (far exceeds our needs)
- Use cases: Categorization, summarization, jokes

**Fallback**: OpenAI (Paid)
- Model: `gpt-4o-mini`
- Cost: ~$0.28/month (if used)
- Automatically used if Groq unavailable

**Token Usage per Run**:
- Categorization: ~37,500 tokens (75 articles × ~500 tokens)
- Summarization: ~10,000 tokens (5 articles × ~2,000 tokens)
- Joke generation: ~500 tokens
- **Total: ~48,000 tokens/run**

**Monthly Usage**: 13 runs × 48,000 = ~624,000 tokens (~$0 with Groq)

---

## 4. Configuration

### 4.1 Environment Variables

Required in `.env`:

```bash
# LLM API Keys (Groq preferred, OpenAI fallback)
GROQ_API_KEY=gsk_...
OPENAI_API_KEY=sk-proj-...  # Optional

# Email Configuration
EMAIL_SENDER=your@gmail.com
EMAIL_RECIPIENT=recipient@gmail.com
GMAIL_APP_PASSWORD=16_char_app_password
```

### 4.2 Configurable Parameters

**In `main_scheduled.py`**:
- `ARTICLES_PER_CATEGORY = 5` - Articles per digest

**In `config.py`**:
- Weekly schedule (days, themes, categories)
- Category-to-day mappings

**In `src/agents.py`**:
- RSS feed sources
- Hacker News keywords
- Category definitions
- arXiv query parameters
- Time windows (currently 2 days)

---

## 5. Design Decisions & Rationale

### 5.1 Why Weekly Schedule?
**Decision**: Theme-focused days (Mon/Wed/Fri) vs daily all-categories

**Rationale**:
- Reduces information overload
- Targets specific audience segments
- Memorable branding (ML Monday, etc.)
- Allows deeper coverage (5 articles vs 3)
- Professional newsletter standard

### 5.2 Why 2-Day Lookback for arXiv?
**Decision**: `yesterday_utc - timedelta(days=2)`

**Rationale**:
- arXiv doesn't publish daily in all categories
- Ensures consistent article availability
- Still captures "recent" research
- Balances freshness vs reliability

### 5.3 Why Groq Over OpenAI?
**Decision**: Prefer Groq, fallback to OpenAI

**Rationale**:
- Zero cost removes financial bottleneck
- Sufficient quality for categorization/summarization
- 14,400 req/day far exceeds our ~100 req/run
- No payment failure risk
- OpenAI available as quality fallback

### 5.4 Why Email + LinkedIn?
**Decision**: Dual-channel distribution

**Rationale**:
- Email: Reliable, algorithm-free, detailed reading
- LinkedIn: Discovery, engagement, professional credibility
- Different user preferences and behaviors
- Maximizes reach without forcing platform choice

### 5.5 Why Joke Placement After Category?
**Decision**: Joke appears right before articles, not at top

**Rationale**:
- Contextual relevance (joke relates to article below)
- Gestalt proximity principle
- Reduces confusion ("What's this joke about?")
- Natural reading flow

### 5.6 Why Subtle Joke Styling?
**Decision**: Light gray box with gold border vs gradient

**Rationale**:
- Professional appearance (not "try-hard")
- Gestalt simplicity principle
- Doesn't overpower main content
- Suitable for B2B audience

---

## 6. Quality Standards

### 6.1 Content Quality
- ✅ Summaries sound natural, not academic
- ✅ Active voice ("Researchers developed..." not "The article discusses...")
- ✅ Technical details preserved
- ✅ 3-5 sentences per summary
- ✅ Suitable for $1/week paying subscribers

### 6.2 Design Quality
- ✅ Mobile-responsive (max-width: 700px)
- ✅ High contrast (white on dark, black on light)
- ✅ Professional typography
- ✅ Consistent spacing and hierarchy
- ✅ Accessible color choices

### 6.3 Technical Quality
- ✅ Error handling for API failures
- ✅ Graceful degradation (OpenAI fallback)
- ✅ Source validation reporting
- ✅ HTML archiving for debugging
- ✅ Progress bars for long operations

---

## 7. Future Roadmap

### 7.1 Phase 2: LinkedIn Integration 🚧
**Status**: Next priority

**Requirements**:
1. LinkedIn Developer App setup
2. OAuth 2.0 authentication for Nordic Raven Solutions company page
3. LinkedIn post generation function (condense digest to post format)
4. Hashtag strategy (#AI, #MachineLearning, etc.)
5. Post scheduling via LinkedIn API
6. Dual-channel orchestration (Email + LinkedIn)

**Estimated Effort**: 2-3 hours implementation + testing

**Token Impact**: +2,000 tokens per run (~4% increase, still $0 with Groq)

### 7.2 Phase 3: Analytics & Optimization 📊
**Status**: Future consideration

Potential features:
- Email open rates (via tracking pixels)
- LinkedIn engagement metrics
- A/B testing for subject lines
- Optimal posting times analysis
- Subscriber growth tracking

### 7.3 Phase 4: Additional Categories 📅
**Status**: Brainstorm

Potential expansions:
- **Tech Tuesday**: Implementation tutorials, developer tools
- **Startup Thursday**: Deep dives into AI companies
- **Data Science Saturday**: Data engineering, analytics, visualization

**Blocker**: Requires more diverse sources and careful audience research

### 7.4 Phase 5: Subscription Management 👥
**Status**: Future consideration

Features needed for scaling:
- Subscription form (website or LinkedIn form)
- Email list management (Mailchimp/SendGrid integration)
- Unsubscribe functionality
- Preference center (choose categories)

---

## 8. Success Metrics

### 8.1 Launch Criteria (Current Phase) ✅
- [x] 3 themed digests working (Mon/Wed/Fri)
- [x] Email delivery functional
- [x] HTML archiving operational
- [x] GitHub Actions automation configured
- [x] Cost: $0/month
- [x] Source diversity: 8+ sources

### 8.2 Phase 2 Success (LinkedIn Integration)
- [ ] LinkedIn API connected to Nordic Raven Solutions
- [ ] Automated posting working
- [ ] Post format optimized for engagement
- [ ] Dual-channel delivery (Email + LinkedIn) coordinated

### 8.3 Long-term Goals
- **Content**: 50+ subscribers within 3 months
- **Engagement**: 5%+ LinkedIn post engagement rate
- **Quality**: Positive feedback on summary quality
- **Reliability**: 99%+ uptime for scheduled digests
- **Growth**: Organic subscriber growth via LinkedIn discovery

---

## 9. Risk Assessment

### 9.1 Technical Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| Groq API rate limits exceeded | Medium | OpenAI fallback configured |
| RSS feed down | Low | Multiple sources per category |
| arXiv API changes | Low | Error handling + monitoring |
| Gmail blocks SMTP | Medium | App password + low volume |
| GitHub Actions quota | Low | Free tier is 2,000 min/month (we use ~5 min/week) |

### 9.2 Content Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| Low article availability | Medium | 2-day lookback window |
| Poor categorization accuracy | Low | Prompt engineering + manual review |
| Summary quality degradation | Low | OpenAI fallback available |
| Source bias | Medium | Diverse source portfolio |

### 9.3 Business Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| LinkedIn TOS violation | High | Official API only, company page |
| Low subscriber growth | Medium | Multi-channel + SEO optimization |
| Competition | Low | Focused niche + quality differentiation |

---

## 10. Dependencies & Prerequisites

### 10.1 External Services
- ✅ GitHub account (free)
- ✅ Gmail account with 2FA + app password (free)
- ✅ Groq API account (free)
- 🚧 LinkedIn Developer App (free, pending setup)
- 🚧 LinkedIn company page access (existing: Nordic Raven Solutions)

### 10.2 Technical Requirements
- ✅ Python 3.11+ environment
- ✅ Virtual environment (`/Users/jonas/Thesis/.venv`)
- ✅ All dependencies in `requirements.txt`
- ✅ `.env` file with secrets
- ✅ GitHub repository with Actions enabled

---

## 11. Deployment Instructions

See `SETUP.md` for detailed instructions.

**Quick Start**:
```bash
# 1. Install dependencies
pip install -r requirements.txt

# 2. Configure .env
cp .env.example .env
# Edit .env with your API keys

# 3. Test locally
python main_scheduled.py monday

# 4. Deploy to GitHub
git push origin main

# 5. Add GitHub Secrets
# GROQ_API_KEY, EMAIL_SENDER, EMAIL_RECIPIENT, GMAIL_APP_PASSWORD

# 6. Enable GitHub Actions
# Workflows will run automatically Mon/Wed/Fri @ 8:00 AM UTC
```

---

## 12. Changelog

### v1.0.0 - 2025-10-18
- ✅ Initial implementation
- ✅ Weekly schedule system (ML Monday, Business Briefing, Ethics Friday)
- ✅ Multi-source aggregation (arXiv, RSS, Hacker News)
- ✅ LLM-powered categorization and summarization
- ✅ Contextual joke generation
- ✅ Professional HTML email design
- ✅ GitHub Actions automation
- ✅ Email archiving
- ✅ Groq API integration (zero cost)
- ✅ Enhanced source attribution (author names)
- ✅ Test mode for all days

### v1.1.0 - TBD (Next Release)
- 🚧 LinkedIn API integration
- 🚧 Automated posting to Nordic Raven Solutions company page
- 🚧 LinkedIn-optimized post formatting
- 🚧 Dual-channel orchestration

---

## 13. Contributors

**Project Owner**: Jonas (Nordic Raven Solutions)
**Development**: AI-assisted implementation
**Target Audience**: AI/ML professionals, researchers, developers

---

## 14. License & Usage

**License**: Personal/Educational use
**Commercial Use**: Requires consideration of:
- Source attribution requirements
- Fair use of summarized content
- LinkedIn/Email TOS compliance

---

## Appendix A: Example Output

### Email Subject
```
AI News Digest - October 18, 2025
```

### Email Preview (ML Monday)
```
🤖 ML Monday
Latest ML research, papers, and technical breakthroughs

💡 Joke of the Day
Why did Terra break up with its last model? 
It just couldn't handle the emotional depth of their 3D relationship!
(See "Terra: Explorable Native 3D World Model..." below for context)

📰 AI Research & Technical Deep Dives

1. Coupled Diffusion Sampling for Training-Free Multi-View Image Editing
   Source: arXiv • Alzayer et al.
   Researchers developed an inference-time diffusion sampling method...

[4 more articles]
```

---

## 11. Performance Improvements (v2.0)

### 11.1 Efficiency Optimizations
- **Category-Specific Fetching**: 3x faster, only fetches relevant sources
- **Quality Scoring**: Prioritizes high-value content over random selection
- **Hybrid Categorization**: Rule-based pre-filtering + LLM for edge cases
- **Fallback Content**: Guarantees minimum 3 articles per digest

### 11.2 Enhanced Data Science Sources
- **10+ RSS Feeds**: KDnuggets, Towards Data Science, DataCamp, Analytics Vidhya, Snowflake, Tableau, Power BI, Google Cloud, AWS Big Data
- **Broader Keywords**: SQL, analytics, data, statistics, visualization, BI, ETL, pipeline, warehouse
- **Quality Indicators**: Tutorial content, substantial summaries, best practices

### 11.3 System Reliability
- **Never Fails**: Fallback content ensures minimum article count
- **Better Content**: Quality scoring selects most relevant articles
- **Faster Processing**: Category-specific fetching reduces compute time
- **Consistent Output**: Guaranteed 3+ high-quality articles per digest

---

**Document Version**: 2.0
**Last Updated**: October 19, 2025
**Status**: Production-ready with performance optimizations

