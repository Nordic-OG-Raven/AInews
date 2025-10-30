import React, { useState, useCallback } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  type Node,
  type Edge,
  addEdge,
  useNodesState,
  useEdgesState,
  MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { X, Code, Filter, Star, Ban, Database, Search, CheckCircle, Laugh, BookOpen, Mail } from 'lucide-react';

// Complete node data from actual AInews codebase
const nodeDetails = {
  'fetch': {
    title: '📡 Multi-Source Aggregation',
    description: 'Fetch articles from multiple sources daily',
    details: [
      'arXiv API with categories set to: CS.AI, CS.LG, CS.CL (50 papers/run)',
      'RSS Feeds from: TechCrunch AI, VentureBeat AI, MIT Tech Review, Google Research, OpenAI Blog, Wired AI Ethics',
      'Hacker News API for top AI-related discussions (150 stories scanned)',
      'Fetches ~120-150 articles per day with 7-day lookback window'
    ],
    code: `def fetch_articles_for_category(target_category):
    """Fetch from relevant sources only"""
    articles = []
    
    # arXiv papers
    articles.extend(fetch_arxiv_papers())
    
    # RSS feeds
    for feed_url in SOURCES['rss']:
        articles.extend(parse_rss(feed_url))
    
    # Hacker News
    articles.extend(fetch_hackernews())
    
    return articles`,
    stats: { input: 'Daily fetch', output: '~150 articles', avgTime: '30s' }
  },
  'categorize': {
    title: '🏷️ Smart Categorization',
    description: 'Assigns articles to: ML Tech Mondays, AI Business Briefing Wednesday, AI Ethics Friday, Data Science Saturday',
    details: [
      'Rule-based: Keyword matching for obvious articles',
      'LLM-based: Gemini 1.5 Flash for ambiguous articles',
      'Categories defined by topic focus, not just day of week'
    ],
    code: `def categorize_article(article):
    # Rule-based first (fast)
    for category, keywords in CATEGORY_KEYWORDS.items():
        if any(kw in article.title.lower() for kw in keywords):
            return category
    
    # LLM for ambiguous articles
    prompt = """Categorize this article:
    Title: {title}
    Summary: {summary}
    
    Categories: {categories}"""
    
    return llm.invoke(prompt)`,
    stats: { input: '150 articles', output: '~30 categorized (target category)', avgTime: '0.2s/article' }
  },
  'rag': {
    title: '🧠 RAG Memory (ChromaDB)',
    description: 'Prevents duplicate/similar content using vector embeddings',
    details: [
      'ChromaDB vector database with OpenAI embeddings',
      'Similarity threshold: 85% (rejects if too similar to sent articles)',
      'Lookback window: 60 days of previously sent articles',
      'Topic coverage tracking per category to ensure variety'
    ],
    code: `def check_if_duplicate(article) -> Tuple[bool, str]:
    query_text = f"{article['title']} {article['summary']}"
    
    # Query vector DB for similar articles (last 60 days)
    results = collection.query(
        query_texts=[query_text],
        n_results=5,
        where={"sent_date": {"$gte": cutoff_timestamp}}
    )
    
    for distance in results['distances'][0]:
        similarity = 1 / (1 + distance)
        if similarity > 0.85:
            return True, "Too similar to recent article"
    
    return False, None`,
    stats: { input: '30 articles', output: '~28 unique (5-10% duplicates)', avgTime: '0.1s/article' }
  },
  'agent1': {
    title: '🚪 Agent 1: Relevance Gate',
    description: 'Binary YES/NO relevance filter with category-specific criteria',
    details: [
      'Strict category-specific relevance check using few-shot examples',
      'Uses Groq Llama 3.1 70B for fast inference',
      'Fail mode: CLOSED (reject on error for safety)',
      'Typical rejection rate: ~80% of categorized articles'
    ],
    prompt: `You are a relevance filter for ML Tech Monday articles.

YES if:
- New ML models, architectures, or techniques
- Training methods, benchmarks, datasets
- Practical ML applications with technical depth
- Research papers with novel contributions

NO if:
- General tech news without ML focus
- AI hype without technical substance  
- Business news only (no technical content)
- Marketing announcements without technical details

Article: "{title}"
Summary: "{summary}"

Answer: YES or NO (one word only)`,
    stats: { input: '28 articles', output: '~21 relevant (75% pass rate)', avgTime: '0.5s/article' }
  },
  'agent2': {
    title: '⭐ Agent 2: Quality Scorer',
    description: 'Multi-dimensional quality assessment with weighted scoring',
    details: [
      'Novelty: New methods, breakthrough results (0-10)',
      'Practical Applicability: Can developers/researchers use this? (0-10)',
      'Significance: Impact on field, industry relevance (0-10)',
      'Weighted formula: novelty×0.4 + applicability×0.3 + significance×0.3',
      'Threshold: Must score ≥6.0/10 to proceed to next stage'
    ],
    prompt: `Rate this article for a newsletter targeting ML engineers, data scientists, AI researchers.

Title: {title}
Summary: {summary}
Source: {source}
Citations: {citation_count if >0}

Rate on three dimensions (0-10 each):
1. NOVELTY: New methods, breakthrough results, innovative approaches
2. PRACTICAL: Can readers immediately apply this? Tools, tutorials, how-tos  
3. SIGNIFICANCE: Will this matter in 6 months? Industry impact, paradigm shifts

Respond ONLY with three numbers separated by commas: novelty,practical,significance
Example: 8,6,9`,
    stats: { input: '21 articles', output: '~10 high-quality (score ≥6.0)', avgTime: '1.2s/article' }
  },
  'react': {
    title: '🔍 ReACT Agent with Tools',
    description: 'Reasoning + Acting agent for claim verification and context gathering (runs by default)',
    details: [
      'Tool: web_search - Verify "breakthrough" claims via DuckDuckGo',
      'Tool: citation_lookup - Check Semantic Scholar API for paper citations',
      'Tool: trend_check - Assess topic relevance and recent coverage',
      'Provides reasoning trail showing all tool calls and decisions',
      'Falls back to standard LLM scoring only if ReACT fails',
      'Enabled by default when OPENAI_API_KEY is set'
    ],
    code: `def score_article_with_react(article, category, llm):
    """ReACT agent with tool use for verification"""
    tools = [web_search, citation_lookup, trend_check]
    
    system_prompt = """You are a quality assessment agent.
    
    USE YOUR TOOLS to verify claims:
    - web_search: Check if "breakthrough" claims are real
    - citation_lookup: Check paper impact
    - trend_check: Assess topic relevance
    
    After using tools, provide score 0-10."""
    
    agent = create_agent(
        model=llm,
        tools=tools,
        system_prompt=system_prompt
    )
    
    result = agent.invoke({"messages": [...]})
    return score, reasoning_trail`,
    stats: { input: '21 articles', output: '21 verified scores', avgTime: '5s/article' }
  },
  'agent3': {
    title: '🚫 Agent 3: Negative Filter (Veto)',
    description: 'Final safety net with veto power - removes time-wasters',
    details: [
      'Rejects vague announcements without substance',
      'Filters pure marketing hype and clickbait',
      'Catches redundant content already covered',
      'Waste-of-time score: 0-10 (articles >5.0 are vetoed)',
      'Fail mode: OPEN (don\'t reject on error to avoid false negatives)'
    ],
    prompt: `You are the final filter. Rate how much this article would WASTE readers' time (0-10).

High waste (7-10):
- Vague announcements ("Company X announces AI initiative")
- Pure hype without technical details
- Redundant content (already covered recently)
- Clickbait or misleading titles

Low waste (0-3):
- Actionable insights developers can use
- Novel technical content with depth
- Clear value proposition

Article: "{title}"
Summary: "{summary}"

Return ONLY a number 0-10`,
    stats: { input: '10 high-quality', output: '~6 approved (40% veto rate)', avgTime: '0.8s/article' }
  },
  'refresher': {
    title: '📚 Educational Refresher',
    description: 'Daily educational content on ML/Data Science fundamentals',
    details: [
      'YAML database of 50+ topics per category (ml_research, ai_business, ai_ethics, data_science)',
      'Rotation system prevents repeating topics within 30 days',
      'Topics include: name, why it matters, common misconceptions',
      'LLM generates 2-3 sentence explanation tailored to audience',
      'Appears in email between joke and articles'
    ],
    code: `def get_refresher_for_category(category_map):
    """Select refresher topic with rotation"""
    refreshers = load_refreshers()
    history = load_history()
    
    # Filter out recently shown topics (last 30 days)
    recent_topics = set(history.get(category, {}).get('recent', []))
    available = [t for t in topics if t['name'] not in recent_topics]
    
    # Select random from available
    topic = random.choice(available)
    
    # Generate explanation via LLM
    explanation = llm.invoke(topic['explanation_prompt'])
    
    return format_refresher_html(topic, explanation)`,
    stats: { input: '1 category', output: '1 refresher topic', avgTime: '1.5s' }
  },
  'summarize': {
    title: '✍️ Article Summarization',
    description: 'Generate concise professional summaries for approved articles',
    details: [
      'Scrapes full article text (except arXiv and Hacker News)',
      'LLM generates 2-3 sentence summary',
      'Optimized for email readability',
      'Maintains technical accuracy while being accessible'
    ],
    code: `def summarize_article(content):
    """Generate professional summary"""
    prompt = """Summarize in 2-3 sentences:
    
    {content}
    
    Focus on: What's new? Why does it matter? Who should care?"""
    
    return llm.invoke(prompt)`,
    stats: { input: '~6 articles', output: '~6 summaries', avgTime: '1.5s/article' }
  },
  'joke': {
    title: '😂 Joke Generator (OpenAI)',
    description: 'Creates witty one-liner jokes about selected articles',
    details: [
      'Uses OpenAI GPT-4o-mini specifically for higher quality creative output',
      'Temperature: 1.2 for more creativity',
      'Generates jokes based on random article from final selection',
      'Cache-busted to ensure fresh jokes each time',
      'Appears at top of email digest for engagement'
    ],
    code: `def generate_joke(article):
    # Use OpenAI for better creative quality  
    llm = ChatOpenAI(model="gpt-4o-mini", temperature=1.2)
    
    prompt = """You are a witty comedian who tells jokes about technology and AI.
    Create a short, clever one-liner joke based on this article.
    
    Article: {title}
    Summary: {summary}
    
    Make it punny, clever, or absurdist. Under 100 characters."""
    
    joke = llm.invoke(prompt, cache_bust=datetime.now())
    return joke`,
    stats: { input: '1 random article', output: '1 witty joke', avgTime: '2s' }
  },
  'publish': {
    title: '📝 Format & Publish',
    description: 'Create HTML email + LinkedIn post + store in RAG memory',
    details: [
      'Formats themed HTML email with gradient header',
      'Includes: joke → refresher → tip → articles with metrics',
      'Creates LinkedIn post with hashtags and formatting',
      'Stores to Supabase database as draft (admin approval)',
      'Saves all sent articles to RAG memory for future deduplication',
      'Tracks source analytics for performance monitoring'
    ],
    code: `def format_themed_email(schedule, articles, joke, refresher):
    """Generate complete HTML email"""
    html = generate_header(schedule)
    html += format_joke(joke)
    html += format_refresher(refresher)
    html += format_articles(articles)
    html += generate_footer()
    
    # Send via SMTP
    send_email(html)
    
    # Post to LinkedIn  
    send_to_linkedin(articles, schedule)
    
    # Store in RAG memory
    for article in articles:
        memory.store_article(article, category, quality_score)`,
    stats: { input: '~6 final articles + joke + refresher', output: '1 complete digest', avgTime: '5s' }
  }
};

