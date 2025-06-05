"""Error handling and fallback mechanisms for RAG optimization"""
import logging
import functools
import asyncio
from typing import Any, Callable, Optional, Dict
from dataclasses import dataclass
from enum import Enum

logger = logging.getLogger(__name__)


class ErrorLevel(Enum):
    """Error severity levels"""
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"


@dataclass
class RAGError:
    """Structured error information"""
    level: ErrorLevel
    component: str
    message: str
    fallback_action: Optional[str] = None
    user_message: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


class DependencyError(Exception):
    """Raised when a required dependency is missing"""
    pass


class ConfigurationError(Exception):
    """Raised when configuration is invalid"""
    pass


class ResourceError(Exception):
    """Raised when resources (memory, GPU) are insufficient"""
    pass


def with_fallback(fallback_value=None, error_handler=None):
    """
    Decorator for methods with fallback behavior
    """
    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        async def async_wrapper(*args, **kwargs):
            try:
                return await func(*args, **kwargs)
            except Exception as e:
                logger.error(f"Error in {func.__name__}: {e}")
                if error_handler:
                    return await error_handler(e, *args, **kwargs)
                return fallback_value
        
        @functools.wraps(func)
        def sync_wrapper(*args, **kwargs):
            try:
                return func(*args, **kwargs)
            except Exception as e:
                logger.error(f"Error in {func.__name__}: {e}")
                if error_handler:
                    return error_handler(e, *args, **kwargs)
                return fallback_value
        
        return async_wrapper if asyncio.iscoroutinefunction(func) else sync_wrapper
    return decorator


