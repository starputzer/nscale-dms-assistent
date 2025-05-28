# Streaming-Endpoint mit verbesserter Fehlerbehandlung und Parameter-Validierung

from fastapi import Query, HTTPException, Request, Depends
from fastapi.responses import StreamingResponse
from typing import Optional, Dict, Any
import json
import asyncio
import logging
from urllib.parse import unquote

logger = logging.getLogger(__name__)

def create_improved_streaming_endpoint(app, user_manager, rag_engine, chat_history):
    """Erstellt einen verbesserten Streaming-Endpoint mit besserer Fehlerbehandlung"""
    
    @app.get("/api/question/stream")
    async def stream_question(
        question: str = Query(..., description="Die Frage des Benutzers"),
        session_id: str = Query(..., description="Die Session-ID"), 
        simple_language: Optional[bool] = Query(False, description="Einfache Sprache verwenden"),
        request: Request = None
    ):
        """
        Verbesserter Streaming-Endpoint ohne Token in URL
        Authentifizierung erfolgt über Authorization-Header
        """
        try:
            # Dekodiere die Frage
            decoded_question = unquote(question)
            logger.info(f"Stream-Anfrage: Frage='{decoded_question[:50]}...', Session={session_id}")
            
            # Validierung
            if not decoded_question or not decoded_question.strip():
                raise HTTPException(
                    status_code=422, 
                    detail="Die Frage darf nicht leer sein"
                )
            
            if not session_id or not session_id.strip():
                raise HTTPException(
                    status_code=422, 
                    detail="Session-ID ist erforderlich"
                )
            
            # Token aus Header extrahieren
            auth_header = request.headers.get("Authorization")
            if not auth_header or not auth_header.startswith("Bearer "):
                logger.warning("Fehlende oder ungültige Authorization im Header")
                raise HTTPException(status_code=401, detail="Nicht authentifiziert")
            
            token = auth_header.split("Bearer ")[1]
            user_data = user_manager.verify_token(token)
            
            if not user_data:
                logger.warning("Ungültiges oder abgelaufenes Token")
                raise HTTPException(status_code=401, detail="Ungültiges Token")
            
            user_id = user_data['user_id']
            logger.info(f"Benutzer authentifiziert: {user_data.get('email')}")
            
            # Session-Validierung
            user_sessions = chat_history.get_user_sessions(user_id)
            session_ids = [str(s['id']) for s in user_sessions]
            
            if session_id not in session_ids:
                logger.info(f"Erstelle neue Session für Benutzer {user_id}")
                new_session_id = chat_history.create_session(user_id, "Neue Unterhaltung")
                if not new_session_id:
                    raise HTTPException(status_code=500, detail="Fehler beim Erstellen einer Session")
                session_id = str(new_session_id)
            
            # Speichere die Frage
            message_id = chat_history.add_message(int(session_id), decoded_question, is_user=True)
            logger.info(f"Frage gespeichert mit ID: {message_id}")
            
            # Stream-Generator
            async def generate_stream():
                try:
                    stream_id = f"stream_{session_id}_{hash(decoded_question)}"
                    
                    # Starte den Stream vom RAG-Engine
                    async for chunk in rag_engine.stream_answer_chunks(
                        decoded_question, 
                        int(session_id), 
                        use_simple_language=simple_language,
                        stream_id=stream_id
                    ):
                        # Formatiere als SSE
                        if isinstance(chunk, dict):
                            data = json.dumps(chunk)
                        else:
                            data = json.dumps({"content": chunk})
                        
                        yield f"data: {data}\n\n"
                    
                    # Stream-Ende signalisieren
                    yield "event: done\ndata: [DONE]\n\n"
                    
                except Exception as e:
                    logger.error(f"Fehler im Stream-Generator: {e}", exc_info=True)
                    error_data = json.dumps({"error": str(e)})
                    yield f"data: {error_data}\n\n"
                    yield "event: error\ndata: \n\n"
            
            # Rückgabe als StreamingResponse
            return StreamingResponse(
                generate_stream(),
                media_type="text/event-stream",
                headers={
                    "Cache-Control": "no-cache",
                    "Connection": "keep-alive",
                    "X-Accel-Buffering": "no",  # Verhindert Nginx-Buffering
                }
            )
            
        except HTTPException:
            # Re-raise HTTP exceptions
            raise
        except Exception as e:
            logger.error(f"Unerwarteter Fehler in stream_question: {e}", exc_info=True)
            raise HTTPException(status_code=500, detail=f"Interner Serverfehler: {str(e)}")
    
    # Optional: POST-Endpoint als Alternative
    @app.post("/api/question/stream")
    async def stream_question_post(
        request: Dict[str, Any],
        request_obj: Request = None
    ):
        """POST-Alternative für Streaming mit Body-Parametern"""
        question = request.get("question", "")
        session_id = str(request.get("session_id", ""))
        simple_language = request.get("simple_language", False)
        
        # Verwende die gleiche Logik wie GET
        return await stream_question(
            question=question,
            session_id=session_id,
            simple_language=simple_language,
            request=request_obj
        )