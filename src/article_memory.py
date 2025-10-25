"""
Article Memory System using RAG (Retrieval-Augmented Generation)

Prevents repetitive content by storing sent articles in a vector database
and checking similarity before sending new articles.
"""

import os
from datetime import datetime, timedelta
from pathlib import Path
from typing import List, Dict, Optional, Tuple
import chromadb
from chromadb.config import Settings
from langchain_openai import OpenAIEmbeddings

# Constants
SIMILARITY_THRESHOLD = 0.85  # Reject if >85% similar
LOOKBACK_DAYS = 60  # Check last 60 days
DB_PATH = Path(__file__).parent.parent / 'data' / 'article_memory'


class ArticleMemory:
    """
    Manages article memory using Chroma vector store.
    Provides deduplication and topic coverage tracking.
    """
    
    def __init__(self):
        """Initialize Chroma client and collection"""
        DB_PATH.mkdir(parents=True, exist_ok=True)
        
        self.client = chromadb.PersistentClient(
            path=str(DB_PATH),
            settings=Settings(anonymized_telemetry=False)
        )
        
        # Check if OpenAI API key is available for embeddings
        if not os.getenv("OPENAI_API_KEY"):
            print("⚠️  Warning: No OPENAI_API_KEY found. RAG deduplication disabled.")
            print("   Set OPENAI_API_KEY to enable semantic similarity checking.")
            self.embeddings = None
            self.collection = None
            return
        
        self.embeddings = OpenAIEmbeddings()
        
        # Create or get collection
        try:
            self.collection = self.client.get_collection(name="sent_articles")
        except:
            self.collection = self.client.create_collection(
                name="sent_articles",
                metadata={"description": "Articles sent in AI News Digest"}
            )
    
    def check_if_duplicate(self, article: Dict) -> Tuple[bool, Optional[str]]:
        """
        Check if article is too similar to recently sent content.
        
        Args:
            article: Article dict with 'title' and 'summary'
        
        Returns:
            (is_duplicate, reason) tuple
        """
        if not self.collection:
            return False, None
        
        # Create query text
        query_text = f"{article['title']} {article.get('summary', '')}"
        
        # Calculate cutoff date
        cutoff_date = datetime.now() - timedelta(days=LOOKBACK_DAYS)
        cutoff_timestamp = cutoff_date.isoformat()
        
        try:
            # Query for similar articles in last LOOKBACK_DAYS
            results = self.collection.query(
                query_texts=[query_text],
                n_results=5,
                where={"sent_date": {"$gte": cutoff_timestamp}}
            )
            
            # Check similarity scores
            if results['distances'] and len(results['distances'][0]) > 0:
                for i, distance in enumerate(results['distances'][0]):
                    # Chroma returns L2 distance, convert to similarity
                    # Lower distance = more similar
                    # For cosine similarity, we'd use: similarity = 1 - distance
                    # For L2: rough approximation
                    similarity = 1 / (1 + distance)
                    
                    if similarity > SIMILARITY_THRESHOLD:
                        matched_metadata = results['metadatas'][0][i]
                        days_ago = (datetime.now() - datetime.fromisoformat(matched_metadata['sent_date'])).days
                        
                        reason = (
                            f"Too similar ({similarity:.1%}) to '{matched_metadata['title']}' "
                            f"sent {days_ago} days ago"
                        )
                        return True, reason
            
            return False, None
            
        except Exception as e:
            print(f"⚠️  RAG similarity check failed: {e}")
            return False, None
    
    def store_article(self, article: Dict, category: str, quality_score: float):
        """
        Store sent article for future duplicate detection.
        
        Args:
            article: Article dict with 'title', 'summary', 'link'
            category: Category the article was sent under
            quality_score: Quality score assigned to article
        """
        if not self.collection:
            return
        
        try:
            # Create document text
            doc_text = f"{article['title']} {article.get('summary', '')}"
            
            # Create metadata
            metadata = {
                'title': article['title'],
                'url': article.get('link', ''),
                'category': category,
                'quality_score': quality_score,
                'sent_date': datetime.now().isoformat(),
                'source': article.get('source', 'Unknown')
            }
            
            # Generate unique ID
            doc_id = f"{datetime.now().timestamp()}_{article['title'][:50]}"
            
            # Add to collection
            self.collection.add(
                documents=[doc_text],
                metadatas=[metadata],
                ids=[doc_id]
            )
            
        except Exception as e:
            print(f"⚠️  Failed to store article in RAG memory: {e}")
    
    def get_topic_coverage(self, category: str, days: int = 30) -> Dict[str, int]:
        """
        Get topic distribution for a category in last N days.
        
        Args:
            category: Category to analyze
            days: Number of days to look back
        
        Returns:
            Dict mapping topics to article counts
        """
        if not self.collection:
            return {}
        
        cutoff_date = datetime.now() - timedelta(days=days)
        cutoff_timestamp = cutoff_date.isoformat()
        
        try:
            # Get all articles in category from last N days
            results = self.collection.get(
                where={
                    "$and": [
                        {"category": {"$eq": category}},
                        {"sent_date": {"$gte": cutoff_timestamp}}
                    ]
                }
            )
            
            # Count articles (simplified - could cluster by topic)
            topic_counts = {}
            if results['metadatas']:
                for metadata in results['metadatas']:
                    title = metadata['title']
                    # Simple keyword extraction (could use NLP for better clustering)
                    keywords = title.lower().split()
                    for keyword in keywords:
                        if len(keyword) > 4:  # Skip short words
                            topic_counts[keyword] = topic_counts.get(keyword, 0) + 1
            
            # Return top topics
            sorted_topics = sorted(topic_counts.items(), key=lambda x: x[1], reverse=True)
            return dict(sorted_topics[:10])  # Top 10 topics
            
        except Exception as e:
            print(f"⚠️  Failed to get topic coverage: {e}")
            return {}
    
    def get_stats(self) -> Dict:
        """Get statistics about stored articles"""
        if not self.collection:
            return {"enabled": False}
        
        try:
            count = self.collection.count()
            return {
                "enabled": True,
                "total_articles": count,
                "lookback_days": LOOKBACK_DAYS,
                "similarity_threshold": SIMILARITY_THRESHOLD
            }
        except Exception as e:
            return {"enabled": True, "error": str(e)}


# Global instance (singleton pattern)
_memory_instance = None

def get_article_memory() -> ArticleMemory:
    """Get or create singleton instance of ArticleMemory"""
    global _memory_instance
    if _memory_instance is None:
        _memory_instance = ArticleMemory()
    return _memory_instance