class RAGErrorHandler:
    """
    Centralized error handling for RAG components
    """
    
    def __init__(self):
        self.fallback_strategies = {
            'redis_unavailable': self._fallback_memory_cache,
            'model_missing': self._fallback_simple_search,
            'gpu_unavailable': self._fallback_basic_nlp,
            'index_corrupted': self._fallback_simple_search,
        }
    
    async def handle_dependency_error(self, error: DependencyError, component: str) -> Dict[str, Any]:
        """Handle missing dependency errors"""
        if "redis" in str(error).lower():
            logger.warning("Redis unavailable, falling back to memory cache")
            return await self._fallback_memory_cache()
        
        elif "faiss" in str(error).lower():
            logger.warning("FAISS unavailable, falling back to simple search")
            return await self._fallback_simple_search()
        
        elif "spacy" in str(error).lower():
            logger.warning("Spacy unavailable, falling back to basic tokenization")
            return await self._fallback_basic_nlp()
        
        else:
            raise error
    
    async def _fallback_memory_cache(self) -> Dict[str, Any]:
        """Fallback to in-memory caching when Redis unavailable"""
        from collections import OrderedDict
        
        class SimpleMemoryCache:
            def __init__(self, max_size=1000):
                self.cache = OrderedDict()
                self.max_size = max_size
            
            async def get(self, key: str):
                return self.cache.get(key)
            
            async def set(self, key: str, value: Any, ttl: int = None):
                if len(self.cache) >= self.max_size:
                    self.cache.popitem(last=False)
                self.cache[key] = value
            
            def invalidate(self, pattern: str = None):
                if pattern:
                    keys_to_remove = [k for k in self.cache if pattern in k]
                    for k in keys_to_remove:
                        del self.cache[k]
                else:
                    self.cache.clear()
        
        return {'cache': SimpleMemoryCache(), 'type': 'memory'}
    
    async def _fallback_simple_search(self) -> Dict[str, Any]:
        """Fallback to simple cosine similarity search"""
        logger.info("Using simple search fallback")
        
        class SimpleRetriever:
            def __init__(self):
                self.embeddings = []
                self.documents = []
            
            async def search(self, query: str, k: int = 5):
                # Simple TF-IDF or embedding-based search
                from sklearn.feature_extraction.text import TfidfVectorizer
                from sklearn.metrics.pairwise import cosine_similarity
                
                if not self.documents:
                    return []
                
                vectorizer = TfidfVectorizer()
                doc_vectors = vectorizer.fit_transform(self.documents)
                query_vector = vectorizer.transform([query])
                
                similarities = cosine_similarity(query_vector, doc_vectors)[0]
                top_indices = similarities.argsort()[-k:][::-1]
                
                return [
                    {
                        'text': self.documents[i],
                        'score': float(similarities[i]),
                        'metadata': {}
                    }
                    for i in top_indices
                ]
        
        return {'retriever': SimpleRetriever(), 'type': 'simple'}
    
    async def _fallback_basic_nlp(self) -> Dict[str, Any]:
        """Fallback to basic NLP without Spacy"""
        import re
        import string
        
        class BasicNLP:
            def __init__(self):
                self.stop_words = {
                    'der', 'die', 'das', 'und', 'ist', 'in', 'von', 'mit',
                    'auf', 'für', 'zu', 'den', 'des', 'dem', 'als', 'ein',
                    'eine', 'einer', 'eines', 'ich', 'du', 'er', 'sie', 'es',
                    'wir', 'ihr', 'Sie', 'nicht', 'wird', 'sein', 'hat', 'kann'
                }
            
            def tokenize(self, text: str) -> list:
                # Basic tokenization
                text = text.lower()
                text = re.sub(f'[{string.punctuation}]', ' ', text)
                tokens = text.split()
                return [t for t in tokens if t and t not in self.stop_words]
            
            def extract_keywords(self, text: str, n: int = 5) -> list:
                tokens = self.tokenize(text)
                # Simple frequency-based extraction
                from collections import Counter
                word_freq = Counter(tokens)
                return [word for word, _ in word_freq.most_common(n)]
        
        return {'nlp': BasicNLP(), 'type': 'basic'}
    
    def check_dependencies(self) -> Dict[str, bool]:
        """Check availability of all dependencies"""
        dependencies = {}
        
        # Check Redis
        try:
            import redis
            r = redis.Redis(host='localhost', port=6379)
            r.ping()
            dependencies['redis'] = True
        except:
            dependencies['redis'] = False
        
        # Check FAISS
        try:
            import faiss
            dependencies['faiss'] = True
        except:
            dependencies['faiss'] = False
        
        # Check Spacy
        try:
            import spacy
            spacy.load("de_core_news_md")
            dependencies['spacy'] = True
        except:
            dependencies['spacy'] = False
        
        # Check GPU
        try:
            import torch
            dependencies['cuda'] = torch.cuda.is_available()
        except:
            dependencies['cuda'] = False
        
        # Check Models
        try:
            from sentence_transformers import SentenceTransformer
            SentenceTransformer('paraphrase-multilingual-MiniLM-L12-v2')
            dependencies['embedding_model'] = True
        except:
            dependencies['embedding_model'] = False
        
        return dependencies
    
    def get_fallback_config(self, available_deps: Dict[str, bool]) -> Dict[str, Any]:
        """Generate fallback configuration based on available dependencies"""
        config = {
            'cache_backend': 'redis' if available_deps.get('redis') else 'memory',
            'retriever_type': 'hybrid' if available_deps.get('faiss') else 'simple',
            'nlp_backend': 'spacy' if available_deps.get('spacy') else 'basic',
            'device': 'cuda' if available_deps.get('cuda') else 'cpu',
            'embedding_model': 'BAAI/bge-m3' if available_deps.get('embedding_model') else 'paraphrase-multilingual-MiniLM-L12-v2'
        }
        
        return config


# Globale Error Handler Instanz
error_handler = RAGErrorHandler()


def graceful_import(module_name: str, fallback=None):
    """Gracefully import a module with fallback"""
    try:
        return __import__(module_name)
    except ImportError as e:
        logger.warning(f"Could not import {module_name}: {e}")
        if fallback:
            return fallback
        raise DependencyError(f"Required module {module_name} not available")


# Beispiel-Verwendung
if __name__ == "__main__":
    import asyncio
    
    async def test_error_handling():
        handler = RAGErrorHandler()
        
        # Check dependencies
        deps = handler.check_dependencies()
        print("Available dependencies:")
        for dep, available in deps.items():
            print(f"  {dep}: {'✓' if available else '✗'}")
        
        # Get fallback config
        config = handler.get_fallback_config(deps)
        print("\nFallback configuration:")
        for key, value in config.items():
            print(f"  {key}: {value}")
        
        # Test fallbacks
        if not deps.get('redis'):
            cache_fallback = await handler._fallback_memory_cache()
            print(f"\nUsing {cache_fallback['type']} cache as fallback")
    
    asyncio.run(test_error_handling())