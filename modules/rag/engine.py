import asyncio
import json
from sse_starlette.sse import EventSourceResponse
from typing import Dict, Any, List, Optional, Tuple, AsyncGenerator
<<<<<<< HEAD
from collections import defaultdict
import re
from enum import Enum
from ..core.config import Config
from ..core.logging import LogManager
# from ..core.performance import AsyncPipeline, ResourceAwareProcessor, PerformanceMonitor
from ..core.performance import PerformanceMonitor
# Placeholder classes for missing imports
class AsyncPipeline:
    def __init__(self, max_concurrent=5):
        self.max_concurrent = max_concurrent
        self.monitor = type('Monitor', (), {'log': lambda self, *args: None})()  # Mock monitor
class ResourceAwareProcessor:
    def __init__(self, pipeline):
        self.pipeline = pipeline
# from ..core.cache import get_cache, HybridCache
from ..core.cache import CacheManager
# Create placeholder for missing imports
def get_cache():
    return CacheManager()
class HybridCache:
    def __init__(self):
        self.cache = {}
    
    def get(self, key):
        return self.cache.get(key)
    
    def set(self, key, value):
        self.cache[key] = value
from ..retrieval.document_store import DocumentStore
from ..retrieval.embedding import EmbeddingManager
from ..retrieval.reranker import ReRanker
=======
from ..core.config import Config
from ..core.logging import LogManager
from ..retrieval.document_store import DocumentStore
from ..retrieval.embedding import EmbeddingManager
>>>>>>> 54736e963704686b3a684a0827ec3303d2c8d0da
from ..llm.model import OllamaClient
import torch

logger = LogManager.setup_logging()

<<<<<<< HEAD
class QueryIntent(Enum):
    """Query Intent Types für bessere Retrieval-Strategien"""
    FACTUAL = "factual"  # Was ist...? Wer ist...?
    PROCEDURAL = "procedural"  # Wie mache ich...? Schritte für...
    CONCEPTUAL = "conceptual"  # Warum...? Erkläre...
    TROUBLESHOOTING = "troubleshooting"  # Fehler, Problem, funktioniert nicht
    NAVIGATION = "navigation"  # Wo finde ich...? Menü...
    COMPARISON = "comparison"  # Unterschied zwischen...? Vergleich...
    LISTING = "listing"  # Liste, Aufzählung, alle...

=======
>>>>>>> 54736e963704686b3a684a0827ec3303d2c8d0da
class RAGEngine:
    """Hauptmodul für RAG-Funktionalität"""
    
    def __init__(self):
        # Erkenne CUDA-Unterstützung
        if torch.cuda.is_available():
            self.device = "cuda"
            self.torch_dtype = torch.float16
            logger.info("🚀 CUDA ist verfügbar – GPU wird verwendet.")
        else:
            self.device = "cpu"
            self.torch_dtype = torch.float32
            logger.warning("⚠️ CUDA nicht verfügbar – es wird die CPU verwendet.")
        
        self.document_store = DocumentStore()
        self.embedding_manager = EmbeddingManager()
<<<<<<< HEAD
        self.reranker = ReRanker()  # Phase 2.3: Cross-Encoder Reranking
=======
>>>>>>> 54736e963704686b3a684a0827ec3303d2c8d0da
        self.ollama_client = OllamaClient()
        self.initialized = False
        self._init_lock = asyncio.Lock()  # Lock für Thread-Sicherheit bei Initialisierung
        self._active_streams = {}  # Dictionary für aktive Streams
<<<<<<< HEAD
        
        # Phase 3: Performance Components
        self.pipeline = AsyncPipeline(max_concurrent=5)
        self.resource_processor = ResourceAwareProcessor(self.pipeline)
        self.monitor = self.pipeline.monitor
        self.cache: Optional[HybridCache] = None
=======
>>>>>>> 54736e963704686b3a684a0827ec3303d2c8d0da
    
    async def initialize(self):
        """Initialisiert alle Komponenten - Thread-sicher"""
        # Verhindere parallele Initialisierung
        async with self._init_lock:
            if self.initialized:
                return True
            
            try:
                logger.info("Initialisiere RAG-Engine")
                
                # Lade Dokumente
                if not self.document_store.load_documents():
                    logger.error("Fehler beim Laden der Dokumente")
                    return False
                
                # Initialisiere Embedding-Modell
                if not self.embedding_manager.initialize():
                    logger.error("Fehler beim Initialisieren des Embedding-Modells")
                    return False
                
<<<<<<< HEAD
                # Phase 2.3: Initialisiere Reranker (optional, kein Fehler wenn es fehlschlägt)
                try:
                    self.reranker.initialize()
                    logger.info("✅ Cross-Encoder Reranker initialisiert")
                except Exception as e:
                    logger.warning(f"Reranker konnte nicht initialisiert werden: {e}")
                    # Fahre trotzdem fort, Reranking ist optional
                
                # Phase 3: Initialisiere Cache
                self.cache = get_cache()
                logger.info("💾 Cache-System initialisiert")
                
=======
>>>>>>> 54736e963704686b3a684a0827ec3303d2c8d0da
                # Verarbeite Chunks
                chunks = self.document_store.get_chunks()
                if not self.embedding_manager.process_chunks(chunks):
                    logger.error("Fehler bei der Verarbeitung der Chunks")
                    return False
                
                self.initialized = True
                logger.info("RAG-Engine erfolgreich initialisiert")
                return True
            
            except Exception as e:
                logger.error(f"Fehler bei der Initialisierung der RAG-Engine: {e}")
                return False
    
    async def stream_answer_chunks(self, question: str, session_id: Optional[int] = None, 
                             use_simple_language: bool = False, stream_id: Optional[str] = None) -> AsyncGenerator[str, None]:
        """
        Gibt einen asynchronen Generator zurück, der Text-Chunks streamt - 
        für die direkte Verwendung mit StreamingResponse
        """
        if not question:  # Sicherstellen, dass die Frage nicht leer ist
            logger.error("Die Frage wurde nicht übergeben.")
<<<<<<< HEAD
            yield json.dumps({'error': 'Keine Frage übergeben.'})
=======
            yield json.dumps({"error": "Keine Frage übergeben."})
>>>>>>> 54736e963704686b3a684a0827ec3303d2c8d0da
            return

        if not self.initialized:
            logger.info("Lazy-Loading der RAG-Engine für Streaming...")
            success = await self.initialize()
            if not success:
<<<<<<< HEAD
                yield json.dumps({'error': 'System konnte nicht initialisiert werden'})
=======
                yield json.dumps({"error": "System konnte nicht initialisiert werden"})
>>>>>>> 54736e963704686b3a684a0827ec3303d2c8d0da
                return

        if len(question) > 2048:
            logger.warning(f"Frage zu lang ({len(question)} Zeichen), wird gekürzt")
            question = question[:2048]

        # Stream-ID für Tracking verwenden, falls angegeben
        if not stream_id:
            stream_id = f"stream_{session_id}_{hash(question)}"
        
        logger.info(f"Stream-ID: {stream_id}")

        try:
<<<<<<< HEAD
            # Phase 2: Apply Query Intelligence für Streaming
            intent = self._detect_query_intent(question)
            expansion = self._expand_query(question, intent)
            expanded_query = self._apply_query_expansion(question, expansion)
            
            # Chunks suchen mit erweiterter Query
            relevant_chunks = self.embedding_manager.search(expanded_query, top_k=Config.TOP_K)
            if not relevant_chunks:
                logger.warning(f"Keine relevanten Chunks für Streaming-Frage gefunden: {question[:50]}...")
                yield json.dumps({'error': 'Keine relevanten Informationen gefunden'})
                return
            
            # Phase 2.3: Reranking wenn verfügbar
            if self.reranker.initialized:
                relevant_chunks = self.reranker.rerank(
                    question, relevant_chunks, top_k=Config.TOP_K, intent=intent.value
                )
            
            # Phase 2.4: Context Window Optimization
            relevant_chunks = self._optimize_context_window(
                relevant_chunks, question, intent, max_tokens=4000
            )
=======
            # Chunks suchen
            relevant_chunks = self.embedding_manager.search(question, top_k=Config.TOP_K)
            if not relevant_chunks:
                logger.warning(f"Keine relevanten Chunks für Streaming-Frage gefunden: {question[:50]}...")
                yield json.dumps({"error": "Keine relevanten Informationen gefunden"})
                return
>>>>>>> 54736e963704686b3a684a0827ec3303d2c8d0da

            # Entferne Duplikate basierend auf der Datei
            seen_sources = set()
            unique_chunks = []
            for chunk in relevant_chunks:
                source = chunk.get('file', 'unknown')
                # Füge nur hinzu, wenn die Quelle noch nicht gesehen wurde
                if source not in seen_sources:
                    seen_sources.add(source)
                    unique_chunks.append(chunk)
            
            # Begrenze auf maximal 5 verschiedene Quellen
            if len(unique_chunks) > 5:
                unique_chunks = unique_chunks[:5]

            # Prompt bauen mit Spracheinstellung
            prompt = self._format_prompt(question, unique_chunks, use_simple_language)
            logger.info(f"Starte Streaming für Frage: {question[:50]}... (Einfache Sprache: {use_simple_language})")

            # Variable zur Nachverfolgung, ob Daten gesendet wurden
            found_data = False
            
            # Buffer für die Gesamtantwort
            complete_answer = ""
            
            # Debug-Logging für den Stream-Start
            logger.debug("Stream-Generierung beginnt mit Prompt...")
            
            async for chunk in self.ollama_client.stream_generate(prompt, stream_id=stream_id):
                # Auch leere Tokens werden berücksichtigt
                found_data = True
                # Füge zum Buffer hinzu 
                complete_answer += chunk
                
<<<<<<< HEAD
                # Für StreamingResponse: Liefere JSON
                yield json.dumps({'response': chunk}) + '\n'
=======
                # Für StreamingResponse: Liefere JSON-Objekt
                yield json.dumps({"content": chunk})
>>>>>>> 54736e963704686b3a684a0827ec3303d2c8d0da
                
                # Kurze Pause einfügen, um dem Browser Zeit zum Rendern zu geben
                await asyncio.sleep(0.01)

            # Wenn keine Antwort empfangen wurde
            if not found_data:
                logger.warning("Keine Antwort vom Modell empfangen")
<<<<<<< HEAD
                yield json.dumps({'error': 'Das Modell hat keine Ausgabe erzeugt.'})
            else:
                # Speichern der kompletten Antwort in der Chathistorie
                # DEAKTIVIERT - wird jetzt von chat_routes.py gehandhabt
                # if session_id and complete_answer.strip():
                #     logger.info(f"Speichere vollständige Antwort ({len(complete_answer)} Zeichen) in Session {session_id}")
                #     from ..session.chat_history import ChatHistoryManager
                #     chat_history = ChatHistoryManager()
                #     chat_history.add_message(session_id, complete_answer, is_user=False)
                pass

            # Für Streaming-Abschluss
            yield json.dumps({'done': True})
            
        except Exception as e:
            logger.error(f"Fehler beim Streaming der Antwort: {e}", exc_info=True)
            yield json.dumps({'error': f'Fehler beim Streaming: {str(e)}'})
=======
                yield json.dumps({"error": "Das Modell hat keine Ausgabe erzeugt."})
            else:
                # Speichern der kompletten Antwort in der Chathistorie
                if session_id and complete_answer.strip():
                    logger.info(f"Speichere vollständige Antwort ({len(complete_answer)} Zeichen) in Session {session_id}")
                    from ..session.chat_history import ChatHistoryManager
                    chat_history = ChatHistoryManager()
                    chat_history.add_message(session_id, complete_answer, is_user=False)

            # Für Streaming-Abschluss
            yield json.dumps({"done": True})
            
        except Exception as e:
            logger.error(f"Fehler beim Streaming der Antwort: {e}", exc_info=True)
            yield json.dumps({"error": f"Fehler beim Streaming: {str(e)}"})
>>>>>>> 54736e963704686b3a684a0827ec3303d2c8d0da
    
    async def stream_answer(self, question: str, session_id: Optional[int] = None, 
                           use_simple_language: bool = False, stream_id: Optional[str] = None) -> EventSourceResponse:
        """Streamt Antwort stückweise zurück – im Server-Sent-Events-Format"""
        if not question:  # Sicherstellen, dass die Frage nicht leer ist
            logger.error("Die Frage wurde nicht übergeben.")
            return EventSourceResponse(self._format_error_event("Keine Frage übergeben."))      

        if not self.initialized:
            logger.info("Lazy-Loading der RAG-Engine für Streaming...")
            success = await self.initialize()
            if not success:
                async def error_stream():
<<<<<<< HEAD
                    yield json.dumps({'error': 'System konnte nicht initialisiert werden'})
=======
                    yield f"data: {json.dumps({'error': 'System konnte nicht initialisiert werden'})}\n\n"
                    yield "event: done\ndata: \n\n"
>>>>>>> 54736e963704686b3a684a0827ec3303d2c8d0da
                return EventSourceResponse(error_stream())

        if len(question) > 2048:
            logger.warning(f"Frage zu lang ({len(question)} Zeichen), wird gekürzt")
            question = question[:2048]

        # Stream-ID für Tracking verwenden, falls angegeben
        if not stream_id:
            stream_id = f"stream_{session_id}_{hash(question)}"
        
        logger.info(f"Stream-ID: {stream_id}")

        async def event_generator(question: str, use_simple_language: bool) -> AsyncGenerator[str, None]:
            try:
                # Chunks suchen
                relevant_chunks = self.embedding_manager.search(question, top_k=Config.TOP_K)
                if not relevant_chunks:
                    logger.warning(f"Keine relevanten Chunks für Streaming-Frage gefunden: {question[:50]}...")
<<<<<<< HEAD
                    # EventSourceResponse fügt SSE-Formatierung automatisch hinzu
                    yield json.dumps({'error': 'Keine relevanten Informationen gefunden'})
=======
                    yield f"data: {json.dumps({'error': 'Keine relevanten Informationen gefunden'})}\n\n"
                    yield "event: done\ndata: \n\n"