// Vertical top-down pipeline with all 11 nodes
const initialNodes: Node[] = [
  // Main vertical pipeline
  { id: 'fetch', position: { x: 400, y: 50 }, data: { label: '📡 Fetch Data' }, type: 'input', style: { background: '#3b82f6', color: 'white', border: '2px solid #2563eb', borderRadius: '12px', padding: '20px', fontSize: '16px', fontWeight: 'bold', textAlign: 'center', minWidth: '180px' } },
  
  { id: 'categorize', position: { x: 400, y: 180 }, data: { label: '🏷️ Categorize' }, style: { background: '#8b5cf6', color: 'white', border: '2px solid #7c3aed', borderRadius: '12px', padding: '20px', fontSize: '16px', fontWeight: 'bold', textAlign: 'center', minWidth: '180px' } },
  
  { id: 'rag', position: { x: 400, y: 310 }, data: { label: '🧠 RAG Memory Check' }, style: { background: '#14b8a6', color: 'white', border: '2px solid #0d9488', borderRadius: '12px', padding: '20px', fontSize: '16px', fontWeight: 'bold', textAlign: 'center', minWidth: '180px' } },
  
  { id: 'agent1', position: { x: 400, y: 440 }, data: { label: '🚪 Agent 1: Relevance Gate' }, style: { background: '#10b981', color: 'white', border: '2px solid #059669', borderRadius: '12px', padding: '20px', fontSize: '16px', fontWeight: 'bold', textAlign: 'center', minWidth: '180px' } },
  { id: 'reject1', position: { x: 650, y: 440 }, data: { label: '❌ Reject\n(~75%)' }, style: { background: '#ef4444', color: 'white', border: '2px solid #dc2626', borderRadius: '8px', padding: '15px', fontSize: '14px', textAlign: 'center' } },
  
  { id: 'agent2', position: { x: 400, y: 570 }, data: { label: '⭐ Agent 2: Quality Scorer' }, style: { background: '#f59e0b', color: 'white', border: '2px solid #d97706', borderRadius: '12px', padding: '20px', fontSize: '16px', fontWeight: 'bold', textAlign: 'center', minWidth: '180px' } },
  { id: 'react', position: { x: 150, y: 570 }, data: { label: '🔍 ReACT Tools' }, style: { background: '#06b6d4', color: 'white', border: '2px solid #0891b2', borderRadius: '12px', padding: '18px', fontSize: '14px', fontWeight: 'bold', textAlign: 'center' } },
  { id: 'reject2', position: { x: 650, y: 570 }, data: { label: '❌ Reject\n(score <6)' }, style: { background: '#ef4444', color: 'white', border: '2px solid #dc2626', borderRadius: '8px', padding: '15px', fontSize: '14px', textAlign: 'center' } },
  
  { id: 'agent3', position: { x: 400, y: 700 }, data: { label: '🚫 Agent 3: Veto Filter' }, style: { background: '#dc2626', color: 'white', border: '2px solid #b91c1c', borderRadius: '12px', padding: '20px', fontSize: '16px', fontWeight: 'bold', textAlign: 'center', minWidth: '180px' } },
  { id: 'reject3', position: { x: 650, y: 700 }, data: { label: '❌ Veto\n(~40%)' }, style: { background: '#ef4444', color: 'white', border: '2px solid #dc2626', borderRadius: '8px', padding: '15px', fontSize: '14px', textAlign: 'center' } },
  
  { id: 'summarize', position: { x: 400, y: 830 }, data: { label: '✍️ Summarize Articles' }, style: { background: '#6366f1', color: 'white', border: '2px solid #4f46e5', borderRadius: '12px', padding: '20px', fontSize: '16px', fontWeight: 'bold', textAlign: 'center', minWidth: '180px' } },
  
  // Content generation (parallel at bottom)
  { id: 'joke', position: { x: 200, y: 960 }, data: { label: '😂 Joke Generator' }, style: { background: '#ec4899', color: 'white', border: '2px solid #db2777', borderRadius: '12px', padding: '18px', fontSize: '15px', fontWeight: 'bold', textAlign: 'center', minWidth: '160px' } },
  { id: 'refresher', position: { x: 400, y: 960 }, data: { label: '📚 Educational Refresher' }, style: { background: '#8b5cf6', color: 'white', border: '2px solid #7c3aed', borderRadius: '12px', padding: '18px', fontSize: '15px', fontWeight: 'bold', textAlign: 'center', minWidth: '160px' } },
  
  { id: 'publish', position: { x: 400, y: 1090 }, data: { label: '📝 Format & Publish' }, type: 'output', style: { background: '#059669', color: 'white', border: '2px solid #047857', borderRadius: '12px', padding: '20px', fontSize: '16px', fontWeight: 'bold', textAlign: 'center', minWidth: '180px' } },
];

