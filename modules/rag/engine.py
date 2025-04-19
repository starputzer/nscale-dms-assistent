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
            relevant_chunks = self.embedding_manager.search(question)
            
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
            
            # Generiere Antwort
            result = await self.ollama_client.generate(prompt, user_id)
            
            if 'error' in result:
                # Versuche Fallback mit reduziertem Kontext wenn Fehler
                if 'timeout' in result['error'].lower() or len(prompt) > 4000:
                    logger.warning("Versuche Fallback mit reduziertem Kontext")
                    # Reduziere die Anzahl der verwendeten Chunks
                    reduced_chunks = relevant_chunks[:1]  # Verwende nur den relevantesten Chunk
                    fallback_prompt = self._format_prompt(question, reduced_chunks)
                    fallback_result = await self.ollama_client.generate(fallback_prompt, user_id)
                    
                    if 'error' not in fallback_result:
                        return {
                            'success': True,
                            'answer': fallback_result['response'],
                            'sources': [chunk['file'] for chunk in reduced_chunks],
                            'chunks': reduced_chunks,
                            'cached': fallback_result.get('cached', False),
                            'fallback': True
                        }
                
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
        """Formatiert einen optimierten Prompt basierend auf dem verwendeten Modell"""
        # Optimiere die Menge der Kontextinformationen
        kontext_mit_quellen = []
        
        # Beschränke die Gesamtlänge des Kontexts
        used_files = set()
        total_context_length = 0
        max_context_length = Config.MAX_PROMPT_LENGTH - 1000  # Reserve für Anweisungen
        
        for i, chunk in enumerate(chunks):
            # Überprüfe, ob wir zu viel Kontext haben
            if total_context_length > max_context_length:
                break
                
            # Vermeide doppelte Dateien
            if chunk['file'] in used_files and len(kontext_mit_quellen) > 2:
                continue
                
            used_files.add(chunk['file'])
            
            # Formatiere je nach Chunk-Typ
            if chunk.get('type') == 'section':
                kontext = f"Abschnitt {i+1}: \"{chunk['title']}\"\n{chunk['text']}"
            else:
                # Füge Dateinamen als Kontext hinzu
                kontext = f"Dokument {i+1} (aus {chunk['file']}): {chunk['text']}"
                
            # Überprüfe die Länge und füge hinzu
            if len(kontext) + total_context_length <= max_context_length:
                kontext_mit_quellen.append(kontext)
                total_context_length += len(kontext)
            else:
                # Kürze den Text, wenn nötig
                remaining = max_context_length - total_context_length
                if remaining > 100:  # Nur hinzufügen, wenn ein sinnvolles Fragment übrig bleibt
                    kontext = kontext[:remaining] + "..."
                    kontext_mit_quellen.append(kontext)
                    total_context_length += len(kontext)
                break
        
        kontext = '\n\n'.join(kontext_mit_quellen)
        
        # Wähle ein kompaktes Prompt-Format basierend auf dem Modell
        if Config.MODEL_NAME == 'phi':
            # Phi-2 kompaktes Prompt
            prompt = f"""<s>Du bist ein Support-Assistent für die nscale DMS-Software.
Benutzerfreundlich, präzise und klar.

Frage: {question}

Relevante Informationen:
{kontext}

Wenn die Informationen nicht ausreichen, informiere darüber und schlage Alternativen vor.</s>
"""
        elif 'mistral' in Config.MODEL_NAME:
            # Mistral kompaktes Prompt
            prompt = f"""<s>[INST] Als nscale DMS-Support-Assistent: 
Frage: {question}

Relevante Informationen:
{kontext}

Falls unzureichend, gib das an und mache sinnvolle Vorschläge. [/INST]</s>
"""
        else:
            # Generisches kompaktes Prompt
            prompt = f"""Als spezialisierter Support-Assistent für nscale DMS:
Frage: {question}

Relevante Informationen:
{kontext}

Beantworte die Frage präzise. Falls die Informationen nicht ausreichen, informiere darüber.
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