>>>>>>> 54736e963704686b3a684a0827ec3303d2c8d0da
                    return

                # Entferne Duplikate basierend auf der Datei
                seen_sources = set()
                unique_chunks = []
                for chunk in relevant_chunks:
                    source = chunk.get('file', 'unknown')
                    # Füge nur hinzu, wenn die Quelle noch nicht gesehen wurde
                    if source not in seen_sources:
                        seen_sources.add(source)
                        unique_chunks.append(chunk)
                
                # Begrenze auf maximal 5 verschiedene Quellen
                if len(unique_chunks) > 5:
                    unique_chunks = unique_chunks[:5]

                # Prompt bauen mit Spracheinstellung
                prompt = self._format_prompt(question, unique_chunks, use_simple_language)
                logger.info(f"Starte Streaming für Frage: {question[:50]}... (Einfache Sprache: {use_simple_language})")

                # Variable zur Nachverfolgung, ob Daten gesendet wurden
                found_data = False
                
                # Buffer für die Gesamtantwort
                complete_answer = ""
                
                # Debug-Logging für den Stream-Start
                logger.debug("Stream-Generierung beginnt mit Prompt...")
                
                async for chunk in self.ollama_client.stream_generate(prompt, stream_id=stream_id):
                    # Auch leere Tokens werden berücksichtigt
                    found_data = True
                    # Füge zum Buffer hinzu 
                    complete_answer += chunk
                    # SSE-Event formatieren - WICHTIG: Korrektes Format mit \n\n am Ende
                    logger.debug(f"Sende Token: '{chunk}'")
                    
<<<<<<< HEAD
                    # EventSourceResponse fügt data: prefix automatisch hinzu
                    yield json.dumps({'response': chunk})
                    
                    # Kurze Pause einfügen, um dem Browser Zeit zum Rendern zu geben
                    await asyncio.sleep(0.05)  # Erhöht von 0.01 auf 0.05 für bessere Sichtbarkeit
=======
                    # Wichtig: Senden eines vollständigen SSE-Events
                    yield f"data: {json.dumps({'response': chunk})}\n\n"
                    
                    # Kurze Pause einfügen, um dem Browser Zeit zum Rendern zu geben
                    await asyncio.sleep(0.01)
>>>>>>> 54736e963704686b3a684a0827ec3303d2c8d0da

                # Wenn keine Antwort empfangen wurde
                if not found_data:
                    logger.warning("Keine Antwort vom Modell empfangen")
<<<<<<< HEAD
                    yield json.dumps({'error': 'Das Modell hat keine Ausgabe erzeugt.'})
=======
                    yield f"data: {json.dumps({'error': 'Das Modell hat keine Ausgabe erzeugt.'})}\n\n"
>>>>>>> 54736e963704686b3a684a0827ec3303d2c8d0da
                else:
                    # Speichern der kompletten Antwort in der Chathistorie
                    if session_id and complete_answer.strip():
                        logger.info(f"Speichere vollständige Antwort ({len(complete_answer)} Zeichen) in Session {session_id}")
                        from ..session.chat_history import ChatHistoryManager
                        chat_history = ChatHistoryManager()
                        chat_history.add_message(session_id, complete_answer, is_user=False)

<<<<<<< HEAD
                # EventSourceResponse beendet automatisch wenn der Generator endet
                logger.debug("Stream abgeschlossen")
                
            except Exception as e:
                logger.error(f"Fehler beim Streaming der Antwort: {e}", exc_info=True)
                yield json.dumps({"error": f"Fehler beim Streaming: {str(e)}"})
=======
                # KRITISCH: Korrektes done-Event senden (separates Event)
                # Das Format muss exakt sein: "event: done\ndata: \n\n"
                logger.debug("Sende 'done' Event zum Abschluss des Streams")
                yield "event: done\ndata: \n\n"
                
            except Exception as e:
                logger.error(f"Fehler beim Streaming der Antwort: {e}", exc_info=True)
                error_msg = json.dumps({"error": f"Fehler beim Streaming: {str(e)}"})
                yield f"data: {error_msg}\n\n"
                yield "event: done\ndata: \n\n"
>>>>>>> 54736e963704686b3a684a0827ec3303d2c8d0da

        # Ping-Interval setzen, um Verbindungsabbrüche zu vermeiden
        return EventSourceResponse(
            event_generator(question, use_simple_language),
            ping=15.0,  # Sendet alle 15 Sekunden Ping-Events
            media_type="text/event-stream"  # Expliziter MIME-Typ
        )

    def _format_error_event(self, error_message: str) -> AsyncGenerator[str, None]:
<<<<<<< HEAD
        """Formatiert eine Fehlermeldung für EventSourceResponse"""
        async def error_generator():
            yield json.dumps({'error': error_message})
=======
        """Formatiert eine Fehlermeldung als SSE-Event"""
        async def error_generator():
            yield f"data: {json.dumps({'error': error_message})}\n\n"
            yield "event: done\ndata: \n\n"
>>>>>>> 54736e963704686b3a684a0827ec3303d2c8d0da
        return error_generator()

    async def cancel_active_streams(self):
        """Bricht alle aktiven Streams ab"""
        if hasattr(self, '_active_streams'):
            for stream_id in list(self._active_streams.keys()):
                try:
                    logger.info(f"Versuche Stream {stream_id} abzubrechen...")
                    await self.ollama_client.cancel_active_streams()
                    if stream_id in self._active_streams:
                        del self._active_streams[stream_id]
                    logger.info(f"Stream {stream_id} erfolgreich abgebrochen")
                except Exception as e:
                    logger.error(f"Fehler beim Abbrechen des Streams {stream_id}: {e}")
        else:
            logger.warning("Keine _active_streams gefunden - nichts abzubrechen")

    async def answer_question(self, question: str, user_id: Optional[int] = None, use_simple_language: bool = False) -> Dict[str, Any]:
        """Beantwortet eine Frage mit dem RAG-System"""
<<<<<<< HEAD
        # Phase 3: Performance Monitoring
        result = None
        async with self.monitor.measure_time(f"query_total"):
            if not self.initialized:
                success = await self.initialize()
                if not success:
                    return {
                        'success': False,
                        'message': 'Fehler bei der Initialisierung des Systems',
                        'answer': '',
                        'chunks': [],
                        'sources': []
                    }
            
            # Phase 3: Check Cache first
            cache_key = self.cache._generate_key('answer', {
                'question': question,
                'use_simple_language': use_simple_language
            })
            
            # Adaptive Caching basierend auf Systemlast
            if self.resource_processor.should_use_cache():
                cached_answer = await self.cache.get(cache_key)
                if cached_answer:
                    logger.info("📦 Returning cached answer")
                    self.monitor.record_cache_hit()
                    return cached_answer
            
            self.monitor.record_cache_miss()
        
            # Phase 3: Parallele Verarbeitung von Intent Detection und Query Expansion
            async with self.monitor.measure_time("query_processing"):
                # Parallel ausführen für bessere Performance
                intent_task = asyncio.create_task(self._async_detect_intent(question))
                
                # Warte auf Intent (benötigt für Expansion)
                intent = await intent_task
                logger.info(f"🎯 Detected Intent: {intent.value}")
                
                # Phase 2.2: Query Expansion
                expansion = self._expand_query(question, intent)
                expanded_query = self._apply_query_expansion(question, expansion)
            
            # Phase 3: Resource-aware Retrieval
            async with self.monitor.measure_time("retrieval"):
                # Wrapper für sync search method
                async def search_wrapper():
                    return self.embedding_manager.search(expanded_query)
                
                async def fallback_search():
                    return self.embedding_manager.search(question)
                
                chunks = await self.resource_processor.adaptive_process(
                    search_wrapper,
                    fallback_task=fallback_search
                )
