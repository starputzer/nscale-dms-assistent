"""Frontend adapter for handling different response formats"""
import json
import logging
from typing import AsyncGenerator, Dict, Any, Optional
from dataclasses import dataclass
import re

logger = logging.getLogger(__name__)


@dataclass 
class ResponseMetadata:
    """Structured metadata from optimized responses"""
    tokens: int = 0
    sources: list = None
    confidence: float = 0.0
    processing_time: float = 0.0
    cache_hit: bool = False
    
    def __post_init__(self):
        if self.sources is None:
            self.sources = []


class FrontendAdapter:
    """
    Adapts optimized RAG responses to current frontend format
    Ensures backward compatibility while adding new features
    """
    
    def __init__(self, enable_metadata: bool = True):
        self.enable_metadata = enable_metadata
        self.response_buffer = ""
        self.metadata = ResponseMetadata()
    
    async def adapt_stream(self, 
                          optimized_stream: AsyncGenerator[str, None],
                          legacy_format: bool = False) -> AsyncGenerator[str, None]:
        """
        Adapt optimized stream to frontend-compatible format
        
        Args:
            optimized_stream: Stream from optimized engine
            legacy_format: If True, strip all new metadata
        """
        async for chunk in optimized_stream:
            adapted_chunk = await self._adapt_chunk(chunk, legacy_format)
            if adapted_chunk:
                yield adapted_chunk
    
    async def _adapt_chunk(self, chunk: str, legacy_format: bool) -> Optional[str]:
        """Adapt a single chunk"""
        try:
            data = json.loads(chunk)
            
            # Handle response chunks
            if 'response' in data:
                self.response_buffer += data['response']
                
                if legacy_format:
                    # Current format: plain response
                    return json.dumps({'response': data['response']})
                else:
                    # Enhanced format with optional metadata
                    enhanced = {'response': data['response']}
                    if self.enable_metadata and 'chunk_metadata' in data:
                        enhanced['metadata'] = data['chunk_metadata']
                    return json.dumps(enhanced)
            
            # Handle error
            elif 'error' in data:
                error_msg = data['error']
                
                # Add user-friendly error messages
                if 'keine relevanten' in error_msg.lower():
                    error_msg = "Leider konnte ich keine relevanten Informationen zu Ihrer Frage finden. Bitte versuchen Sie es mit einer anderen Formulierung."
                
                return json.dumps({'error': error_msg})
            
            # Handle completion
            elif 'done' in data:
                # Extract metadata
                if 'metadata' in data:
                    meta = data['metadata']
                    self.metadata.tokens = meta.get('tokens', 0)
                    self.metadata.sources = meta.get('sources', [])
                    self.metadata.confidence = meta.get('confidence', 0.0)
                    self.metadata.processing_time = meta.get('processing_time', 0.0)
                    self.metadata.cache_hit = meta.get('cache_hit', False)
                
                if legacy_format:
                    # Current format: simple done with context
                    context = self._format_legacy_context()
                    return json.dumps({
                        'done': True,
                        'context': context
                    })
                else:
                    # Enhanced format with full metadata
                    return json.dumps({
                        'done': True,
                        'context': self._format_context(),
                        'metadata': {
                            'tokens': self.metadata.tokens,
                            'sources': self.metadata.sources,
                            'confidence': round(self.metadata.confidence, 2),
                            'processing_time': round(self.metadata.processing_time, 2),
                            'cache_hit': self.metadata.cache_hit
                        }
                    })
            
            # Pass through unknown chunks
            else:
                return chunk
                
        except json.JSONDecodeError:
            # Not JSON, pass through
            return chunk
        except Exception as e:
            logger.error(f"Error adapting chunk: {e}")
            return None
    
    def _format_legacy_context(self) -> str:
        """Format context for legacy frontend"""
        if self.metadata.sources:
            return f"\n\nQuellen: {', '.join(self.metadata.sources)}"
        return ""
    
    def _format_context(self) -> str:
        """Format enhanced context"""
        parts = []
        
        if self.metadata.sources:
            parts.append(f"📚 Quellen: {', '.join(self.metadata.sources)}")
        
        if self.metadata.confidence > 0:
            confidence_icon = "🟢" if self.metadata.confidence > 0.8 else "🟡" if self.metadata.confidence > 0.5 else "🔴"
            parts.append(f"{confidence_icon} Konfidenz: {self.metadata.confidence:.0%}")
        
        if self.metadata.processing_time > 0:
            parts.append(f"⏱️ Verarbeitung: {self.metadata.processing_time:.1f}s")
        
        if self.metadata.cache_hit:
            parts.append("💾 Aus Cache")
        
        return "\n\n" + "\n".join(parts) if parts else ""
    
    @staticmethod
    def enhance_search_results(results: list, include_explanations: bool = True) -> list:
        """
        Enhance search results with better formatting
        
        Args:
            results: Raw search results
            include_explanations: Add relevance explanations
        """
        enhanced = []
        
        for i, result in enumerate(results):
            enhanced_result = {
                'rank': i + 1,
                'text': result.get('text', ''),
                'score': round(result.get('score', 0), 3),
                'source': result.get('metadata', {}).get('source', 'Unbekannt')
            }
            
            # Add quality indicators
            if 'quality_score' in result:
                quality = result['quality_score']
                enhanced_result['quality'] = {
                    'score': round(quality, 2),
                    'label': 'Hoch' if quality > 0.8 else 'Mittel' if quality > 0.5 else 'Niedrig'
                }
            
            # Add relevance explanation
            if include_explanations and 'relevance_explanation' in result:
                enhanced_result['explanation'] = result['relevance_explanation']
            
            # Format text preview
            text = enhanced_result['text']
            if len(text) > 200:
                enhanced_result['preview'] = text[:200] + "..."
                enhanced_result['full_text'] = text
            else:
                enhanced_result['preview'] = text
            
            enhanced.append(enhanced_result)
        
        return enhanced
    
    @staticmethod
    def format_error_response(error: Exception, user_friendly: bool = True) -> Dict[str, Any]:
        """
        Format error responses for frontend
        
        Args:
            error: The exception
            user_friendly: Use user-friendly messages
        """
        error_type = type(error).__name__
        error_msg = str(error)
        
        if user_friendly:
            # Map technical errors to user-friendly messages
            error_mappings = {
                'ConnectionError': 'Verbindungsfehler. Bitte überprüfen Sie Ihre Internetverbindung.',
                'TimeoutError': 'Die Anfrage hat zu lange gedauert. Bitte versuchen Sie es erneut.',
                'MemoryError': 'Nicht genügend Speicher verfügbar. Bitte wenden Sie sich an den Administrator.',
                'DependencyError': 'Ein benötigtes Modul ist nicht verfügbar. Bitte wenden Sie sich an den Support.',
                'ConfigurationError': 'Konfigurationsfehler. Bitte überprüfen Sie die Einstellungen.'
            }
            
            user_message = error_mappings.get(error_type, 'Ein unerwarteter Fehler ist aufgetreten.')
            
            return {
                'error': user_message,
                'type': 'user_error',
                'details': {
                    'technical_error': error_type,
                    'message': error_msg if not user_friendly else None
                }
            }
        else:
            return {
                'error': error_msg,
                'type': error_type,
                'stack_trace': None  # Don't expose stack traces to frontend
            }
    
    @staticmethod
    def create_progress_update(stage: str, progress: float, message: str = "") -> str:
        """
        Create progress update for long-running operations
        """
        stages = {
            'initializing': 'Initialisierung...',
            'searching': 'Suche läuft...',
            'processing': 'Verarbeite Ergebnisse...',
            'generating': 'Generiere Antwort...',
            'finalizing': 'Finalisierung...'
        }
        
        return json.dumps({
            'type': 'progress',
            'stage': stage,
            'progress': min(max(progress, 0), 1),  # Clamp to 0-1
            'message': message or stages.get(stage, 'Verarbeitung...')
        })