const initialEdges: Edge[] = [
  // Main vertical pipeline
  { id: 'e1', source: 'fetch', target: 'categorize', animated: true, style: { stroke: '#3b82f6', strokeWidth: 4 }, markerEnd: { type: MarkerType.ArrowClosed, color: '#3b82f6' }, label: '~150 articles' },
  { id: 'e2', source: 'categorize', target: 'rag', animated: true, style: { stroke: '#8b5cf6', strokeWidth: 4 }, markerEnd: { type: MarkerType.ArrowClosed, color: '#8b5cf6' }, label: '~30 categorized' },
  { id: 'e3', source: 'rag', target: 'agent1', animated: true, style: { stroke: '#14b8a6', strokeWidth: 4 }, markerEnd: { type: MarkerType.ArrowClosed, color: '#14b8a6' }, label: '~28 unique' },
  { id: 'e4', source: 'agent1', target: 'agent2', animated: true, style: { stroke: '#10b981', strokeWidth: 4 }, markerEnd: { type: MarkerType.ArrowClosed, color: '#10b981' }, label: '~21 relevant' },
  { id: 'e5', source: 'agent1', target: 'reject1', label: '~7 rejected', style: { stroke: '#ef4444', strokeWidth: 2, strokeDasharray: '5,5' }, markerEnd: { type: MarkerType.ArrowClosed, color: '#ef4444' } },
  { id: 'e6', source: 'agent2', target: 'agent3', animated: true, style: { stroke: '#f59e0b', strokeWidth: 4 }, markerEnd: { type: MarkerType.ArrowClosed, color: '#f59e0b' }, label: '~10 (score ≥6.0)' },
  { id: 'e7', source: 'agent2', target: 'reject2', label: '~11 rejected', style: { stroke: '#ef4444', strokeWidth: 2, strokeDasharray: '5,5' }, markerEnd: { type: MarkerType.ArrowClosed, color: '#ef4444' } },
  { id: 'e8', source: 'agent3', target: 'summarize', animated: true, style: { stroke: '#dc2626', strokeWidth: 4 }, markerEnd: { type: MarkerType.ArrowClosed, color: '#dc2626' }, label: '~6 approved' },
  { id: 'e9', source: 'agent3', target: 'reject3', label: '~4 vetoed', style: { stroke: '#ef4444', strokeWidth: 2, strokeDasharray: '5,5' }, markerEnd: { type: MarkerType.ArrowClosed, color: '#ef4444' } },
  
  // ReACT runs during Agent 2 scoring
  { id: 'e10', source: 'react', target: 'agent2', label: 'Verifies claims', style: { stroke: '#06b6d4', strokeWidth: 3 }, markerEnd: { type: MarkerType.ArrowClosed, color: '#06b6d4' } },
  
  // Content generation (parallel)
  { id: 'e11', source: 'summarize', target: 'joke', animated: true, style: { stroke: '#ec4899', strokeWidth: 3 }, markerEnd: { type: MarkerType.ArrowClosed, color: '#ec4899' } },
  { id: 'e12', source: 'summarize', target: 'refresher', animated: true, style: { stroke: '#8b5cf6', strokeWidth: 3 }, markerEnd: { type: MarkerType.ArrowClosed, color: '#8b5cf6' } },
  { id: 'e13', source: 'joke', target: 'publish', animated: true, style: { stroke: '#ec4899', strokeWidth: 3 }, markerEnd: { type: MarkerType.ArrowClosed, color: '#ec4899' } },
  { id: 'e14', source: 'refresher', target: 'publish', animated: true, style: { stroke: '#8b5cf6', strokeWidth: 3 }, markerEnd: { type: MarkerType.ArrowClosed, color: '#8b5cf6' } },
  { id: 'e15', source: 'summarize', target: 'publish', animated: true, style: { stroke: '#6366f1', strokeWidth: 4 }, markerEnd: { type: MarkerType.ArrowClosed, color: '#6366f1' }, label: '6 articles + summaries' },
];