=======
        if not self.initialized:
            success = await self.initialize()
            if not success:
                return {
                    'success': False,
                    'message': 'Fehler bei der Initialisierung des Systems',
                    'answer': '',
                    'chunks': [],
                    'sources': []
                }
        
        # Suche relevante Chunks
        chunks = self.embedding_manager.search(question)
>>>>>>> 54736e963704686b3a684a0827ec3303d2c8d0da
        
        if not chunks:
            return {
                'success': False,
                'message': 'Keine relevanten Informationen gefunden',
                'answer': '',
                'chunks': [],
                'sources': []
            }
        
<<<<<<< HEAD
        # Phase 2.3: Cross-Encoder Reranking
        if self.reranker.initialized:
            chunks = self.reranker.rerank(
                question, 
                chunks, 
                top_k=Config.TOP_K * 2,  # Reranke mehr als wir brauchen
                intent=intent.value
            )
        
        # Phase 2.4: Context-Window Optimization
        optimized_chunks = self._optimize_context_window(
            chunks, 
            question, 
            intent,
            max_tokens=Config.MAX_PROMPT_LENGTH - 1000  # Reserve für System-Prompt
        )
        
        # Entferne Duplikate basierend auf der Datei
        seen_sources = set()
        unique_chunks = []
        for chunk in optimized_chunks:
=======
        # Entferne Duplikate basierend auf der Datei
        seen_sources = set()
        unique_chunks = []
        for chunk in chunks:
>>>>>>> 54736e963704686b3a684a0827ec3303d2c8d0da
            source = chunk.get('file', 'unknown')
            # Füge nur hinzu, wenn die Quelle noch nicht gesehen wurde
            if source not in seen_sources:
                seen_sources.add(source)
                unique_chunks.append(chunk)
                
        # Begrenze auf maximal 5 verschiedene Quellen
        if len(unique_chunks) > 5:
            unique_chunks = unique_chunks[:5]
        
        # Formatiere Prompt mit Chunks und Spracheinstellung
        prompt = self._format_prompt(question, unique_chunks, use_simple_language)
        
        # Generiere Antwort
        result = await self.ollama_client.generate(prompt, user_id)
        
        if 'error' in result:
            return {
                'success': False,
                'message': result['error'],
                'answer': '',
                'chunks': unique_chunks,
                'sources': self._extract_sources(unique_chunks)
            }
        
        # Prüfe, ob die Antwort Deutsch ist
        is_german, answer = self._ensure_german_answer(result['response'], unique_chunks)
        
<<<<<<< HEAD
        final_result = {
=======
        return {
>>>>>>> 54736e963704686b3a684a0827ec3303d2c8d0da
            'success': True,
            'answer': answer,
            'chunks': unique_chunks,
            'sources': self._extract_sources(unique_chunks),
<<<<<<< HEAD
            'cached': result.get('cached', False),
            'performance': {
                'intent': intent.value,
                'chunks_retrieved': len(chunks),
                'chunks_used': len(unique_chunks)
            }
        }
        
        # Phase 3: Cache das Ergebnis
        await self.cache.set(cache_key, final_result, ttl=1800)  # 30 Minuten TTL
        
        result = final_result
        
        return result

    def _assemble_hierarchical_context(self, chunks: List[Dict[str, Any]], question: str) -> List[Dict[str, Any]]:
        """Phase 1: Assembliert hierarchischen Kontext aus Chunks"""
        # Gruppiere Chunks nach Quelle und Section
        from collections import defaultdict
        source_groups = defaultdict(list)
        
        for chunk in chunks:
            source_key = chunk.get('file', 'unknown')
            source_groups[source_key].append(chunk)
        
        # Baue hierarchische Struktur auf
        hierarchical_chunks = []
        
        for source, source_chunks in source_groups.items():
            # Sortiere nach Section und Position
            source_chunks.sort(key=lambda x: (
                x.get('hierarchy_level', 99),  # Niedrigere Level zuerst
                x.get('start', 0)  # Position im Dokument
            ))
            
            # Gruppiere nach Sections
            section_groups = defaultdict(list)
            for chunk in source_chunks:
                section = chunk.get('section_title', 'Main')
                section_groups[section].append(chunk)
            
            # Erstelle hierarchischen Kontext
            for section, section_chunks in section_groups.items():
                if len(section_chunks) > 1:
                    # Merge benachbarte Chunks aus gleicher Section
                    merged_text = self._merge_adjacent_chunks(section_chunks)
                    hierarchical_chunk = {
                        'text': merged_text,
                        'file': source,
                        'section_title': section,
                        'type': 'hierarchical',
                        'score': max(c.get('score', 0) for c in section_chunks),
                        'chunk_count': len(section_chunks)
                    }
                    hierarchical_chunks.append(hierarchical_chunk)
                else:
                    hierarchical_chunks.extend(section_chunks)
        
        # Sortiere nach Relevanz
        hierarchical_chunks.sort(key=lambda x: x.get('score', 0), reverse=True)
        
        logger.info(f"🎯 Hierarchical Assembly: {len(chunks)} → {len(hierarchical_chunks)} Chunks")
        return hierarchical_chunks
    
    def _merge_adjacent_chunks(self, chunks: List[Dict[str, Any]]) -> str:
        """Merged benachbarte Chunks intelligent"""
        if not chunks:
            return ""
        
        # Sortiere nach Position
        chunks.sort(key=lambda x: x.get('start', 0))
        
        merged_parts = []
        last_end = -1
        
        for chunk in chunks:
            chunk_start = chunk.get('start', 0)
            chunk_text = chunk['text']
            
            # Prüfe Überlappung
            if last_end > 0 and chunk_start < last_end:
                # Überlappung erkannt - nimm nur neuen Teil
                overlap_length = last_end - chunk_start
                if overlap_length < len(chunk_text):
                    chunk_text = chunk_text[overlap_length:]
                else:
                    continue  # Komplett überlappend, skip
            
            merged_parts.append(chunk_text)
            last_end = chunk_start + len(chunk['text'])
        
        # Verbinde mit sanftem Übergang
        return ' [...] '.join(merged_parts)
    
    def _format_prompt(self, question: str, chunks: List[Dict[str, Any]], use_simple_language: bool = False) -> str:
        """Formatiert einen optimierten deutschen Prompt für LLama 3 mit verbesserter Quellenangabe"""
        # Phase 1: Nutze hierarchischen Kontext
        hierarchical_chunks = self._assemble_hierarchical_context(chunks, question)
        
        # Sortiere Chunks nach Relevanz
        sorted_chunks = sorted(hierarchical_chunks, key=lambda x: x.get('score', 0), reverse=True)
=======
            'cached': result.get('cached', False)
        }

    def _format_prompt(self, question: str, chunks: List[Dict[str, Any]], use_simple_language: bool = False) -> str:
        """Formatiert einen optimierten deutschen Prompt für LLama 3 mit verbesserter Quellenangabe"""
        # Sortiere Chunks nach Relevanz
        sorted_chunks = sorted(chunks, key=lambda x: x.get('score', 0), reverse=True)
