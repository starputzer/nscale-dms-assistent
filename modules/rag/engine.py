import asyncio
import json  # Wichtig für JSON-Serialisierung beim Streaming
from sse_starlette.sse import EventSourceResponse
from typing import Dict, Any, List, Optional, Tuple, AsyncGenerator
from ..core.config import Config
from ..core.logging import LogManager
from ..retrieval.document_store import DocumentStore
from ..retrieval.embedding import EmbeddingManager
from ..llm.model import OllamaClient
import torch

logger = LogManager.setup_logging(__name__)

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
        self.ollama_client = OllamaClient()
        self.initialized = False
        self._init_lock = asyncio.Lock()  # Lock für Thread-Sicherheit bei Initialisierung
    # Hilfsfunktion für die stream_answer Methode hinzufügen
    def format_sse_event(data):
        json_data = json.dumps(data)
        return f"data: {json_data}\n\n"
    
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
        # Lazy Initialization nur wenn nötig
        if not self.initialized:
            logger.info("Lazy-Loading der RAG-Engine...")
            success = await self.initialize()
            if not success:
                return {
                    'success': False,
                    'message': "System konnte nicht initialisiert werden"
                }
        
        try:
            # Überprüfe Eingabegröße
            if len(question) > 2048:
                logger.warning(f"Frage zu lang ({len(question)} Zeichen), wird gekürzt")
                question = question[:2048]
            
            # Suche relevante Chunks
            relevant_chunks = self.embedding_manager.search(question, top_k=Config.TOP_K)
            
            if not relevant_chunks:
                logger.warning(f"Keine relevanten Chunks für Frage gefunden: {question[:50]}...")
                return {
                    'success': False,
                    'message': "Keine relevanten Informationen gefunden"
                }
            
            # Erstelle Prompt mit komprimiertem Kontext
            prompt = self._format_prompt(question, relevant_chunks)
            
            # Versuche mit Timeout-Handler zu antworten
            try:
                # Statt direkt zu generieren, verwenden wir asyncio.wait_for
                result = await asyncio.wait_for(
                    self.ollama_client.generate(prompt, user_id),
                    timeout=Config.LLM_TIMEOUT
                )
            except asyncio.TimeoutError:
                # Bei Timeout einfache Antwort ohne LLM
                logger.warning(f"LLM-Timeout für Frage: {question[:50]}...")
                simple_answer = self._generate_fallback_answer(question, relevant_chunks)
                
                return {
                    'success': True,
                    'answer': simple_answer,
                    'sources': list(set(chunk['file'] for chunk in relevant_chunks)),
                    'chunks': relevant_chunks,
                    'cached': False,
                    'fallback': True
                }
            
            if 'error' in result:
                logger.error(f"Fehler bei LLM-Anfrage: {result['error']}")
                fallback_answer = self._generate_fallback_answer(question, relevant_chunks)
                return {
                    'success': True,  # Wir geben trotzdem ein "success", aber mit Fallback
                    'answer': fallback_answer,
                    'sources': list(set(chunk['file'] for chunk in relevant_chunks)),
                    'fallback': True
                }
            
            # Überprüfe, ob Antwort auf Deutsch ist
            answer = result['response']
            is_german, fixed_answer = self._ensure_german_answer(answer, relevant_chunks)
            
            if not is_german:
                logger.warning("Nicht-deutsche Antwort erkannt, verwende Fallback")
                answer = fixed_answer
            
            return {
                'success': True,
                'answer': answer,
                'sources': list(set(chunk['file'] for chunk in relevant_chunks)),  # Entferne Duplikate
                'chunks': relevant_chunks,
                'cached': result.get('cached', False),
                'fallback': not is_german
            }
        
        except Exception as e:
            logger.error(f"Fehler beim Beantworten der Frage: {e}", exc_info=True)
            return {
                'success': False,
                'message': f"Ein unerwarteter Fehler ist aufgetreten. Bitte versuchen Sie es später erneut."
            }

    # Vollständig korrigierte stream_answer Methode für modules/rag/engine.py
    async def stream_answer(self, question: str, session_id: Optional[int] = None) -> EventSourceResponse:
        """Streamt Antwort stückweise zurück – im Server-Sent-Events-Format"""
        if not question:  # Sicherstellen, dass die Frage nicht leer ist
            logger.error("Die Frage wurde nicht übergeben.")
            return EventSourceResponse(self._format_error_event("Keine Frage übergeben."))      

        if not self.initialized:
            logger.info("Lazy-Loading der RAG-Engine für Streaming...")
            success = await self.initialize()
            if not success:
                async def error_stream():
                    yield f"data: {json.dumps({'error': 'System konnte nicht initialisiert werden'})}\n\n"
                    yield "event: done\ndata: \n\n"
                return EventSourceResponse(error_stream())

        if len(question) > 2048:
            logger.warning(f"Frage zu lang ({len(question)} Zeichen), wird gekürzt")
            question = question[:2048]

        async def event_generator(question: str) -> AsyncGenerator[str, None]:
            try:
                # Chunks suchen
                relevant_chunks = self.embedding_manager.search(question, top_k=Config.TOP_K)
                if not relevant_chunks:
                    logger.warning(f"Keine relevanten Chunks für Streaming-Frage gefunden: {question[:50]}...")
                    yield f"data: {json.dumps({'error': 'Keine relevanten Informationen gefunden'})}\n\n"
                    yield "event: done\ndata: \n\n"
                    return

                # Prompt bauen
                prompt = self._format_prompt(question, relevant_chunks)
                logger.info(f"Starte Streaming für Frage: {question[:50]}...")

                # Geändert: Verwende eine Variable zur Nachverfolgung, ob wir bereits Daten gesendet haben
                found_data = False
                
                # Verwende einen Buffer für die Gesamtantwort
                complete_answer = ""
                
                async for chunk in self.ollama_client.stream_generate(prompt):
                    # Auch leere Tokens werden berücksichtigt
                    found_data = True
                    # Füge zum Buffer hinzu 
                    complete_answer += chunk
                    # SSE-Event formatieren
                    logger.debug(f"Sende Token: '{chunk}'")
                    yield f"data: {json.dumps({'response': chunk})}\n\n"
                    # Kurze Pause einfügen, um dem Browser Zeit zum Rendern zu geben
                    await asyncio.sleep(0.01)

                # Wenn keine Antwort empfangen wurde
                if not found_data:
                    logger.warning("Keine Antwort vom Modell empfangen")
                    yield f"data: {json.dumps({'error': 'Das Modell hat keine Ausgabe erzeugt.'})}\n\n"
                else:
                    # Speichern der kompletten Antwort in der Chathistorie
                    if session_id and complete_answer.strip():
                        logger.info(f"Speichere vollständige Antwort ({len(complete_answer)} Zeichen) in Session {session_id}")
                        from ..session.chat_history import ChatHistoryManager
                        chat_history = ChatHistoryManager()
                        chat_history.add_message(session_id, complete_answer, is_user=False)

                # Event zum Abschluss des Streams
                yield "event: done\ndata: \n\n"
                
            except Exception as e:
                logger.error(f"Fehler beim Streaming der Antwort: {e}", exc_info=True)
                error_msg = json.dumps({"error": f"Fehler beim Streaming: {str(e)}"})
                yield f"data: {error_msg}\n\n"
                yield "event: done\ndata: \n\n"

        return EventSourceResponse(event_generator(question))

    # Hilfsmethode für Fehlerbehandlung (optional)
    def _format_error_event(self, error_message: str) -> AsyncGenerator[str, None]:
        """Formatiert eine Fehlermeldung als SSE-Event"""
        async def error_generator():
            yield f"data: {json.dumps({'error': error_message})}\n\n"
            yield "event: done\ndata: \n\n"
        return error_generator()



    def _format_prompt(self, question: str, chunks: List[Dict[str, Any]]) -> str:
        """Formatiert einen optimierten deutschen Prompt für Mistral"""
        # Extrem kompakte Kontextaufbereitung
        kontext_mit_quellen = []
        max_context_length = min(Config.MAX_PROMPT_LENGTH - 500, 7000)  # Größerer Kontext für Mistral
        total_length = 0
        
        for i, chunk in enumerate(chunks[:Config.TOP_K]):
            if total_length >= max_context_length:
                break
                
            # Kompakte Darstellung je nach Chunk-Typ
            chunk_text = chunk['text'][:1000]  # Größere Chunk-Teile für Mistral
            
            if chunk.get('type') == 'section':
                text = f"Dokument {i+1} (Abschnitt '{chunk['title']}' aus {chunk['file']}): {chunk_text}"
            else:
                text = f"Dokument {i+1} (aus {chunk['file']}): {chunk_text}"
            
            # Füge nur hinzu, wenn noch Platz ist
            if total_length + len(text) <= max_context_length:
                kontext_mit_quellen.append(text)
                total_length += len(text)
        
        kontext = '\n\n'.join(kontext_mit_quellen)
        
        # Mistral-spezifischer Prompt mit Instructformat
        prompt = f"""<s>[INST] 
Du bist ein deutschsprachiger, fachlich präziser Assistent für die nscale DMS-Software.

Deine Aufgabe ist es, Nutzerfragen **ausführlich**, **verständlich** und **strukturiert** zu beantworten – ausschließlich auf **Deutsch**.

Antworte **nur**, wenn du relevante Informationen im bereitgestellten Dokumentenkontext findest. Erfinde niemals Informationen und spekuliere nicht.

---

**Frage:**
{question}

**Relevante Dokumenteninformationen:**
{kontext}

---

**Erwarte folgende Antwortstruktur:**
1. **Kurze Zusammenfassung** der Frage (optional)
2. **Detaillierte Antwort** mit ggf. nummerierten Handlungsschritten oder Stichpunkten
3. **Keine** allgemeinen Floskeln oder Wiederholungen
4. Bei Unklarheiten: höflich mitteilen, dass keine zuverlässige Antwort gegeben werden kann

Beantworte nun die Frage basierend auf dem Kontext. [/INST]</s>"""
    
        return prompt
    
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