import React, { useState, useCallback } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Node,
  Edge,
  addEdge,
  Connection,
  useNodesState,
  useEdgesState,
  MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { X, Code, Filter, Star, Ban, Database } from 'lucide-react';

// Node data with detailed information
const nodeDetails = {
  'fetch': {
    title: '📡 Multi-Source Aggregation',
    description: 'Fetch articles from multiple sources',
    details: [
      'arXiv API: CS.AI, CS.LG, CS.CL categories',
      'RSS Feeds: TechCrunch, VentureBeat, MIT Tech Review, Google Research',
      'Hacker News API: Top AI-related discussions',
      'Fetches ~120-150 articles per day'
    ],
    code: `async def fetch_articles():
    sources = [
        fetch_arxiv(),
        fetch_rss_feeds(),
        fetch_hackernews()
    ]
    articles = await gather(*sources)
    return articles`,
    stats: { input: '0 articles', output: '~150 articles/day', avgTime: '30s' }
  },
  'categorize': {
    title: '🏷️ Smart Categorization',
    description: 'Hybrid system assigns articles to categories',
    details: [
      'Rule-based: Keyword matching for obvious cases',
      'LLM-based: Gemini 1.5 Flash for ambiguous articles',
      'Categories: ML Monday, Tech Tuesday, Web Wednesday, Thought Thursday, Fun Friday'
    ],
    code: `def categorize(article):
    # Rule-based first
    if any(kw in article.title for kw in ML_KEYWORDS):
        return "ml_monday"
    
    # LLM for ambiguous
    prompt = f"Categorize: {article.title}"
    return llm.classify(prompt)`,
    stats: { input: '150 articles', output: '150 categorized', avgTime: '0.2s/article' }
  },
  'agent1': {
    title: '🚪 Agent 1: Relevance Gatekeeper',
    description: 'Binary YES/NO relevance filter',
    details: [
      'Strict category-specific relevance check',
      'Uses few-shot examples for each category',
      'Fail mode: CLOSED (reject on error)',
      'Typical rejection rate: ~80%'
    ],
    prompt: `You are a relevance filter for ML Monday articles.

YES if:
- New ML models, architectures, or techniques
- Training methods, benchmarks, datasets
- Practical ML applications with technical depth

NO if:
- General tech news without ML focus
- AI hype without technical substance
- Business news only (no technical content)

Article: "{title}"
Summary: "{summary}"

Answer: YES or NO`,
    stats: { input: '150 articles', output: '~30 articles (80% rejected)', avgTime: '0.5s/article' }
  },
  'agent2': {
    title: '⭐ Agent 2: Quality Scorer',
    description: 'Multi-dimensional quality assessment',
    details: [
      'Novelty: New methods, breakthrough results (0-10)',
      'Practical Applicability: Can developers use this? (0-10)',
      'Significance: Impact on field, industry relevance (0-10)',
      'Weighted average: novelty×0.4 + applicability×0.3 + significance×0.3',
      'Threshold: 6.0/10 to pass'
    ],
    prompt: `Rate this article on 3 dimensions (0-10):

1. NOVELTY: Is this new/breakthrough?
2. APPLICABILITY: Can developers/researchers use this?
3. SIGNIFICANCE: Does this matter to the field?

Article: "{title}"
Summary: "{summary}"

Return JSON:
{
  "novelty": X,
  "applicability": Y,
  "significance": Z,
  "reasoning": "..."
}`,
    stats: { input: '30 articles', output: '~10 articles (score ≥6.0)', avgTime: '1.2s/article' }
  },
  'agent3': {
    title: '🚫 Agent 3: Negative Filter',
    description: 'Final veto power - removes time-wasters',
    details: [
      'Vague announcements without substance',
      'Pure marketing hype',
      'Redundant content (already covered)',
      'Clickbait or misleading titles',
      'Waste-of-time score: 0-10 (>5 = rejected)'
    ],
    prompt: `You are the final filter. Rate how much this article would WASTE readers' time (0-10).

High waste (7-10):
- Vague announcements ("Company X announces AI initiative")
- Pure hype without technical details
- Redundant (we've covered this before)
- Clickbait titles

Low waste (0-3):
- Actionable insights
- Novel technical content
- Clear value proposition

Article: "{title}"
Summary: "{summary}"

Return: waste_score (0-10) and reasoning`,
    stats: { input: '10 articles', output: '~6 articles (waste <5)', avgTime: '0.8s/article' }
  },
  'publish': {
    title: '📝 Publish to Database',
    description: 'Store approved articles as draft digest',
    details: [
      'Create draft digest in Supabase',
      'Status: "draft" (requires admin approval)',
      'Includes all article metadata',
      'Ready for admin review and publishing'
    ],
    code: `async def publish_digest(articles, category):
    digest = {
        "title": f"{category} - {date}",
        "category": category,
        "content": articles,
        "status": "draft",
        "published_date": today()
    }
    await db.insert("digests", digest)`,
    stats: { input: '~6 articles', output: '1 draft digest', avgTime: '0.1s' }
  }
};

