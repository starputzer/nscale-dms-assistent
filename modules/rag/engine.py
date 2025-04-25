import asyncio
import json
from sse_starlette.sse import EventSourceResponse
from typing import Dict, Any, List, Optional, Tuple, AsyncGenerator
from ..core.config import Config
from ..core.logging import LogManager
from ..retrieval.document_store import DocumentStore
from ..retrieval.embedding import EmbeddingManager
from ..llm.model import OllamaClient
import torch

logger = LogManager.setup_logging()

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
        self._active_streams = {}  # Dictionary für aktive Streams
    
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
                    yield f"data: {json.dumps({'error': 'System konnte nicht initialisiert werden'})}\n\n"
                    yield "event: done\ndata: \n\n"
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
                    yield f"data: {json.dumps({'error': 'Keine relevanten Informationen gefunden'})}\n\n"
                    yield "event: done\ndata: \n\n"
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
                    
                    # Wichtig: Senden eines vollständigen SSE-Events
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

                # KRITISCH: Korrektes done-Event senden (separates Event)
                # Das Format muss exakt sein: "event: done\ndata: \n\n"
                logger.debug("Sende 'done' Event zum Abschluss des Streams")
                yield "event: done\ndata: \n\n"
                
            except Exception as e:
                logger.error(f"Fehler beim Streaming der Antwort: {e}", exc_info=True)
                error_msg = json.dumps({"error": f"Fehler beim Streaming: {str(e)}"})
                yield f"data: {error_msg}\n\n"
                yield "event: done\ndata: \n\n"

        # Ping-Interval setzen, um Verbindungsabbrüche zu vermeiden
        return EventSourceResponse(
            event_generator(question, use_simple_language),
            ping=15.0,  # Sendet alle 15 Sekunden Ping-Events
            media_type="text/event-stream"  # Expliziter MIME-Typ
        )

    def _format_error_event(self, error_message: str) -> AsyncGenerator[str, None]:
        """Formatiert eine Fehlermeldung als SSE-Event"""
        async def error_generator():
            yield f"data: {json.dumps({'error': error_message})}\n\n"
            yield "event: done\ndata: \n\n"
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
        
        if not chunks:
            return {
                'success': False,
                'message': 'Keine relevanten Informationen gefunden',
                'answer': '',
                'chunks': [],
                'sources': []
            }
        
        # Entferne Duplikate basierend auf der Datei
        seen_sources = set()
        unique_chunks = []
        for chunk in chunks:
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
        
        return {
            'success': True,
            'answer': answer,
            'chunks': unique_chunks,
            'sources': self._extract_sources(unique_chunks),
            'cached': result.get('cached', False)
        }

    def _format_prompt(self, question: str, chunks: List[Dict[str, Any]], use_simple_language: bool = False) -> str:
        """Formatiert einen optimierten deutschen Prompt für LLama 3 mit verbesserter Quellenangabe"""
        # Sortiere Chunks nach Relevanz
        sorted_chunks = sorted(chunks, key=lambda x: x.get('score', 0), reverse=True)
        
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
            if chunk.get('type') == 'section':
                source_details['type'] = 'section'
                source_details['title'] = chunk.get('title', 'Unbekannter Abschnitt')
                text = f"<{source_id}> Dokument {i+1} (Abschnitt '{chunk['title']}' aus {chunk['file']}): {chunk_text}"
            else:
                source_details['type'] = 'chunk'
                source_details['position'] = chunk.get('start', 0)
                text = f"<{source_id}> Dokument {i+1} (aus {chunk['file']}): {chunk_text}"
            
            # Füge nur hinzu, wenn noch Platz ist
            if total_length + len(text) <= max_context_length:
                kontext_mit_quellen.append(text)
                total_length += len(text)
        
        kontext = '\n\n'.join(kontext_mit_quellen)
        
        # Basisprompt mit verbesserter Anweisung zur Quellenangabe
        base_prompt = f"""<|begin_of_text|>
    <|system|>
    Du bist ein deutschsprachiger, fachlich präziser Assistent für die nscale DMS-Software der SenMVKU Berlin.

    Aufgaben und Anforderungen:
    1. Beantworte Fragen ausführlich, verständlich und strukturiert - AUSSCHLIESSLICH auf Deutsch.
    2. Nutze NUR Informationen aus dem bereitgestellten Dokumentenkontext.
    3. Wenn du etwas nicht weißt oder es nicht im Kontext steht, sage ehrlich "Dazu finde ich keine Information im Kontext".
    4. Organisiere komplexe Antworten mit Überschriften und Aufzählungspunkten für bessere Lesbarkeit.
    5. Kopiere KEINE vollständigen Abschnitte aus dem Kontext - formuliere die Informationen in eigenen Worten.

    WICHTIG ZUR QUELLENANGABE:
    6. Füge DIREKT nach jeder inhaltlichen Aussage einen Quellenverweis ein. Format: "(Quelle-X)"
    Beispiel: "Zum Archivieren eines Dokuments müssen Sie die Schaltfläche 'Archivieren' anklicken (Quelle-1)."
    7. Die Quellen sind im Format <Quelle-X> im Kontext markiert, nutze exakt diese Bezeichnungen.
    8. Verweise auf Quellen nach JEDEM inhaltlichen Punkt, nicht nur am Ende eines Absatzes.
    9. Füge am Ende eine kurze Quellenzusammenfassung als nummerierte Liste hinzu:
    "Quellen:
    1. nscale-handbuch.md, Abschnitt 'Archivieren'
    2. workflow-dokumente.txt"

    Zielgruppe: Mitarbeiter der Berliner Verwaltung, die nscale DMS für Dokumentenmanagement nutzen."""

        # Erweiterter Prompt für einfache Sprache
        simple_language_prompt = f"""<|begin_of_text|>
    <|system|>
    Du bist ein freundlicher und geduldiger Assistent, der Fragen zur nscale DMS-Software in klarer, leicht verständlicher Sprache beantwortet. Erkläre Informationen so, dass sie auch von Personen verstanden werden, die keine Vorkenntnisse in Technik oder Verwaltung haben.

    Verwende:
    - einfache Wörter
    - kurze Sätze (maximal 12 Wörter pro Satz)
    - keine Fremdwörter oder Fachbegriffe – oder erkläre sie sofort mit einem Beispiel
    - wenn nötig: Schritt-für-Schritt-Erklärungen
    - kein "Fachsprache", kein "Beamtendeutsch"

    Sprich direkt die Nutzerin oder den Nutzer an. Gib keine unnötigen Details. Verwende gerne Beispiele.

    Nutze NUR Informationen aus dem bereitgestellten Dokumentenkontext.
    Wenn du etwas nicht weißt, sage einfach "Dazu finde ich keine Information."

    WICHTIG ZUR QUELLENANGABE:
    - Füge DIREKT nach jeder inhaltlichen Aussage einen Quellenverweis ein. Format: "(Quelle-X)"
    Beispiel: "Um ein Dokument zu speichern, klicken Sie auf den Speichern-Knopf (Quelle-1)."
    - Die Quellen sind im Format <Quelle-X> im Kontext markiert, nutze exakt diese Bezeichnungen.
    - Verweise auf Quellen nach JEDEM wichtigen Schritt oder Erklärung.
    - Füge am Ende eine einfache Quellenliste hinzu:
    "Meine Quellen:
    1. nscale-Handbuch, Abschnitt 'Dokumente speichern'
    2. nscale-Kurzanleitung"

    Zielgruppe: Neue Mitarbeiter der Berliner Verwaltung, die mit der nscale DMS-Software noch nicht vertraut sind."""

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
            }