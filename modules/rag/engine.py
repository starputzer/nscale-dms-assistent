import asyncio
from typing import Dict, Any, List, Optional

from ..core.config import Config
from ..core.logging import LogManager
from ..retrieval.document_store import DocumentStore
from ..retrieval.embedding import EmbeddingManager
from ..llm.model import OllamaClient

logger = LogManager.setup_logging()

class RAGEngine:
    """Hauptmodul für RAG-Funktionalität"""
    
    def __init__(self):
        self.document_store = DocumentStore()
        self.embedding_manager = EmbeddingManager()
        self.ollama_client = OllamaClient()
        self.initialized = False
    
    async def initialize(self):
        """Initialisiert alle Komponenten"""
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
            # Suche relevante Chunks
            relevant_chunks = self.embedding_manager.search(question)
            
            if not relevant_chunks:
                return {
                    'success': False,
                    'message': "Keine relevanten Informationen gefunden"
                }
            
            # Erstelle Prompt
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
                'sources': [chunk['file'] for chunk in relevant_chunks],
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
        """Formatiert einen Prompt basierend auf dem verwendeten Modell"""
        # Strukturierte Kontextinformationen
        kontext_mit_quellen = []
        
        for i, chunk in enumerate(chunks):
            # Formatiere je nach Chunk-Typ
            if chunk.get('type') == 'section':
                kontext_mit_quellen.append(f"Abschnitt {i+1}: \"{chunk['title']}\"\n{chunk['text']}")
            else:
                # Füge Dateinamen als Kontext hinzu
                kontext_mit_quellen.append(f"Dokument {i+1} (aus {chunk['file']}): {chunk['text']}")
        
        kontext = '\n\n'.join(kontext_mit_quellen)
        
        # Modelspezifische Prompts
        if Config.MODEL_NAME == 'phi':
            # Phi-2 Prompt
            prompt = f"""<s>Du bist ein spezialisierter Support-Assistent für die nscale DMS-Software. 
Deine Aufgabe ist es, Benutzern zu helfen, die mit der Software überfordert sind.
Beantworte die Frage präzise und benutzerfreundlich.

Versuche, klare schrittweise Anleitungen zu geben, wenn es sich um Prozesse handelt.
Verwende stets die korrekte Terminologie aus dem nscale DMS-System.
Vermeide technisches Jargon, es sei denn, es ist unbedingt notwendig.

Frage: {question}

Relevante Informationen aus dem nscale-Handbuch:
{kontext}

Falls die Informationen nicht ausreichen, informiere den Benutzer darüber und 
schlage alternative Lösungsansätze vor, basierend auf typischer DMS-Funktionalität.</s>
"""
        elif 'mistral' in Config.MODEL_NAME:
            # Mistral Prompt
            prompt = f"""<s>[INST] Du bist ein spezialisierter Support-Assistent für die nscale DMS-Software. 
Beantworte die folgende Frage basierend auf den bereitgestellten Informationen.

Frage: {question}

Relevante Informationen aus dem nscale-Handbuch:
{kontext}

Falls die Informationen nicht ausreichen, gib das an und mache sinnvolle Vorschläge basierend auf allgemeinen DMS-Funktionen. [/INST]</s>
"""
        else:
            # Generischer Prompt (für andere Modelle wie Llama)
            prompt = f"""Du bist ein spezialisierter Support-Assistent für die nscale DMS-Software. 
Deine Aufgabe ist es, Benutzern zu helfen, die mit der Software überfordert sind.
Beantworte die Frage präzise und benutzerfreundlich.

Frage: {question}

Relevante Informationen aus dem nscale-Handbuch:
{kontext}

Falls die Informationen nicht ausreichen, informiere den Benutzer darüber und 
schlage alternative Lösungsansätze vor, basierend auf typischer DMS-Funktionalität.
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
