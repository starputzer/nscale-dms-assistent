import asyncio
from typing import Dict, Any, List, Optional

from ..core.config import Config
from ..core.logging import LogManager
from ..retrieval.document_store import DocumentStore
from ..retrieval.embedding import EmbeddingManager
from ..llm.model import OllamaClient

logger = LogManager.setup_logging(__name__)

class RAGEngine:
    """Hauptmodul für RAG-Funktionalität"""
    
    def __init__(self):
        self.document_store = DocumentStore()
        self.embedding_manager = EmbeddingManager()
        self.ollama_client = OllamaClient()
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
            
            # Generiere Antwort
            result = await self.ollama_client.generate(prompt, user_id)
            
            if 'error' in result:
                return {
                    'success': False,
                    'message': result['error']
                }
            
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
    
    def _format_prompt(self, question: str, chunks: List[Dict[str, Any]]) -> str:
        """Formatiert einen optimierten deutschen Prompt"""
        # Extrem kompakte Kontextaufbereitung
        kontext_mit_quellen = []
        max_context_length = min(Config.MAX_PROMPT_LENGTH - 500, 1000)  # Reserviere Platz für Anweisungen
        total_length = 0
        
        for i, chunk in enumerate(chunks[:Config.TOP_K]):
            if total_length >= max_context_length:
                break
                
            # Kompakte Darstellung je nach Chunk-Typ
            if chunk.get('type') == 'section':
                text = f"Dokument {i+1} (Abschnitt '{chunk['title']}' aus {chunk['file']}): {chunk['text'][:200]}"
            else:
                text = f"Dokument {i+1} (aus {chunk['file']}): {chunk['text'][:200]}"
            
            # Füge nur hinzu, wenn noch Platz ist
            if total_length + len(text) <= max_context_length:
                kontext_mit_quellen.append(text)
                total_length += len(text)
        
        kontext = '\n\n'.join(kontext_mit_quellen)
        
        # Modellspezifische Prompts (alle auf Deutsch)
        if Config.MODEL_NAME == 'phi':
            prompt = f"""<s>Du bist ein deutschsprachiger Support-Assistent für die nscale DMS-Software. 
Beantworte die folgende Frage präzise und in gutem Deutsch.

Frage: {question}

Relevante Informationen:
{kontext}

Beantworte die Frage auf Deutsch und im Kontext der nscale DMS-Software.
Halte deine Antwort knapp und präzise.</s>
"""
        elif 'tinyllama' in Config.MODEL_NAME:
            # Minimaler Prompt für kleinere Modelle
            prompt = f"""Deine Aufgabe: Beantworte diese Frage auf Deutsch zur nscale DMS-Software.

Frage: {question}

Informationen:
{kontext}

Antworte knapp, präzise und AUF DEUTSCH. Nutze nur die gegebenen Informationen."""
        else:
            # Generischer Prompt für andere Modelle
            prompt = f"""Als deutschsprachiger Support-Assistent für die nscale DMS-Software:

Frage: {question}

Kontext:
{kontext}

Antworte auf Deutsch, knapp und präzise. Verwende ausschließlich die bereitgestellten Informationen.
"""
        
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