const initialNodes: Node[] = [
  { id: 'fetch', position: { x: 50, y: 150 }, data: { label: '📡 Fetch Data' }, type: 'input', style: { background: '#3b82f6', color: 'white', border: '2px solid #2563eb', borderRadius: '12px', padding: '20px', fontSize: '16px', fontWeight: 'bold' } },
  { id: 'categorize', position: { x: 300, y: 150 }, data: { label: '🏷️ Categorize' }, style: { background: '#8b5cf6', color: 'white', border: '2px solid #7c3aed', borderRadius: '12px', padding: '20px', fontSize: '16px', fontWeight: 'bold' } },
  { id: 'agent1', position: { x: 550, y: 150 }, data: { label: '🚪 Agent 1\nRelevance' }, style: { background: '#10b981', color: 'white', border: '2px solid #059669', borderRadius: '12px', padding: '20px', fontSize: '16px', fontWeight: 'bold', textAlign: 'center' } },
  { id: 'reject1', position: { x: 550, y: 320 }, data: { label: '❌ Reject\n(~80%)' }, style: { background: '#ef4444', color: 'white', border: '2px solid #dc2626', borderRadius: '8px', padding: '15px', fontSize: '14px', textAlign: 'center' } },
  { id: 'agent2', position: { x: 800, y: 150 }, data: { label: '⭐ Agent 2\nQuality' }, style: { background: '#f59e0b', color: 'white', border: '2px solid #d97706', borderRadius: '12px', padding: '20px', fontSize: '16px', fontWeight: 'bold', textAlign: 'center' } },
  { id: 'reject2', position: { x: 800, y: 320 }, data: { label: '❌ Reject\n(score <6)' }, style: { background: '#ef4444', color: 'white', border: '2px solid #dc2626', borderRadius: '8px', padding: '15px', fontSize: '14px', textAlign: 'center' } },
  { id: 'agent3', position: { x: 1050, y: 150 }, data: { label: '🚫 Agent 3\nNegative Filter' }, style: { background: '#dc2626', color: 'white', border: '2px solid #b91c1c', borderRadius: '12px', padding: '20px', fontSize: '16px', fontWeight: 'bold', textAlign: 'center' } },
  { id: 'reject3', position: { x: 1050, y: 320 }, data: { label: '❌ Veto\n(waste >5)' }, style: { background: '#ef4444', color: 'white', border: '2px solid #dc2626', borderRadius: '8px', padding: '15px', fontSize: '14px', textAlign: 'center' } },
  { id: 'publish', position: { x: 1300, y: 150 }, data: { label: '📝 Publish\nDraft' }, type: 'output', style: { background: '#059669', color: 'white', border: '2px solid #047857', borderRadius: '12px', padding: '20px', fontSize: '16px', fontWeight: 'bold', textAlign: 'center' } },
];

const initialEdges: Edge[] = [
  { id: 'e1', source: 'fetch', target: 'categorize', animated: true, style: { stroke: '#3b82f6', strokeWidth: 3 }, markerEnd: { type: MarkerType.ArrowClosed, color: '#3b82f6' } },
  { id: 'e2', source: 'categorize', target: 'agent1', animated: true, style: { stroke: '#8b5cf6', strokeWidth: 3 }, markerEnd: { type: MarkerType.ArrowClosed, color: '#8b5cf6' } },
  { id: 'e3', source: 'agent1', target: 'agent2', label: 'Pass', animated: true, style: { stroke: '#10b981', strokeWidth: 3 }, markerEnd: { type: MarkerType.ArrowClosed, color: '#10b981' } },
  { id: 'e4', source: 'agent1', target: 'reject1', label: 'Fail', style: { stroke: '#ef4444', strokeWidth: 2, strokeDasharray: '5,5' }, markerEnd: { type: MarkerType.ArrowClosed, color: '#ef4444' } },
  { id: 'e5', source: 'agent2', target: 'agent3', label: 'Score ≥6', animated: true, style: { stroke: '#f59e0b', strokeWidth: 3 }, markerEnd: { type: MarkerType.ArrowClosed, color: '#f59e0b' } },
  { id: 'e6', source: 'agent2', target: 'reject2', label: 'Score <6', style: { stroke: '#ef4444', strokeWidth: 2, strokeDasharray: '5,5' }, markerEnd: { type: MarkerType.ArrowClosed, color: '#ef4444' } },
  { id: 'e7', source: 'agent3', target: 'publish', label: 'Waste <5', animated: true, style: { stroke: '#dc2626', strokeWidth: 3 }, markerEnd: { type: MarkerType.ArrowClosed, color: '#dc2626' } },
  { id: 'e8', source: 'agent3', target: 'reject3', label: 'Waste >5', style: { stroke: '#ef4444', strokeWidth: 2, strokeDasharray: '5,5' }, markerEnd: { type: MarkerType.ArrowClosed, color: '#ef4444' } },
];

export default function MASFlow() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
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
    <div className="w-full h-screen relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        fitView
        minZoom={0.5}
        maxZoom={1.5}
      >
        <Background />
        <Controls />
        <MiniMap zoomable pannable />
      </ReactFlow>

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

      {/* Instructions */}
      <div className="absolute top-4 left-4 bg-white rounded-lg shadow-lg p-4 max-w-xs z-10">
        <h3 className="font-bold text-gray-900 mb-2">🎮 Interactive Controls</h3>
        <ul className="text-sm text-gray-700 space-y-1">
          <li>• <strong>Click nodes</strong> to see details</li>
          <li>• <strong>Drag</strong> to pan the canvas</li>
          <li>• <strong>Scroll</strong> to zoom in/out</li>
          <li>• <strong>Use controls</strong> on the left</li>
        </ul>
      </div>
    </div>
  );
}