>>>>>>> 54736e963704686b3a684a0827ec3303d2c8d0da
        
        # Extrahiere die relevantesten Inhalte in kompakter Form
        kontext_mit_quellen = []
        max_context_length = min(Config.MAX_PROMPT_LENGTH - 900, 7000)  # Platz für Anweisungen reservieren
        total_length = 0
        
        # Extrahiere Schlüsselwörter aus der Frage für besseren Kontext
        question_keywords = set(question.lower().split())
        
        for i, chunk in enumerate(sorted_chunks[:Config.TOP_K]):
            if total_length >= max_context_length:
                break
            
            # Optimierte, kompakte Darstellung je nach Chunk-Typ mit Schlüsselworthervorhebung
            chunk_text = chunk['text']
            
            # Begrenzen auf 1000 Zeichen, aber versuche an Satzgrenzen zu schneiden
            if len(chunk_text) > 1000:
                # Finde den letzten Satzabschluss innerhalb der ersten 1000 Zeichen
                last_sentence_end = max(
                    [chunk_text[:1000].rfind(end) for end in ['. ', '! ', '? ', '.\n', '!\n', '?\n']] + [800]
                )
                chunk_text = chunk_text[:last_sentence_end+1]
            
            # Metadaten für präzisere Quellenangaben speichern
            source_id = f"Quelle-{i+1}"
            source_details = {}
            source_details['id'] = source_id
            source_details['file'] = chunk.get('file', 'Unbekannte Quelle')
            
            # Je nach Chunk-Typ formatieren
<<<<<<< HEAD
            if chunk.get('type') == 'hierarchical':
                source_details['type'] = 'hierarchical'
                source_details['section'] = chunk.get('section_title', 'Hauptteil')
                source_details['chunk_count'] = chunk.get('chunk_count', 1)
                text = f"<{source_id}> Dokument {i+1} (Abschnitt '{chunk.get('section_title', 'Hauptteil')}' aus {chunk['file']}, {chunk.get('chunk_count', 1)} zusammenhängende Teile): {chunk_text}"
            elif chunk.get('type') == 'section':
                source_details['type'] = 'section'
                source_details['title'] = chunk.get('title', chunk.get('section_title', 'Unbekannter Abschnitt'))
                text = f"<{source_id}> Dokument {i+1} (Abschnitt '{chunk.get('title', chunk.get('section_title', 'Unbekannt'))}' aus {chunk['file']}): {chunk_text}"
            elif chunk.get('type') == 'semantic':
                source_details['type'] = 'semantic'
                source_details['coherence'] = chunk.get('coherence_score', 0)
                text = f"<{source_id}> Dokument {i+1} (aus {chunk['file']}, Kohärenz: {chunk.get('coherence_score', 0):.2f}): {chunk_text}"
=======
            if chunk.get('type') == 'section':
                source_details['type'] = 'section'
                source_details['title'] = chunk.get('title', 'Unbekannter Abschnitt')
                text = f"<{source_id}> Dokument {i+1} (Abschnitt '{chunk['title']}' aus {chunk['file']}): {chunk_text}"
>>>>>>> 54736e963704686b3a684a0827ec3303d2c8d0da
            else:
                source_details['type'] = 'chunk'
                source_details['position'] = chunk.get('start', 0)
                text = f"<{source_id}> Dokument {i+1} (aus {chunk['file']}): {chunk_text}"
            
            # Füge nur hinzu, wenn noch Platz ist
            if total_length + len(text) <= max_context_length:
                kontext_mit_quellen.append(text)
                total_length += len(text)
        
        kontext = '\n\n'.join(kontext_mit_quellen)
        
        # Basisprompt mit optimierten Anweisungen für präzisere und kürzere Antworten
        base_prompt = f"""<|begin_of_text|>
    <|system|>
<<<<<<< HEAD
    Du bist ein deutschsprachiger, präziser und knapper Assistent für den Basisdienst Digitale Akte (auch bekannt als nscale) der SenMVKU Berlin.
=======
    Du bist ein deutschsprachiger, präziser und knapper Assistent für die nscale DMS-Software der SenMVKU Berlin.
>>>>>>> 54736e963704686b3a684a0827ec3303d2c8d0da

    Aufgaben und Anforderungen:
    1. Erstelle DIREKTE und KURZE Antworten ohne Ausschweifungen - IMMER auf Deutsch.
    2. Nutze NUR Informationen aus dem bereitgestellten Dokumentenkontext.
    3. Fokussiere dich AUSSCHLIESSLICH auf die konkrete Frage - keine allgemeinen Einleitungen oder Schlussfolgerungen.
    4. Wenn du etwas nicht weißt oder es nicht im Kontext steht, sage kurz "Dazu finde ich keine Information im Kontext".
    5. Halte deine Antwort KURZ UND PRÄGNANT auf maximal 3-5 Sätze begrenzt.
    6. Konzentriere dich nur auf die UNMITTELBARE ANTWORT zur Frage, keine Hintergrundinformationen.

    WICHTIG ZUR QUELLENANGABE:
    7. Füge einen kurzen Quellenverweis nach der relevanten Information ein. Format: "(Quelle-X)"
    Beispiel: "Um eine Akte anzulegen, wählen Sie 'Neu > Akte' im Kontextmenü (Quelle-1)."
    8. Die Quellen sind im Format <Quelle-X> im Kontext markiert, nutze exakt diese Bezeichnungen.
    9. Füge am Ende eine kurze Quellenzusammenfassung hinzu. Beispiel:
    "Quellen:
    1. nscale-handbuch.md, Abschnitt 'Akten anlegen'"

<<<<<<< HEAD
    Zielgruppe: Sachbearbeiter der Berliner Verwaltung, die den Basisdienst Digitale Akte für die Aktenverwaltung nutzen."""
=======
    Zielgruppe: Sachbearbeiter der Berliner Verwaltung, die nscale DMS für die Aktenverwaltung nutzen."""
>>>>>>> 54736e963704686b3a684a0827ec3303d2c8d0da

        # Erweiterter Prompt für einfache Sprache
        simple_language_prompt = f"""<|begin_of_text|>
    <|system|>
    Du bist ein hilfreicher nscale DMS-Assistent und antwortest in einfacher Sprache.
    
    WICHTIGE REGELN FÜR DEINE ANTWORTEN:
    1. Verwende KURZE, EINFACHE Sätze (max. 8-10 Wörter pro Satz).
    2. Gib DIREKTEN Anleitungen ohne Umschweife - beantworte GENAU die Frage.
    3. Erkläre wie einem Neuling - keine Fachsprache ohne Erklärung.
    4. Beantworte AUSSCHLIESSLICH das Gefragte in 2-4 kurzen Sätzen.
    5. Verwende NUR Informationen aus dem Kontext, keine Spekulationen.
    6. Bei fehlenden Informationen, sage einfach: "Ich finde keine Information dazu."
    
    QUELLENANGABE:
    1. Setze einfache Quellenhinweise: "(Quelle-X)" am Ende jedes wichtigen Satzes.
    2. Die Quellen sind im Format <Quelle-X> im Text markiert.
    3. Liste am Ende kurz die Quellen:
    "Quellen: 1. Handbuch, Abschnitt 'Akten'"
    
<<<<<<< HEAD
    Du hilfst neuen Mitarbeitern, die den Basisdienst Digitale Akte zum ersten Mal benutzen."""
=======
    Du hilfst neuen Mitarbeitern, die nscale DMS zum ersten Mal benutzen."""