export default function MASFlow() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  const onConnect = useCallback(
    (params: any) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    if (nodeDetails[node.id as keyof typeof nodeDetails]) {
      setSelectedNode(node.id);
    }
  }, []);

  const closeModal = () => setSelectedNode(null);

  const nodeData = selectedNode ? nodeDetails[selectedNode as keyof typeof nodeDetails] : null;

  return (
    <div style={{ width: '100%', height: '800px', pointerEvents: 'none' }}>
      <div style={{ width: '100%', height: '100%', pointerEvents: 'auto' }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          fitView
          minZoom={0.6}
          maxZoom={0.6}
          zoomOnScroll={false}
          panOnScroll={false}
          panOnDrag={false}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={true}
          defaultViewport={{ x: 0, y: 0, zoom: 0.6 }}
          preventScrolling={false}
        >
          <Background />
        </ReactFlow>
      </div>

      {/* Detail Modal */}
      {nodeData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={closeModal}>
          <div className="bg-white rounded-lg shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex justify-between items-start">
              <h2 className="text-2xl font-bold text-gray-900">{nodeData.title}</h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <p className="text-lg text-gray-700">{nodeData.description}</p>
              
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Filter className="w-5 h-5" /> How It Works
                </h3>
                <ul className="space-y-2">
                  {nodeData.details.map((detail, i) => (
                    <li key={i} className="flex gap-2 text-gray-700">
                      <span className="text-blue-600 mt-1">•</span>
                      <span>{detail}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {nodeData.code && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Code className="w-5 h-5" /> Code Example
                  </h3>
                  <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
                    <code>{nodeData.code}</code>
                  </pre>
                </div>
              )}

              {nodeData.prompt && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Star className="w-5 h-5" /> LLM Prompt
                  </h3>
                  <pre className="bg-blue-50 text-gray-800 p-4 rounded-lg overflow-x-auto text-sm border border-blue-200 whitespace-pre-wrap">
                    {nodeData.prompt}
                  </pre>
                </div>
              )}

              {nodeData.stats && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Database className="w-5 h-5" /> Performance Stats
                  </h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-600 mb-1">Input</p>
                      <p className="text-lg font-bold text-blue-600">{nodeData.stats.input}</p>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-600 mb-1">Output</p>
                      <p className="text-lg font-bold text-green-600">{nodeData.stats.output}</p>
                    </div>
                    <div className="bg-purple-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-600 mb-1">Avg Time</p>
                      <p className="text-lg font-bold text-purple-600">{nodeData.stats.avgTime}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
