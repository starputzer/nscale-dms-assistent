import asyncio
import time
from typing import Dict, Any, List, Optional

from ..core.config import Config
from ..core.logging import LogManager
from ..retrieval.document_store import DocumentStore
from ..retrieval.embedding import EmbeddingManager
from ..llm.model import OllamaClient
from .fallback_search import FallbackSearch

logger = LogManager.setup_logging(__name__)

class RAGEngine:
    """Hauptmodul für RAG-Funktionalität mit Fallback-Mechanismen"""
    
    def __init__(self):
        self.document_store = DocumentStore()
        self.embedding_manager = EmbeddingManager()
        self.ollama_client = OllamaClient()
        self.fallback_search = FallbackSearch()
        self.initialized = False
        self._init_lock = asyncio.Lock()  # Lock für Thread-Sicherheit bei Initialisierung
    
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
                
                # Verarbeite Chunks
                chunks = self.document_store.get_chunks()
                if not self.embedding_manager.process_chunks(chunks):
                    logger.error("Fehler bei der Verarbeitung der Chunks")
                    return False
                
                # Initialisiere Fallback-Suche
                if not self.fallback_search.initialize(chunks):
                    logger.warning("Fallback-Suche konnte nicht initialisiert werden")
                
                self.initialized = True
                logger.info("RAG-Engine erfolgreich initialisiert")
                return True
            
            except Exception as e:
                logger.error(f"Fehler bei der Initialisierung der RAG-Engine: {e}")
                return False
    
    async def answer_question(self, question: str, user_id: Optional[int] = None) -> Dict[str, Any]:
        """Beantwortet eine Frage mit dem RAG-System"""
        if not self.initialized:
            success = await self.initialize()
            if not success:
                return {
                    'success': False,
                    'message': "System konnte nicht initialisiert werden"
                }
        
        try:
            # Überprüfe Eingabegröße
            if len(question) > 1000:
                logger.warning(f"Frage zu lang ({len(question)} Zeichen), wird gekürzt")
                question = question[:1000]
            
            # Suche relevante Chunks
            relevant_chunks = self.embedding_manager.search(question, top_k=Config.TOP_K)
            
            if not relevant_chunks:
                return {
                    'success': False,
                    'message': "Keine relevanten Informationen gefunden"
                }
            
            # Erstelle Prompt mit komprimiertem Kontext
            prompt = self._format_prompt(question, relevant_chunks)
            
            # Warne, wenn Prompt zu lang ist
            if len(prompt) > Config.MAX_PROMPT_LENGTH:
                logger.warning(f"Prompt zu lang: {len(prompt)} Zeichen, wird gekürzt")
                prompt = prompt[:Config.MAX_PROMPT_LENGTH]
            
            # Zeitmessung starten für Timeout-Erkennung
            start_time = time.time()
            
            # Generiere Antwort mit Timeout-Überwachung
            try:
                # Setze einen Timer
                result_future = asyncio.create_task(self.ollama_client.generate(prompt, user_id))
                
                # Warte auf die Antwort mit Timeout
                try:
                    result = await asyncio.wait_for(result_future, timeout=Config.LLM_TIMEOUT)
                except asyncio.TimeoutError:
                    logger.warning(f"Asyncio Timeout nach {time.time() - start_time:.2f}s")
                    # Fallback aktivieren
                    return await self._use_fallback(question, relevant_chunks, reason="timeout")
            
            except Exception as e:
                logger.error(f"Fehler bei LLM-Anfrage: {e}")
                return await self._use_fallback(question, relevant_chunks, reason="error")
            
            # Prüfe, ob Fehler aufgetreten ist
            if 'error' in result:
                logger.warning(f"LLM-Fehler: {result['error']}")
                return await self._use_fallback(question, relevant_chunks, reason="error")
            
            return {
                'success': True,
                'answer': result['response'],
                'sources': list(set(chunk['file'] for chunk in relevant_chunks)),  # Entferne Duplikate
                'chunks': relevant_chunks,
                'cached': result.get('cached', False)
            }
        
        except Exception as e:
            logger.error(f"Fehler beim Beantworten der Frage: {e}")
            return {
                'success': False,
                'message': f"Fehler: {str(e)}"
            }
    
    async def _use_fallback(self, question: str, chunks: List[Dict[str, Any]], reason: str = "unknown") -> Dict[str, Any]:
        """Verwendet den Fallback-Mechanismus"""
        logger.info(f"Aktiviere Fallback-Mechanismus (Grund: {reason})")
        
        # Suche für Fallback (kann anders sein als die semantische Suche)
        fallback_chunks = chunks
        if not chunks or reason == "no_results":
            fallback_chunks = self.fallback_search.search(question)
        
        # Generiere eine einfache Antwort
        answer = self.fallback_search.generate_answer(question, fallback_chunks)
        
        return {
            'success': True,
            'answer': answer,
            'sources': list(set(chunk['file'] for chunk in fallback_chunks)) if fallback_chunks else [],
            'chunks': fallback_chunks,
            'cached': False,
            'fallback': True
        }
    
    def _format_prompt(self, question: str, chunks: List[Dict[str, Any]]) -> str:
        """Formatiert einen optimierten Prompt basierend auf dem verwendeten Modell"""
        # Optimiere die Menge der Kontextinformationen
        kontext_mit_quellen = []
        
        # Beschränke die Gesamtlänge des Kontexts
        total_context_length = 0
        max_context_length = min(Config.MAX_PROMPT_LENGTH - 500, 1500)  # Noch stärker limitieren
        
        for i, chunk in enumerate(chunks):
            # Überprüfe, ob wir zu viel Kontext haben
            if total_context_length > max_context_length or i >= Config.TOP_K:
                break
                
            # Formatiere je nach Chunk-Typ
            if chunk.get('type') == 'section':
                kontext = f"Information {i+1} aus {chunk['file']} (Abschnitt: {chunk['title']}): {chunk['text'][:250]}"
            else:
                # Füge Dateinamen als Kontext hinzu
                kontext = f"Information {i+1} aus {chunk['file']}: {chunk['text'][:250]}"
                
            # Begrenzte Kontextlänge
            if len(kontext) + total_context_length <= max_context_length:
                kontext_mit_quellen.append(kontext)
                total_context_length += len(kontext)
        
        kontext = '\n\n'.join(kontext_mit_quellen)
        
        # Wähle ein sehr kompaktes Prompt-Format
        prompt = f"""<s>nscale DMS-Assistent. Beantworte knapp & präzise:

Frage: {question}

Kontext:
{kontext}

Antworte kurz und sachlich.</s>"""
        
        return prompt
    
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
            }