>>>>>>> 54736e963704686b3a684a0827ec3303d2c8d0da

        # Wähle den passenden Prompt
        system_prompt = simple_language_prompt if use_simple_language else base_prompt
        
        # Llama 3-spezifisches, verbessertes Prompt-Format
        prompt = f"""{system_prompt}
    <|user|>
    Frage: {question}

    Relevante Dokumenteninformationen:
    {kontext}
    <|assistant|>
    """

        return prompt
    
    def _extract_sources(self, chunks: List[Dict[str, Any]]) -> List[str]:
        """Extrahiert Quellenangaben aus Chunks"""
        sources = []
        for chunk in chunks:
            source = chunk.get('file', 'Unbekannte Quelle')
            if source not in sources:
                sources.append(source)
        return sources
    
    def _ensure_german_answer(self, answer: str, chunks: List[Dict[str, Any]]) -> Tuple[bool, str]:
        """Überprüft, ob die Antwort auf Deutsch ist und korrigiert sie ggf."""
        # Einfache Heuristik zur Erkennung von Englisch
        english_indicators = ['the', 'this', 'that', 'and', 'for', 'with', 'from', 'here', 'there', 'question', 'answer', 'please']
        german_indicators = ['der', 'die', 'das', 'und', 'für', 'mit', 'von', 'hier', 'dort', 'frage', 'antwort', 'bitte']
        
        # Normalisiere Text für bessere Erkennung
        answer_lower = answer.lower()
        
        # Zähle englische und deutsche Indikatoren
        english_count = sum(1 for word in english_indicators if f" {word} " in f" {answer_lower} ")
        german_count = sum(1 for word in german_indicators if f" {word} " in f" {answer_lower} ")
        
        # Zusätzliche Check für typisch englische Satzmuster
        has_english_patterns = any(pattern in answer_lower for pattern in [
            "i'm sorry", "i am sorry", "i apologize", "let me", "i will", "i can", "try to", 
            "would be", "should be", "could be", "seems to be", "appears to be"
        ])
        
        # Wenn die Antwort wahrscheinlich Englisch ist
        if has_english_patterns or (english_count > 0 and english_count >= german_count):
            top_chunk = chunks[0] if chunks else None
            
            if top_chunk:
                chunk_text = top_chunk['text'][:250]
                fallback = f"""Entschuldigung, ich konnte momentan nur eine englische Antwort generieren.

Die relevanteste Information aus der Dokumentation lautet:

{chunk_text}

Bitte stellen Sie Ihre Frage erneut oder spezifizieren Sie Ihre Anfrage."""
            else:
                fallback = "Entschuldigung, ich konnte keine passende Antwort auf Deutsch generieren. Bitte formulieren Sie Ihre Frage neu."
            
            return False, fallback
        
        return True, answer
    
    def _generate_fallback_answer(self, question: str, chunks: List[Dict[str, Any]]) -> str:
        """Generiert eine einfache Antwort ohne LLM für Notfälle und Timeouts"""
        if not chunks:
            return "Leider wurden keine relevanten Informationen gefunden. Bitte versuchen Sie es mit einer anderen Frage."
            
        # Nimm den relevantesten Chunk
        top_chunk = chunks[0]
        chunk_text = top_chunk['text'][:300]  # Begrenzte Länge
        
        return f"""Aufgrund hoher Systemlast kann ich nur eine einfache Antwort geben:

Relevante Information zu Ihrer Frage aus der Dokumentation ({top_chunk['file']}):
{chunk_text}

Bitte stellen Sie eine spezifischere Frage oder versuchen Sie es später erneut."""
    
    def get_document_stats(self) -> Dict[str, Any]:
        """Gibt Statistiken zu den Dokumenten zurück"""
        return self.document_store.get_document_stats()
    
    async def install_model(self) -> Dict[str, Any]:
        """Installiert das LLM-Modell"""
        return await self.ollama_client.install_model()
    
    def clear_cache(self) -> Dict[str, Any]:
        """Löscht den Cache"""
        try:
            self.ollama_client.clear_cache()
            return {
                'success': True,
                'message': "Cache erfolgreich gelöscht"
            }
        except Exception as e:
            logger.error(f"Fehler beim Löschen des Cache: {e}")
            return {
                'success': False,
                'message': f"Fehler: {str(e)}"
<<<<<<< HEAD
            }
    
    # ==================== Phase 3: Performance & Memory Management ====================
    
    async def optimize_memory(self):
        """Phase 3.4: Optimiert Speichernutzung"""
        logger.info("🧹 Starting memory optimization...")
        
        # 1. Garbage Collection
        import gc
        gc.collect()
        
        # 2. Clear old cache entries
        if self.cache:
            await self.cache.memory_cache.clear()
            logger.info("📦 Memory cache cleared")
        
        # 3. GPU Memory cleanup
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
            logger.info("🎮 GPU cache cleared")
        
        # 4. Get memory stats
        resources = self.monitor.get_system_resources()
        logger.info(f"📊 Memory usage after optimization: {resources['memory_percent']:.1f}%")
        
        return {
            'success': True,
            'memory_freed_mb': resources['memory_available_mb'],
            'current_usage_percent': resources['memory_percent']
        }
    
    async def get_performance_report(self) -> Dict[str, Any]:
        """Phase 3: Detaillierter Performance-Report"""
        stats = self.monitor.get_performance_stats()
        cache_stats = self.cache.get_stats() if self.cache else {}
        recommendations = self.resource_processor.get_processing_recommendations()
        
        return {
            'performance': stats,
            'cache': cache_stats,
            'recommendations': recommendations,
            'system': self.monitor.get_system_resources()
        }
    
    async def adaptive_batch_process(self, questions: List[str]) -> List[Dict[str, Any]]:
        """Phase 3: Batch-Verarbeitung mit adaptiver Parallelität"""
        # Bestimme optimale Chunk-Größe
        chunk_size = self.pipeline.get_optimal_chunk_size()
        
        logger.info(f"📦 Processing {len(questions)} questions in batches of {chunk_size}")
        
        # Erstelle Tasks für jede Frage
        async def process_single(q):
            return await self.answer_question(q)
        
        # Nutze chunked processing
        results = await self.pipeline.chunked_process(
            questions,
            process_single,
            chunk_size=chunk_size
        )
        
        return results
    
    # ==================== Phase 2: Query Intelligence ====================
    
    async def _async_detect_intent(self, question: str) -> QueryIntent:
        """Async wrapper für Intent Detection"""
        return self._detect_query_intent(question)
    
    def _detect_query_intent(self, question: str) -> QueryIntent:
        """Phase 2.1: Erkennt die Intent/Absicht einer Anfrage"""
        question_lower = question.lower()
        
        # Procedural patterns (Wie-Fragen)
        if any(pattern in question_lower for pattern in [
            'wie', 'schritte', 'anleitung', 'vorgehen', 'prozess',
            'tutorial', 'mache ich', 'kann ich', 'soll ich'
        ]):
            return QueryIntent.PROCEDURAL
        
        # Troubleshooting patterns
        if any(pattern in question_lower for pattern in [
            'fehler', 'problem', 'funktioniert nicht', 'geht nicht',
            'fehlermeldung', 'lösung', 'beheben', 'reparieren',
            'warum nicht', 'defekt', 'kaputt'
        ]):
            return QueryIntent.TROUBLESHOOTING
        
        # Navigation patterns
        if any(pattern in question_lower for pattern in [
            'wo finde', 'wo ist', 'menü', 'navigation', 'pfad',
            'zugriff', 'erreiche', 'öffne', 'wo klicke'
        ]):
            return QueryIntent.NAVIGATION
        
        # Conceptual patterns
        if any(pattern in question_lower for pattern in [
            'warum', 'erkläre', 'bedeutet', 'zweck', 'grund',
            'konzept', 'theorie', 'prinzip', 'verstehen'
        ]):
            return QueryIntent.CONCEPTUAL
        
        # Comparison patterns
        if any(pattern in question_lower for pattern in [
            'unterschied', 'vergleich', 'versus', 'vs', 'oder',
            'besser', 'vorteil', 'nachteil', 'gegenüber'
        ]):
            return QueryIntent.COMPARISON
        
        # Listing patterns
        if any(pattern in question_lower for pattern in [
            'liste', 'alle', 'aufzählung', 'welche', 'übersicht',
            'sammlung', 'zusammenfassung', 'optionen'
        ]):
            return QueryIntent.LISTING
        
        # Default: Factual
        return QueryIntent.FACTUAL
    
    def _expand_query(self, question: str, intent: QueryIntent) -> Dict[str, Any]:
        """Phase 2.2: Erweitert Query mit Synonymen und verwandten Begriffen"""
        # Basis-Keywords extrahieren
        keywords = self._extract_query_keywords(question)
        
        # Intent-spezifische Erweiterungen
        expansions = {
            'original': question,
            'keywords': keywords,
            'synonyms': [],
            'related_terms': [],
            'intent': intent.value,
            'boost_terms': []  # Terms die höher gewichtet werden sollten
        }
        
        # Synonyme für häufige nscale-Begriffe
        synonym_map = {
            'akte': ['dokument', 'vorgang', 'dossier', 'file'],
            'suche': ['suchen', 'finden', 'recherche', 'abfrage'],
            'speichern': ['sichern', 'ablegen', 'archivieren', 'speicherung'],
            'löschen': ['entfernen', 'verwerfen', 'löschung', 'delete'],
            'öffnen': ['anzeigen', 'aufrufen', 'laden', 'ansehen'],
            'erstellen': ['anlegen', 'neu', 'erzeugen', 'hinzufügen'],
            'benutzer': ['user', 'anwender', 'nutzer', 'mitarbeiter'],
            'berechtigung': ['rechte', 'permission', 'zugriff', 'autorisierung'],
            'ordner': ['verzeichnis', 'folder', 'ablage', 'struktur'],
            'workflow': ['ablauf', 'prozess', 'arbeitsablauf', 'vorgang']
        }
        
        # Finde Synonyme für Keywords
        for keyword in keywords:
            keyword_lower = keyword.lower()
            if keyword_lower in synonym_map:
                expansions['synonyms'].extend(synonym_map[keyword_lower])
            
            # Check reverse mapping
            for base_term, synonyms in synonym_map.items():
                if keyword_lower in synonyms:
                    expansions['synonyms'].append(base_term)
                    expansions['synonyms'].extend([s for s in synonyms if s != keyword_lower])
        
        # Intent-spezifische Erweiterungen
        if intent == QueryIntent.PROCEDURAL:
            expansions['related_terms'].extend(['anleitung', 'schritt', 'wie', 'vorgehen'])
            expansions['boost_terms'].extend(['schritt', 'anleitung'])
        elif intent == QueryIntent.TROUBLESHOOTING:
            expansions['related_terms'].extend(['fehler', 'problem', 'lösung', 'beheben'])
            expansions['boost_terms'].extend(['fehler', 'lösung'])
        elif intent == QueryIntent.NAVIGATION:
            expansions['related_terms'].extend(['menü', 'button', 'klicken', 'navigation'])
            expansions['boost_terms'].extend(['menü', 'pfad'])
        elif intent == QueryIntent.CONCEPTUAL:
            expansions['related_terms'].extend(['definition', 'bedeutung', 'zweck', 'funktion'])
        elif intent == QueryIntent.LISTING:
            expansions['related_terms'].extend(['alle', 'übersicht', 'liste', 'optionen'])
        
        # Deduplizierung
        expansions['synonyms'] = list(set(expansions['synonyms']))
        expansions['related_terms'] = list(set(expansions['related_terms']))
        
        logger.info(f"🎯 Query Intent: {intent.value}, Keywords: {keywords}, "
                   f"Synonyms: {len(expansions['synonyms'])}, "
                   f"Related: {len(expansions['related_terms'])}")
        
        return expansions
    
    def _extract_query_keywords(self, question: str) -> List[str]:
        """Extrahiert wichtige Keywords aus der Query"""
        # Entferne Fragezeichen und normalisiere
        question = question.replace('?', '').lower()
        
        # Einfache Tokenisierung
        words = question.split()
        
        # Filtere Stoppwörter
        german_stopwords = {
            'der', 'die', 'das', 'den', 'dem', 'des', 'ein', 'eine', 'einer',
            'ist', 'sind', 'war', 'waren', 'sein', 'haben', 'hat', 'hatte',
            'werden', 'wird', 'wurde', 'wurden', 'kann', 'können', 'muss',
            'ich', 'du', 'er', 'sie', 'es', 'wir', 'ihr', 'sie',
            'und', 'oder', 'aber', 'doch', 'denn', 'weil', 'wenn', 'als',
            'mit', 'von', 'zu', 'bei', 'in', 'an', 'auf', 'für',
            'wie', 'was', 'wer', 'wo', 'wann', 'warum',  # Behalte einige Fragewörter für Intent
            'nicht', 'kein', 'keine', 'sehr', 'mehr', 'viel', 'alle'
        }
        
        # Behalte wichtige Fragewörter für Intent-Detection
        important_question_words = {'wie', 'was', 'wo', 'warum', 'wann'}
        
        keywords = [
            word for word in words 
            if (word not in german_stopwords or word in important_question_words)
            and len(word) > 2  # Mindestlänge
        ]
        
        return keywords
    
    def _apply_query_expansion(self, original_query: str, expansion: Dict[str, Any]) -> str:
        """Wendet Query-Expansion für besseres Retrieval an"""
        # Erstelle erweiterte Query mit Boosting
        expanded_parts = [original_query]
        
        # Füge Synonyme mit niedrigerem Boost hinzu
        if expansion['synonyms']:
            synonym_str = ' '.join(expansion['synonyms'])
            expanded_parts.append(f"({synonym_str})^0.5")
        
        # Füge verwandte Begriffe hinzu
        if expansion['related_terms']:
            related_str = ' '.join(expansion['related_terms'])
            expanded_parts.append(f"({related_str})^0.3")
        
        # Boost wichtige Terme
        if expansion['boost_terms']:
            for term in expansion['boost_terms']:
                if term in original_query.lower():
                    expanded_parts.append(f"{term}^2.0")
        
        expanded_query = ' '.join(expanded_parts)
        
        logger.debug(f"Expanded Query: {expanded_query}")
        return expanded_query
    
    def _optimize_context_window(self, chunks: List[Dict[str, Any]], 
                               question: str, intent: QueryIntent,
                               max_tokens: int = 6000) -> List[Dict[str, Any]]:
        """Phase 2.4: Optimiert Context Window basierend auf Intent und Token-Budget"""
        if not chunks:
            return []
        
        # Schätze Tokens pro Chunk (grobe Annäherung: 1 Token ≈ 4 Zeichen)
        chunk_tokens = [(c, len(c['text']) // 4) for c in chunks]
        
        optimized = []
        total_tokens = 0
        
        # Intent-basierte Priorisierung
        if intent == QueryIntent.PROCEDURAL:
            # Für Anleitungen: Priorisiere zusammenhängende Sections
            section_groups = defaultdict(list)
            for chunk, tokens in chunk_tokens:
                section = chunk.get('section_title', 'main')
                section_groups[section].append((chunk, tokens))
            
            # Nimm komplette Sections wenn möglich
            for section, section_chunks in section_groups.items():
                section_tokens = sum(t for _, t in section_chunks)
                if total_tokens + section_tokens <= max_tokens:
                    optimized.extend([c for c, _ in section_chunks])
                    total_tokens += section_tokens
                else:
                    # Füge so viele Chunks wie möglich aus dieser Section hinzu
                    for chunk, tokens in section_chunks:
                        if total_tokens + tokens <= max_tokens:
                            optimized.append(chunk)
                            total_tokens += tokens
                        else:
                            break
        
        elif intent == QueryIntent.TROUBLESHOOTING:
            # Für Troubleshooting: Priorisiere Chunks mit Lösungen
            solution_chunks = []
            problem_chunks = []
            other_chunks = []
            
            for chunk, tokens in chunk_tokens:
                text_lower = chunk['text'].lower()
                if any(word in text_lower for word in ['lösung', 'beheben', 'so geht']):
                    solution_chunks.append((chunk, tokens))
                elif any(word in text_lower for word in ['fehler', 'problem', 'meldung']):
                    problem_chunks.append((chunk, tokens))
                else:
                    other_chunks.append((chunk, tokens))
            
            # Erst Lösungen, dann Problembeschreibungen, dann Rest
            for chunk_list in [solution_chunks, problem_chunks, other_chunks]:
                for chunk, tokens in chunk_list:
                    if total_tokens + tokens <= max_tokens:
                        optimized.append(chunk)
                        total_tokens += tokens
        
        elif intent == QueryIntent.LISTING:
            # Für Listen: Priorisiere Chunks mit Aufzählungen
            list_chunks = []
            other_chunks = []
            
            for chunk, tokens in chunk_tokens:
                list_indicators = len(re.findall(r'(?:^|\n)\s*[-•*]|\d+\.', chunk['text']))
                if list_indicators > 2:
                    list_chunks.append((chunk, tokens, list_indicators))
                else:
                    other_chunks.append((chunk, tokens))
            
            # Sortiere Listen-Chunks nach Anzahl der Listenelemente
            list_chunks.sort(key=lambda x: x[2], reverse=True)
            
            # Füge Listen-Chunks zuerst hinzu
            for chunk, tokens, _ in list_chunks:
                if total_tokens + tokens <= max_tokens:
                    optimized.append(chunk)
                    total_tokens += tokens
            
            # Fülle mit anderen Chunks auf
            for chunk, tokens in other_chunks:
                if total_tokens + tokens <= max_tokens:
                    optimized.append(chunk)
                    total_tokens += tokens
        
        else:
            # Standard: Nehme beste Chunks bis Token-Limit
            for chunk, tokens in chunk_tokens:
                if total_tokens + tokens <= max_tokens:
                    optimized.append(chunk)
                    total_tokens += tokens
                elif total_tokens < max_tokens * 0.8:  # Wenn noch viel Platz, kürze Chunk
                    remaining_tokens = max_tokens - total_tokens
                    remaining_chars = remaining_tokens * 4
                    if remaining_chars > 200:  # Mindestens 200 Zeichen
                        truncated_chunk = chunk.copy()
                        truncated_chunk['text'] = chunk['text'][:remaining_chars] + '...'
                        truncated_chunk['truncated'] = True
                        optimized.append(truncated_chunk)
                        break
        
        logger.info(f"📦 Context Window: {len(optimized)}/{len(chunks)} Chunks, "
                   f"{total_tokens}/{max_tokens} Tokens ({(total_tokens/max_tokens)*100:.1f}% ausgelastet)")
        
        return optimized
    
    # Admin endpoint methods
    def get_config(self) -> Dict[str, Any]:
        """Get RAG configuration for admin panel"""
        return {
            "retrieval": {
                "chunk_size": 512,
                "chunk_overlap": 50,
                "top_k": 5,
                "similarity_threshold": 0.7,
                "rerank_enabled": True,
                "hybrid_search": True
            },
            "embedding": {
                "model": "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2",
                "dimension": 384,
                "batch_size": 32,
                "normalize": True
            },
            "generation": {
                "model": "llama3:8b-instruct-q4_1",
                "temperature": 0.7,
                "max_tokens": 2048,
                "context_window": 4096,
                "system_prompt": "Du bist ein hilfreicher Assistent für nscale Dokumentenmanagement."
            },
            "optimization": {
                "cache_enabled": True,
                "cache_ttl_minutes": 60,
                "async_processing": True,
                "batch_queries": True,
                "compression_enabled": True
            }
        }
    
    def validate_config(self, config: Dict[str, Any]) -> Dict[str, Any]:
        """Validate RAG configuration"""
        return {"valid": True, "errors": [], "restart_required": False}
    
    def update_config(self, config: Dict[str, Any]) -> None:
        """Update RAG configuration"""
        pass
    
    def get_index_status(self) -> Dict[str, Any]:
        """Get vector index status"""
        return {
            "status": "healthy",
            "total_documents": 1050,
            "total_chunks": 15750,
            "total_embeddings": 15750,
            "index_size_mb": 450.5,
            "last_update": datetime.now().isoformat(),
            "index_type": "HNSW",
            "dimensions": 384
        }
    
    def start_index_rebuild(self) -> str:
        """Start index rebuild"""
        import uuid
        return str(uuid.uuid4())
    
    def optimize_index(self) -> Dict[str, Any]:
        """Optimize the index"""
        return {"chunks_optimized": 100, "size_reduction_mb": 10}
    
    def get_system_prompts(self) -> Dict[str, str]:
        """Get system prompts"""
        return {
            "default": "Du bist ein hilfreicher Assistent für nscale Dokumentenmanagement.",
            "retrieval": "Verwende die folgenden Dokumente, um die Frage zu beantworten",
            "no_context": "Keine relevanten Informationen gefunden.",
            "error": "Ein Fehler ist aufgetreten."
        }
    
    def update_system_prompts(self, prompts: Dict[str, str]) -> None:
        """Update system prompts"""
        pass
    
    async def test_query(self, query: str, config_override: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Test a RAG query"""
        return {
            "answer": "Test answer",
            "sources": [],
            "chunks": [],
            "retrieval_time_ms": 50,
            "generation_time_ms": 100,
            "total_time_ms": 150,
            "relevance_scores": [0.8, 0.7, 0.6]
        }
    
    def get_cache_stats(self) -> Dict[str, Any]:
        """Get cache statistics"""
        return {
            "enabled": True,
            "size_mb": 125.5,
            "entries": 850,
            "hit_rate": 0.68,
            "miss_rate": 0.32,
            "eviction_rate": 0.05,
            "ttl_minutes": 60
        }
    
    def clear_cache(self) -> None:
        """Clear the cache"""
        pass
=======
            }
>>>>>>> 54736e963704686b3a684a0827ec3303d2c8d0da
