# Plan: Automated AI Tech News Retriever (v2)

## 1. Objective

To build a Python-based automated system that fetches daily AI tech news from multiple categories, selects the top articles from each, uses an LLM to generate high-quality summaries, creates a joke, and sends a consolidated, well-structured email digest suitable for a technical audience.

## 2. News Categories & Sources

| Category | Description | Sources |
| :--- | :--- | :--- |
| **AI Research & Technical Deep Dives** | Latest academic papers and technical discussions. | `arxiv` API, Hacker News API |
| **AI Business & Industry News** | Funding, acquisitions, and major product launches. | RSS Feeds (TechCrunch, VentureBeat) |
| **AI Ethics, Policy & Society** | Societal impact, regulation, and ethical debates. | RSS Feeds (Wired, MIT Tech Review) |

## 3. Proposed Workflow

1.  **Categorized News Fetching:**
    *   For each category, fetch recent articles from its designated sources (API or RSS).
    *   Return a structured dictionary where keys are category names and values are lists of articles.

2.  **Article Selection:**
    *   For each category, select the top 3-5 most recent or relevant articles.

3.  **Summarization Agent:**
    *   Iterate through the selected articles from all categories.
    *   Generate a high-quality summary (3-5 sentences) for each article.

4.  **Joke Agent:**
    *   Select one summarized article at random from the entire collection.
    *   Generate a tech-themed joke based on it.

5.  **Email Agent:**
    *   Receive the final, categorized list of summarized articles and the joke.
    *   Format the content into an HTML email with clear headings for each category.
    *   Send the email via Gmail SMTP.

## 4. Development Milestones

1.  **Project Setup:** (Completed)
2.  **Refactor News Fetching:** Update `agents.py` to fetch news by category.
3.  **Implement Selection Logic:** Add logic in `main.py` to select the top N articles per category.
4.  **LLM Integration & Agents:** (Completed, prompts are good)
5.  **Refactor Email Formatting:** Update `agents.py` to format the email with category headers.
6.  **Orchestration:** Update `main.py` to manage the new categorized workflow.
7.  **Deployment:** Set up a GitHub Actions workflow for daily execution.

## 5. Next Steps

1.  **Update `agents.py`:** Implement the categorized fetching and email formatting.
2.  **Update `main.py`:** Implement the new workflow orchestration.
3.  **Test:** Run the complete, categorized pipeline.