class FrontendCompatibilityMixin:
    """
    Mixin for adding frontend compatibility to any RAG engine
    """
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.frontend_adapter = FrontendAdapter()
    
    async def stream_with_frontend_compatibility(self, *args, **kwargs) -> AsyncGenerator[str, None]:
        """Stream with frontend adaptation"""
        # Detect legacy mode from user agent or config
        legacy_mode = kwargs.pop('legacy_format', False)
        
        # Get the raw stream
        raw_stream = await self.stream_answer(*args, **kwargs)
        
        # Adapt it
        async for chunk in self.frontend_adapter.adapt_stream(raw_stream, legacy_mode):
            yield chunk


# Example usage
if __name__ == "__main__":
    import asyncio
    
    async def test_adapter():
        adapter = FrontendAdapter()
        
        # Test chunks
        test_chunks = [
            json.dumps({'response': 'Dies ist'}),
            json.dumps({'response': ' eine Test'}),
            json.dumps({'response': 'antwort.'}),
            json.dumps({
                'done': True,
                'metadata': {
                    'tokens': 42,
                    'sources': ['doc1.pdf', 'doc2.md'],
                    'confidence': 0.87,
                    'processing_time': 1.23,
                    'cache_hit': False
                }
            })
        ]
        
        async def mock_stream():
            for chunk in test_chunks:
                yield chunk
        
        print("Legacy format:")
        async for chunk in adapter.adapt_stream(mock_stream(), legacy_format=True):
            print(chunk)
        
        print("\nEnhanced format:")
        adapter = FrontendAdapter()  # Reset
        async for chunk in adapter.adapt_stream(mock_stream(), legacy_format=False):
            print(chunk)
        
        # Test search results enhancement
        results = [
            {
                'text': 'Dies ist ein langer Text der gekürzt werden sollte ' * 10,
                'score': 0.95,
                'quality_score': 0.82,
                'relevance_explanation': 'Enthält relevante Begriffe',
                'metadata': {'source': 'handbuch.pdf'}
            }
        ]
        
        enhanced = FrontendAdapter.enhance_search_results(results)
        print("\nEnhanced search results:")
        print(json.dumps(enhanced, indent=2, ensure_ascii=False))
    
    asyncio.run(test_adapter())