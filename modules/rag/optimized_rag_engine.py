"""
Optimized RAG Engine - Produktionsreife Implementierung
Integriert alle Optimierungskomponenten in eine einheitliche Engine
"""
import asyncio
import time
from typing import List, Dict, Any, Optional, AsyncGenerator, Tuple
from datetime import datetime
import logging
import json
import numpy as np
from pathlib import Path

from .rag_optimizer_config import RAGOptimizerConfig, get_balanced_config
from .semantic_chunker import SemanticChunker
from .hybrid_retriever import HybridRetriever
from .advanced_query_processor import AdvancedQueryProcessor, QueryIntent
from .document_quality_scorer import DocumentQualityScorer
from .performance_optimizer import CacheManager, BatchProcessor, PerformanceMonitor, performance_tracked
from .integrated_document_processor import IntegratedDocumentProcessor

from ..llm.model import OllamaClient
from ..core.config import Config
from ..core.logging import LogManager
from ..session.chat_history import ChatHistoryManager

logger = LogManager.setup_logging()


class OptimizedRAGEngine:
    """
    Vollständig optimierte RAG Engine mit allen Performance-Features
    """
    
    def __init__(self, config: Optional[RAGOptimizerConfig] = None):
        # Konfiguration
        self.config = config or get_balanced_config()
        
        # Komponenten
        self.query_processor = AdvancedQueryProcessor()
        self.chunker = SemanticChunker(
            min_chunk_size=self.config.chunking.min_chunk_size,
            target_chunk_size=self.config.chunking.target_chunk_size,
            max_chunk_size=self.config.chunking.max_chunk_size,
            overlap_ratio=self.config.chunking.overlap_ratio
        )
        self.retriever = HybridRetriever(
            embedding_model=self.config.embedding.model_name,
            reranker_model=self.config.retrieval.reranker_model,
            device=self.config.embedding.device
        )
        self.quality_scorer = DocumentQualityScorer()
        
        # Performance-Komponenten
        self.cache_manager = CacheManager(
            redis_host=self.config.cache.redis_host,
            redis_port=self.config.cache.redis_port,
            default_ttl=self.config.cache.default_ttl,
            max_memory_mb=self.config.cache.max_memory_mb
        )
        self.batch_processor = BatchProcessor(
            batch_size=self.config.performance.default_batch_size,
            max_wait_time=self.config.performance.max_batch_wait_time
        )
        self.performance_monitor = PerformanceMonitor()
        
        # Document Processor
        self.document_processor = IntegratedDocumentProcessor(
            source_dir=self.config.document_processing.source_dir,
            converted_dir=self.config.document_processing.converted_dir,
            watch_enabled=self.config.document_processing.watch_enabled
        )
        
        # LLM Client
        self.ollama_client = OllamaClient()
        
        # Chat History
        self.chat_history = ChatHistoryManager()
        
        # Status
        self.initialized = False
        self._active_streams = {}
    
    async def initialize(self) -> bool:
        """Initialisiert alle Komponenten"""
        try:
            logger.info("Initialisiere Optimized RAG Engine")
            
            # 1. Performance-Komponenten starten
            await self.batch_processor.start()
            
            # 2. Document Processor initialisieren
            await self.document_processor.initialize()
            
            # 3. Retriever laden
            if not self.retriever.load_index():
                logger.info("Kein bestehender Index gefunden, erstelle neuen")
                # Initialer Index-Aufbau
                await self._build_initial_index()
            
            # 4. Cache aufwärmen (optional)
            if self.config.cache.cache_enabled:
                await self._warm_cache()
            
            self.initialized = True
            logger.info("Optimized RAG Engine erfolgreich initialisiert")
            return True
            
        except Exception as e:
            logger.error(f"Fehler bei der Initialisierung: {e}")
            return False
    
    async def _build_initial_index(self):
        """Erstellt initialen Index aus vorhandenen Dokumenten"""
        logger.info("Erstelle initialen Index")
        
        # Verarbeite alle Dokumente im Source-Verzeichnis
        results = await self.document_processor.process_directory()
        
        successful = sum(1 for r in results if r.status == 'success')
        logger.info(f"Initial-Index erstellt: {successful} Dokumente erfolgreich verarbeitet")
    
    async def _warm_cache(self):
        """Wärmt Cache mit häufigen Queries auf"""
        common_queries = [
            "Was ist nscale?",
            "Wie funktioniert die Dokumentenverwaltung?",
            "Welche Berechtigungen gibt es?"
        ]
        
        for query in common_queries:
            try:
                await self.search(query, k=3)
            except:
                pass  # Cache-Warming sollte nicht fehlschlagen
    
    @performance_tracked("search")
    async def search(self, 
                    query: str, 
                    k: int = 5,
                    filters: Optional[Dict[str, Any]] = None,
                    use_cache: bool = True) -> Dict[str, Any]:
        """
        Haupt-Such-Methode mit allen Optimierungen
        """
        start_time = time.time()
        
        # 1. Cache-Check
        if use_cache:
            cache_key = {'query': query, 'k': k, 'filters': filters}
            cached_result = await self.cache_manager.get('search', cache_key)
            if cached_result:
                return {
                    'results': cached_result,
                    'cache_hit': True,
                    'processing_time': time.time() - start_time,
                    'tokens_processed': 0
                }
        
        # 2. Query Processing
        processed_query = self.query_processor.process_query(query)
        
        # 3. Filter-Extraktion
        auto_filters = self.query_processor.extract_filters(processed_query)
        combined_filters = {**auto_filters, **(filters or {})}
        
        # 4. Query Expansion & Reformulation
        enhanced_query = query
        if processed_query.expanded_terms:
            enhanced_query += " " + " ".join(processed_query.expanded_terms[:3])
        
        # 5. Hybrid Search mit Reranking
        search_results = await self.retriever.search(
            query=enhanced_query,
            k=k * 2,  # Mehr Kandidaten für Reranking
            use_reranking=self.config.retrieval.use_reranking,
            filters=combined_filters
        )
        
        # 6. Ergebnis-Aufbereitung
        final_results = []
        for i, result in enumerate(search_results[:k]):
            # Qualitäts-Score für Chunk
            chunk_quality = await self._score_chunk_quality(result.text)
            
            enhanced_result = {
                'rank': i + 1,
                'text': result.text,
                'score': result.score,
                'metadata': result.metadata,
                'quality_score': chunk_quality,
                'relevance_explanation': self._generate_relevance_explanation(
                    query, result.text, processed_query.intent
                )
            }
            final_results.append(enhanced_result)
        
        # 7. Cache speichern
        if use_cache:
            await self.cache_manager.set('search', cache_key, final_results)
        
        # 8. Performance-Metriken
        processing_time = time.time() - start_time
        
        return {
            'results': final_results,
            'query_analysis': processed_query.to_dict(),
            'cache_hit': False,
            'processing_time': processing_time,
            'tokens_processed': sum(len(r['text'].split()) for r in final_results)
        }
    
    async def stream_answer(self,
                          question: str,
                          session_id: Optional[int] = None,
                          use_simple_language: bool = False,
                          stream_id: Optional[str] = None) -> AsyncGenerator[str, None]:
        """
        Optimiertes Streaming mit allen Features
        """
        if not self.initialized:
            await self.initialize()
        
        # Query-Analyse
        processed_query = self.query_processor.process_query(question)
        
        # Retrieval mit Caching
        search_results = await self.search(
            question, 
            k=self.config.retrieval.final_top_k,
            use_cache=True
        )
        
        if not search_results['results']:
            yield json.dumps({'error': 'Keine relevanten Informationen gefunden'})
            return
        
        # Prompt generieren
        prompt = self._build_optimized_prompt(
            question=question,
            search_results=search_results['results'],
            query_intent=processed_query.intent,
            use_simple_language=use_simple_language
        )
        
        # Streaming-Antwort
        complete_response = ""
        token_count = 0
        
        async for chunk in self.ollama_client.stream_generate(prompt, stream_id=stream_id):
            complete_response += chunk
            token_count += 1
            
            # Performance-Tracking
            if token_count % 10 == 0:
                self.performance_monitor.record_metric(
                    PerformanceMetrics(
                        timestamp=datetime.now(),
                        operation="streaming",
                        duration=0.1,
                        tokens_processed=token_count,
                        memory_used=0,
                        gpu_memory=None,
                        cache_hit=False,
                        batch_size=None,
                        error=None
                    )
                )
            
            yield json.dumps({'response': chunk})
            await asyncio.sleep(0.01)
        
        # Response in History speichern
        if session_id and complete_response:
            self.chat_history.add_message(session_id, complete_response, is_user=False)
        
        # Streaming-Ende
        yield json.dumps({
            'done': True,
            'metadata': {
                'tokens': token_count,
                'sources': self._extract_sources(search_results['results']),
                'confidence': self._calculate_confidence(search_results['results'])
            }
        })
    
    def _build_optimized_prompt(self,
                               question: str,
                               search_results: List[Dict[str, Any]],
                               query_intent: QueryIntent,
                               use_simple_language: bool) -> str:
        """
        Erstellt optimierten Prompt basierend auf Query-Intent
        """
        # Intent-spezifische Instruktionen
        intent_instructions = {
            QueryIntent.DEFINITION: "Erkläre präzise und klar, was der Begriff bedeutet.",
            QueryIntent.HOWTO: "Gib eine schrittweise Anleitung mit klaren Handlungsanweisungen.",
            QueryIntent.TROUBLESHOOTING: "Analysiere das Problem und biete konkrete Lösungsschritte.",
            QueryIntent.COMPARISON: "Stelle die Unterschiede strukturiert gegenüber.",
            QueryIntent.LISTING: "Erstelle eine übersichtliche Aufzählung.",
            QueryIntent.CONFIGURATION: "Erkläre die Einstellungsmöglichkeiten detailliert."
        }
        
        instruction = intent_instructions.get(query_intent, "Beantworte die Frage präzise.")
        
        # Kontext aus Search Results
        context_parts = []
        for i, result in enumerate(search_results):
            source = result['metadata'].get('source', 'Unbekannt')
            context_parts.append(
                f"[Quelle {i+1} - {source}]\n{result['text']}\n"
            )
        
        context = "\n".join(context_parts)
        
        # Basis-Template
        if use_simple_language:
            template = """Du bist ein hilfreicher Assistent für nscale DMS.
Verwende EINFACHE SPRACHE mit kurzen Sätzen.

ANWEISUNG: {instruction}

KONTEXT:
{context}

FRAGE: {question}

Antwort (einfache Sprache):"""
        else:
            template = """Du bist ein präziser Assistent für nscale DMS.

ANWEISUNG: {instruction}

KONTEXT:
{context}

FRAGE: {question}

Antwort:"""
        
        return template.format(
            instruction=instruction,
            context=context,
            question=question
        )
    
    async def _score_chunk_quality(self, chunk_text: str) -> float:
        """Bewertet Chunk-Qualität (gecached)"""
        cache_key = {'operation': 'chunk_quality', 'text_hash': hash(chunk_text)}
        
        cached = await self.cache_manager.get('quality', cache_key)
        if cached:
            return cached
        
        quality_metrics = self.quality_scorer.score_chunk(chunk_text)
        score = quality_metrics.overall_score
        
        await self.cache_manager.set('quality', cache_key, score, ttl=86400)
        return score
    
    def _generate_relevance_explanation(self, 
                                      query: str, 
                                      chunk_text: str, 
                                      intent: QueryIntent) -> str:
        """Generiert Erklärung für Relevanz"""
        # Einfache Keyword-Überlappung
        query_words = set(query.lower().split())
        chunk_words = set(chunk_text.lower().split())
        overlap = query_words & chunk_words
        
        if len(overlap) > 2:
            return f"Enthält relevante Begriffe: {', '.join(list(overlap)[:3])}"
        elif intent == QueryIntent.DEFINITION and "ist" in chunk_text:
            return "Enthält Definition"
        elif intent == QueryIntent.HOWTO and any(word in chunk_text for word in ["schritt", "anleitung"]):
            return "Enthält Anleitungsinformationen"
        else:
            return "Semantisch relevant"
    
    def _extract_sources(self, results: List[Dict[str, Any]]) -> List[str]:
        """Extrahiert eindeutige Quellen"""
        sources = []
        seen = set()
        
        for result in results:
            source = result['metadata'].get('source', 'Unbekannt')
            if source not in seen:
                sources.append(source)
                seen.add(source)
        
        return sources
    
    def _calculate_confidence(self, results: List[Dict[str, Any]]) -> float:
        """Berechnet Konfidenz-Score"""
        if not results:
            return 0.0
        
        # Kombiniere Relevanz-Scores und Qualitäts-Scores
        scores = []
        for result in results:
            relevance = result.get('score', 0)
            quality = result.get('quality_score', 0.5)
            combined = relevance * 0.7 + quality * 0.3
            scores.append(combined)
        
        # Gewichteter Durchschnitt (erste Ergebnisse wichtiger)
        weights = [1.0 / (i + 1) for i in range(len(scores))]
        weighted_sum = sum(s * w for s, w in zip(scores, weights))
        weight_sum = sum(weights)
        
        confidence = weighted_sum / weight_sum if weight_sum > 0 else 0
        return min(1.0, confidence)
    
    async def process_feedback(self,
                             query: str,
                             result_id: int,
                             feedback: str,
                             session_id: Optional[int] = None):
        """
        Verarbeitet User-Feedback zur Verbesserung
        """
        # Speichere Feedback
        feedback_data = {
            'query': query,
            'result_id': result_id,
            'feedback': feedback,
            'session_id': session_id,
            'timestamp': datetime.now().isoformat()
        }
        
        # Invalidiere relevante Caches
        await self.cache_manager.invalidate(pattern=query[:20])
        
        # Optional: Fine-tune Retriever basierend auf Feedback
        # Hier könnte Reranker-Training implementiert werden
        
        logger.info(f"Feedback verarbeitet für Query: {query[:50]}...")
    
    def get_performance_stats(self) -> Dict[str, Any]:
        """Gibt Performance-Statistiken zurück"""
        return {
            'performance': self.performance_monitor.get_performance_summary(),
            'cache': self.cache_manager.get_stats(),
            'retriever': self.retriever.get_statistics(),
            'document_processor': self.document_processor.get_statistics()
        }
    
    async def shutdown(self):
        """Sauberes Herunterfahren"""
        logger.info("Shutting down Optimized RAG Engine")
        
        # Stoppe Background-Prozesse
        await self.batch_processor.stop()
        
        # Speichere Caches
        self.cache_manager.invalidate()  # Optional: Cache leeren
        
        # Speichere Index
        self.retriever._save_index()
        
        logger.info("Shutdown complete")


