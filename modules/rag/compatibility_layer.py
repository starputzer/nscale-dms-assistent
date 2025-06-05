"""Compatibility layer for smooth migration between RAG implementations"""
import asyncio
import json
import logging
from typing import AsyncGenerator, Optional, Dict, Any, List
from sse_starlette.sse import EventSourceResponse
from dataclasses import dataclass
import time

from ..core.config import Config
from .engine import RAGEngine
from .error_handler import error_handler, DependencyError

logger = logging.getLogger(__name__)


@dataclass
class MigrationMetrics:
    """Metrics for tracking migration progress"""
    total_requests: int = 0
    optimized_requests: int = 0
    errors: int = 0
    avg_latency_current: float = 0.0
    avg_latency_optimized: float = 0.0
    cache_hits: int = 0
    fallback_count: int = 0


class CompatibilityLayer:
    """
    Provides compatibility between current and optimized RAG implementations
    """
    
    def __init__(self):
        self.current_engine = None
        self.optimized_engine = None
        self.metrics = MigrationMetrics()
        self.mode = Config.RAG_OPTIMIZATION_MODE  # shadow, canary, full
        self.canary_percentage = int(Config.CANARY_PERCENTAGE or 10)
        
        # Check dependencies
        self.dependencies = error_handler.check_dependencies()
        self.can_use_optimized = self._check_optimized_availability()
    
    def _check_optimized_availability(self) -> bool:
        """Check if optimized engine can be used"""
        required_deps = ['faiss', 'spacy', 'embedding_model']
        missing = [dep for dep in required_deps if not self.dependencies.get(dep)]
        
        if missing:
            logger.warning(f"Cannot use optimized engine, missing: {missing}")
            return False
        
        return True
    
    async def initialize(self) -> bool:
        """Initialize engines based on configuration"""
        try:
            # Always initialize current engine
            self.current_engine = RAGEngine()
            if not await self.current_engine.initialize():
                return False
            
            # Try to initialize optimized engine if enabled
            if Config.USE_OPTIMIZED_RAG and self.can_use_optimized:
                try:
                    from modules.rag.optimized_rag_engine import OptimizedRAGEngine
                    from modules.rag.rag_optimizer_config import get_balanced_config
                    
                    # Get fallback config if dependencies missing
                    config = get_balanced_config()
                    if not all(self.dependencies.values()):
                        fallback_settings = error_handler.get_fallback_config(self.dependencies)
                        # Apply fallback settings
                        config.cache.backend = fallback_settings['cache_backend']
                        config.embedding.device = fallback_settings['device']
                    
                    self.optimized_engine = OptimizedRAGEngine(config)
                    await self.optimized_engine.initialize()
                    logger.info(f"Optimized engine initialized in {self.mode} mode")
                    
                except Exception as e:
                    logger.error(f"Failed to initialize optimized engine: {e}")
                    self.optimized_engine = None
                    self.can_use_optimized = False
            
            return True
            
        except Exception as e:
            logger.error(f"Initialization failed: {e}")
            return False
    
    def _should_use_optimized(self) -> bool:
        """Determine if optimized engine should be used for this request"""
        if not self.optimized_engine or not self.can_use_optimized:
            return False
        
        if self.mode == 'full':
            return True
        elif self.mode == 'canary':
            import random
            return random.randint(1, 100) <= self.canary_percentage
        else:  # shadow mode
            return False
    
    async def stream_answer_chunks(self,
                                  question: str,
                                  session_id: Optional[int] = None,
                                  use_simple_language: bool = False,
                                  stream_id: Optional[str] = None) -> AsyncGenerator[str, None]:
        """
        Stream answer with compatibility handling
        """
        self.metrics.total_requests += 1
        start_time = time.time()
        
        # Determine which engine to use
        use_optimized = self._should_use_optimized()
        
        if use_optimized:
            self.metrics.optimized_requests += 1
            try:
                # Convert optimized format to current format
                async for chunk in self._stream_optimized(
                    question, session_id, use_simple_language, stream_id
                ):
                    yield chunk
                    
                latency = time.time() - start_time
                self._update_latency_metrics('optimized', latency)
                
            except Exception as e:
                logger.error(f"Optimized engine error: {e}, falling back")
                self.metrics.errors += 1
                self.metrics.fallback_count += 1
                
                # Fallback to current engine
                async for chunk in self.current_engine.stream_answer_chunks(
                    question, session_id, use_simple_language
                ):
                    yield chunk
        else:
            # Use current engine
            async for chunk in self.current_engine.stream_answer_chunks(
                question, session_id, use_simple_language
            ):
                yield chunk
            
            latency = time.time() - start_time
            self._update_latency_metrics('current', latency)
        
        # Run shadow comparison if enabled
        if self.mode == 'shadow' and self.optimized_engine:
            asyncio.create_task(
                self._shadow_comparison(question, session_id, use_simple_language)
            )
    
    async def _stream_optimized(self,
                               question: str,
                               session_id: Optional[int],
                               use_simple_language: bool,
                               stream_id: Optional[str]) -> AsyncGenerator[str, None]:
        """
        Stream from optimized engine with format conversion
        """
        # The optimized engine returns different format, convert it
        async for chunk in self.optimized_engine.stream_answer(
            question, session_id, use_simple_language, stream_id
        ):
            try:
                # Parse optimized format
                data = json.loads(chunk)
                
                # Convert to current format
                if 'response' in data:
                    # Current format expects plain JSON without SSE prefix
                    yield json.dumps({'response': data['response']})
                elif 'error' in data:
                    yield json.dumps({'error': data['error']})
                elif 'done' in data:
                    # Add compatibility fields
                    yield json.dumps({
                        'done': True,
                        'context': self._format_sources(data.get('metadata', {}))
                    })
                    
            except json.JSONDecodeError:
                # If not JSON, pass through as-is
                yield chunk
    
    def _format_sources(self, metadata: Dict[str, Any]) -> str:
        """Format metadata sources for compatibility"""
        sources = metadata.get('sources', [])
        if sources:
            return f"Quellen: {', '.join(sources)}"
        return ""
    
    async def _shadow_comparison(self,
                                question: str,
                                session_id: Optional[int],
                                use_simple_language: bool):
        """Run optimized engine in shadow for comparison"""
        try:
            start_time = time.time()
            chunks = []
            
            async for chunk in self._stream_optimized(
                question, session_id, use_simple_language, None
            ):
                chunks.append(chunk)
            
            latency = time.time() - start_time
            
            # Log comparison metrics
            logger.info(f"Shadow comparison - Query: {question[:50]}..., "
                       f"Latency: {latency:.2f}s, Chunks: {len(chunks)}")
            
            self._update_latency_metrics('optimized_shadow', latency)
            
        except Exception as e:
            logger.error(f"Shadow comparison error: {e}")
    
    def _update_latency_metrics(self, engine_type: str, latency: float):
        """Update latency metrics with moving average"""
        if engine_type == 'current':
            count = self.metrics.total_requests - self.metrics.optimized_requests
            if count > 0:
                self.metrics.avg_latency_current = (
                    (self.metrics.avg_latency_current * (count - 1) + latency) / count
                )
        elif engine_type in ['optimized', 'optimized_shadow']:
            if self.metrics.optimized_requests > 0:
                self.metrics.avg_latency_optimized = (
                    (self.metrics.avg_latency_optimized * (self.metrics.optimized_requests - 1) + latency) 
                    / self.metrics.optimized_requests
                )
    
    async def search(self, query: str, k: int = 5, **kwargs) -> List[Dict[str, Any]]:
        """Search with compatibility handling"""
        if self._should_use_optimized() and hasattr(self.optimized_engine, 'search'):
            try:
                result = await self.optimized_engine.search(query, k, **kwargs)
                # Extract results from optimized format
                if isinstance(result, dict) and 'results' in result:
                    self.metrics.cache_hits += 1 if result.get('cache_hit') else 0
                    return result['results']
                return result
            except Exception as e:
                logger.error(f"Optimized search failed: {e}")
                self.metrics.fallback_count += 1
        
        # Fallback to current implementation
        return self.current_engine.embedding_manager.search(query, top_k=k)
    
    def get_metrics(self) -> Dict[str, Any]:
        """Get migration metrics"""
        return {
            'total_requests': self.metrics.total_requests,
            'optimized_requests': self.metrics.optimized_requests,
            'optimized_percentage': (
                self.metrics.optimized_requests / self.metrics.total_requests * 100 
                if self.metrics.total_requests > 0 else 0
            ),
            'errors': self.metrics.errors,
            'error_rate': (
                self.metrics.errors / self.metrics.total_requests * 100
                if self.metrics.total_requests > 0 else 0
            ),
            'avg_latency_current': round(self.metrics.avg_latency_current, 3),
            'avg_latency_optimized': round(self.metrics.avg_latency_optimized, 3),
            'latency_improvement': (
                (self.metrics.avg_latency_current - self.metrics.avg_latency_optimized) 
                / self.metrics.avg_latency_current * 100
                if self.metrics.avg_latency_current > 0 else 0
            ),
            'cache_hits': self.metrics.cache_hits,
            'cache_hit_rate': (
                self.metrics.cache_hits / self.metrics.optimized_requests * 100
                if self.metrics.optimized_requests > 0 else 0
            ),
            'fallback_count': self.metrics.fallback_count,
            'mode': self.mode,
            'canary_percentage': self.canary_percentage if self.mode == 'canary' else None,
            'dependencies': self.dependencies
        }
    
    async def health_check(self) -> Dict[str, Any]:
        """Check health of both engines"""
        health = {
            'current_engine': 'healthy' if self.current_engine else 'not_initialized',
            'optimized_engine': 'healthy' if self.optimized_engine else 'not_available',
            'mode': self.mode,
            'can_use_optimized': self.can_use_optimized,
            'dependencies': self.dependencies,
            'metrics': self.get_metrics()
        }
        
        # Test search functionality
        try:
            results = await self.search("test", k=1)
            health['search_functional'] = len(results) > 0
        except:
            health['search_functional'] = False
        
        return health
    
    async def stream_answer(self, question: str, session_id: Optional[int] = None,
                          use_simple_language: bool = False, stream_id: Optional[str] = None) -> EventSourceResponse:
        """Stream answer from the appropriate engine"""
        self.metrics.total_requests += 1
        
        # Determine which engine to use
        use_optimized = self._should_use_optimized()
        
        # Both engines return EventSourceResponse directly
        if use_optimized and self.optimized_engine:
            self.metrics.optimized_requests += 1
            logger.info(f"Using optimized engine for streaming (mode: {self.mode})")
            
            try:
                return await self.optimized_engine.stream_answer(
                    question, session_id, use_simple_language, stream_id
                )
            except Exception as e:
                self.metrics.errors += 1
                self.metrics.fallback_count += 1
                logger.error(f"Optimized engine failed: {e}, falling back to current engine")
                
                # Fallback to current engine
                return await self.current_engine.stream_answer(
                    question, session_id, use_simple_language, stream_id
                )
        else:
            # Use current engine
            logger.info("Using current engine for streaming")
            return await self.current_engine.stream_answer(
                question, session_id, use_simple_language, stream_id
            )


# Singleton instance
_compatibility_layer = None

def get_compatibility_layer() -> CompatibilityLayer:
    """Get or create compatibility layer instance"""
    global _compatibility_layer
    if _compatibility_layer is None:
        _compatibility_layer = CompatibilityLayer()
    return _compatibility_layer


# Example usage
if __name__ == "__main__":
    async def test_compatibility():
        layer = get_compatibility_layer()
        
        # Initialize
        if not await layer.initialize():
            print("Initialization failed")
            return
        
        # Test search
        results = await layer.search("Was ist nscale?", k=3)
        print(f"Search results: {len(results)}")
        
        # Test streaming
        print("\nStreaming answer:")
        async for chunk in layer.stream_answer_chunks(
            "Wie funktioniert die Dokumentenverwaltung?",
            session_id=1
        ):
            print(chunk, end='', flush=True)
        
        # Get metrics
        print(f"\n\nMetrics: {json.dumps(layer.get_metrics(), indent=2)}")
        
        # Health check
        health = await layer.health_check()
        print(f"\nHealth: {json.dumps(health, indent=2)}")
    
    asyncio.run(test_compatibility())