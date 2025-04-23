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
    
    async def stream_answer(self, question: str, session_id: Optional[int] = None) -> EventSourceResponse:
        """Streamt Antwort stückweise zurück – im Server-Sent-Events-Format"""
        if not question:  # Sicherstellen, dass die Frage nicht leer ist
            logger.error("Die Frage wurde nicht übergeben.")
            async def error_generator():
                yield f"data: {json.dumps({'error': 'Keine Frage übergeben.'})}\n\n"
                yield "event: done\ndata: \n\n"
            return EventSourceResponse(error_generator())  

        if not self.initialized:
            logger.info("Lazy-Loading der RAG-Engine für Streaming...")
            success = await self.initialize()
            if not success:
                async def error_generator():
                    yield f"data: {json.dumps({'error': 'System konnte nicht initialisiert werden'})}\n\n"
                    yield "event: done\ndata: \n\n"
                return EventSourceResponse(error_generator())

        if len(question) > 2048:
            logger.warning(f"Frage zu lang ({len(question)} Zeichen), wird gekürzt")
            question = question[:2048]

        async def event_generator():
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

                # Gesamtantwort Buffer
                complete_answer = ""
                
                # Token-Zähler für Debug-Informationen
                token_count = 0
                
                async for chunk in self.ollama_client.stream_generate(prompt):
                    # Jedes Token in ein korrektes SSE-Event formatieren
                    token_count += 1
                    if token_count <= 5 or token_count % 20 == 0:
                        logger.debug(f"Stream-Token #{token_count}: '{chunk}'")
                    
                    # Auch leere Tokens werden weitergegeben
                    complete_answer += chunk
                    
                    # WICHTIG: Korrekte SSE-Formatierung mit \n\n am Ende
                    yield f"data: {json.dumps({'response': chunk})}\n\n"
                    
                    # Kleine Pause für bessere Browserdarstellung
                    await asyncio.sleep(0.01)
                
                logger.info(f"Stream beendet nach {token_count} Tokens")
                
                # Komplette Antwort in der Chathistorie speichern
                if session_id and complete_answer.strip():
                    logger.info(f"Speichere vollständige Antwort ({len(complete_answer)} Zeichen) in Session {session_id}")
                    from ..session.chat_history import ChatHistoryManager
                    chat_history = ChatHistoryManager()
                    chat_history.add_message(session_id, complete_answer, is_user=False)
                
                # KRITISCH: Korrektes done-Event mit doppelten Zeilenumbrüchen
                # Format muss exakt sein: "event: done\ndata: \n\n"
                yield "event: done\ndata: \n\n"
                
            except Exception as e:
                logger.error(f"Fehler beim Streaming: {e}", exc_info=True)
                yield f"data: {json.dumps({'error': f'Fehler: {str(e)}'})}\n\n"
                yield "event: done\ndata: \n\n"

        # WICHTIG: ping muss niedrig genug sein, um Verbindungsabbrüche zu vermeiden
        return EventSourceResponse(
            event_generator(),
            ping=10.0,  # Ping alle 10 Sekunden senden
            media_type="text/event-stream"  # Expliziter MIME-Typ
        )

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

        return EventSourceResponse(
            event_generator(question),
            ping=15.0,  # Sendet alle 15 Sekunden Ping-Events
        )

    # Hilfsmethode für Fehlerbehandlung (optional)
    def _format_error_event(self, error_message: str) -> AsyncGenerator[str, None]:
        """Formatiert eine Fehlermeldung als SSE-Event"""
        async def error_generator():
            yield f"data: {json.dumps({'error': error_message})}\n\n"
            yield "event: done\ndata: \n\n"
        return error_generator()



    def _format_prompt(self, question: str, chunks: List[Dict[str, Any]]) -> str:
        """Formatiert einen optimierten deutschen Prompt für LLama 3"""
        # Sortiere Chunks nach Relevanz
        sorted_chunks = sorted(chunks, key=lambda x: x.get('score', 0), reverse=True)
        
        # Extrahiere die relevantesten Inhalte in kompakter Form
        kontext_mit_quellen = []
        max_context_length = min(Config.MAX_PROMPT_LENGTH - 800, 7000)  # Platz für Anweisungen reservieren
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
            
            # Je nach Chunk-Typ formatieren
            if chunk.get('type') == 'section':
                text = f"Dokument {i+1} (Abschnitt '{chunk['title']}' aus {chunk['file']}): {chunk_text}"
            else:
                text = f"Dokument {i+1} (aus {chunk['file']}): {chunk_text}"
            
            # Füge nur hinzu, wenn noch Platz ist
            if total_length + len(text) <= max_context_length:
                kontext_mit_quellen.append(text)
                total_length += len(text)
        
        kontext = '\n\n'.join(kontext_mit_quellen)
        
        # Llama 3-spezifisches, verbessertes Prompt-Format
        prompt = f"""<|begin_of_text|>
    <|system|>
    Du bist ein deutschsprachiger, fachlich präziser Assistent für die nscale DMS-Software der SenMVKU Berlin.

    Aufgaben und Anforderungen:
    1. Beantworte Fragen ausführlich, verständlich und strukturiert - AUSSCHLIESSLICH auf Deutsch.
    2. Nutze NUR Informationen aus dem bereitgestellten Dokumentenkontext.
    3. Wenn du etwas nicht weißt oder es nicht im Kontext steht, sage ehrlich "Dazu finde ich keine Information im Kontext".
    4. Organisiere komplexe Antworten mit Überschriften und Aufzählungspunkten für bessere Lesbarkeit.
    5. Kopiere KEINE vollständigen Abschnitte aus dem Kontext - formuliere die Informationen in eigenen Worten.
    6. Füge Quellenverweise in deiner Antwort ein, z.B. "(aus Dokument 2)".

    Zielgruppe: Mitarbeiter der Berliner Verwaltung, die nscale DMS für Dokumentenmanagement nutzen.
    <|user|>
    Frage: {question}

    Relevante Dokumenteninformationen:
    {kontext}
    <|assistant|>
    """

        return prompt
        # Mistral-spezifischer Prompt mit Instructformat
#         prompt = f"""<s>[INST] 
# Du bist ein deutschsprachiger, fachlich präziser Assistent für die nscale DMS-Software.

# Deine Aufgabe ist es, Nutzerfragen **ausführlich**, **verständlich** und **strukturiert** zu beantworten – ausschließlich auf **Deutsch**.

# Antworte **nur**, wenn du relevante Informationen im bereitgestellten Dokumentenkontext findest. Erfinde niemals Informationen und spekuliere nicht.

# ---

# **Frage:**
# {question}

# **Relevante Dokumenteninformationen:**
# {kontext}

# ---

# **Erwarte folgende Antwortstruktur:**
# 1. **Kurze Zusammenfassung** der Frage (optional)
# 2. **Detaillierte Antwort** mit ggf. nummerierten Handlungsschritten oder Stichpunkten
# 3. **Keine** allgemeinen Floskeln oder Wiederholungen
# 4. Bei Unklarheiten: höflich mitteilen, dass keine zuverlässige Antwort gegeben werden kann

# Beantworte nun die Frage basierend auf dem Kontext. [/INST]</s>"""
    
#         return prompt
    
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