# Beispiel-Verwendung
async def example_usage():
    """Demonstriert die Verwendung der Optimized RAG Engine"""
    
    # Initialisiere Engine mit Custom Config
    config = get_balanced_config()
    config.embedding.device = "cuda"  # GPU verwenden
    config.cache.backend = "redis"    # Redis-Cache
    
    engine = OptimizedRAGEngine(config)
    
    # Initialisierung
    if not await engine.initialize():
        print("Initialisierung fehlgeschlagen")
        return
    
    # Beispiel-Queries
    test_queries = [
        "Was ist nscale und wofür wird es verwendet?",
        "Wie kann ich Dokumente in nscale archivieren?",
        "Welche Berechtigungen benötige ich für die Dokumentenverwaltung?"
    ]
    
    for query in test_queries:
        print(f"\n{'='*60}")
        print(f"Query: {query}")
        print('='*60)
        
        # Suche
        search_results = await engine.search(query, k=3)
        
        print(f"\nQuery-Analyse:")
        print(f"  Intent: {search_results['query_analysis']['intent']}")
        print(f"  Key Terms: {', '.join(search_results['query_analysis']['key_terms'])}")
        print(f"  Cache Hit: {search_results['cache_hit']}")
        print(f"  Processing Time: {search_results['processing_time']:.3f}s")
        
        print(f"\nTop Results:")
        for result in search_results['results']:
            print(f"\n  Rank {result['rank']}:")
            print(f"    Score: {result['score']:.3f}")
            print(f"    Quality: {result['quality_score']:.3f}")
            print(f"    Relevance: {result['relevance_explanation']}")
            print(f"    Preview: {result['text'][:100]}...")
        
        # Streaming-Antwort
        print(f"\nGeneriere Antwort:")
        response = ""
        async for chunk in engine.stream_answer(query, session_id=1):
            chunk_data = json.loads(chunk)
            if 'response' in chunk_data:
                response += chunk_data['response']
                print(chunk_data['response'], end='', flush=True)
            elif 'done' in chunk_data:
                print(f"\n\nMetadata: {chunk_data.get('metadata', {})}")
    
    # Performance-Stats
    print(f"\n{'='*60}")
    print("Performance Statistics:")
    print('='*60)
    stats = engine.get_performance_stats()
    print(json.dumps(stats, indent=2))
    
    # Cleanup
    await engine.shutdown()


if __name__ == "__main__":
    asyncio.run(example_usage())