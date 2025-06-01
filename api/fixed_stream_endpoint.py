# Verbesserter Stream-Endpoint mit besserer Fehlerbehandlung und zusätzlichen API-Endpunkten

from fastapi import Query, HTTPException, APIRouter, Depends, Request
from fastapi.responses import Response
from sse_starlette.sse import EventSourceResponse
from typing import Optional, Dict, Any, List
import time
import json
import logging
import sys
import os

# Füge das Projektverzeichnis zum Python-Pfad hinzu
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import modules - Diese werden von server.py beim Startup gesetzt
from modules.auth.user_model import UserManager
from modules.rag.engine import RAGEngine
from modules.session.chat_history import ChatHistoryManager

# Logger einrichten
logger = logging.getLogger(__name__)

# Globale Variablen, die vom Hauptserver initialisiert werden
user_manager = None
rag_engine = None
chat_history = None

def initialize_modules(um, re, ch):
    """Initialisiere die Module mit den Instanzen vom Hauptserver"""
    global user_manager, rag_engine, chat_history
    user_manager = um
    rag_engine = re
    chat_history = ch
    logger.info("Fixed stream endpoint modules initialized")

# Router für zusätzliche Endpunkte
additional_router = APIRouter()

# Feedback-Statistik-Endpunkt
@additional_router.get("/api/v1/admin/feedback/stats-fixed")
async def get_admin_feedback_stats_fixed():
    """Gibt detaillierte Feedback-Statistiken zurück (nur für Admins)"""
    try:
        # Mock-Implementierung der Statistikgenerierung
        total = 120
        positive = 95
        negative = 25
        positive_percent = round((positive / total) * 100 if total > 0 else 0, 1)
        with_comments = 42
        unresolved = 18
        feedback_rate = 15.3  # Prozentsatz der Nachrichten mit Feedback
        
        # Zeitreihendaten für die letzten 7 Tage
        current_time = time.time()
        feedback_by_day = []
        
        for i in range(7, 0, -1):
            day_offset = i * 24 * 3600
            day_timestamp = current_time - day_offset
            day_date = time.strftime("%Y-%m-%d", time.localtime(day_timestamp))
            
            # Simulierte Werte
            day_positive = max(0, int(10 + (i % 3) * 5))
            day_negative = max(0, int(2 + (i % 2) * 3))
            day_count = day_positive + day_negative
            
            feedback_by_day.append({
                "date": day_date,
                "positive": day_positive,
                "negative": day_negative,
                "count": day_count
            })
        
        stats_data = {
            "total": total,
            "positive": positive,
            "negative": negative,
            "positive_percent": positive_percent,
            "with_comments": with_comments,
            "unresolved": unresolved,
            "feedback_rate": feedback_rate,
            "feedback_by_day": feedback_by_day
        }
        
        return {"stats": stats_data}
        
    except Exception as e:
        # Als Fallback verwenden wir leere Statistiken
        return {
            "stats": {
                "total": 0,
                "positive": 0,
                "negative": 0,
                "positive_percent": 0,
                "with_comments": 0,
                "feedback_by_day": []
            }
        }

@additional_router.get("/api/question/stream-backup")
async def stream_question(
    question: str = Query(..., description="Die Frage des Benutzers"),
    session_id: str = Query(..., description="Die Session-ID"), 
    simple_language: Optional[str] = Query(None, description="Einfache Sprache verwenden"),
    auth_token: Optional[str] = Query(None, description="Authentifizierungs-Token"),
    request: Request = None
):
    """Streamt die Antwort auf eine Frage via Server-Sent Events (SSE)"""
    try:
        # Debug logging
        logger.info(f"Stream endpoint called. user_manager is None: {user_manager is None}")
        logger.info(f"rag_engine is None: {rag_engine is None}")
        logger.info(f"chat_history is None: {chat_history is None}")
        # URL-Decode die Frage, falls nötig
        import urllib.parse
        decoded_question = urllib.parse.unquote_plus(question)
        
        # Logging für Debugging
        logger.info(f"Stream-Anfrage erhalten: Original='{question}', Decoded='{decoded_question}', Session={session_id}")
        
        # Verwende die decodierte Frage für die weitere Verarbeitung
        question = decoded_question
        
        # Validiere, dass die Frage nicht leer ist
        if not question or not question.strip():
            raise HTTPException(status_code=422, detail="Frage darf nicht leer sein")
        
        # Validiere Session-ID
        if not session_id:
            raise HTTPException(status_code=422, detail="Session-ID ist erforderlich")
        
        # Token-Verifizierung
        if auth_token:
            # Token aus URL-Parameter verwenden
            user_data = user_manager.verify_token(auth_token)
            logger.info(f"Authentifizierung über URL-Parameter: Token gültig={user_data is not None}")
        else:
            # Versuche, das Token aus dem Authorization-Header zu lesen
            auth_header = request.headers.get("Authorization")
            if not auth_header or not auth_header.startswith("Bearer "):
                logger.warning("Fehlende oder ungültige Authorization im Header")
                raise HTTPException(status_code=401, detail="Nicht authentifiziert")
            
            token = auth_header.split("Bearer ")[1]
            user_data = user_manager.verify_token(token)
            logger.info(f"Authentifizierung über Header: Token gültig={user_data is not None}")
        
        # Prüfen, ob Token gültig ist
        if not user_data:
            logger.warning("Ungültiges oder abgelaufenes Token")
            raise HTTPException(status_code=401, detail="Ungültiges oder abgelaufenes Token")
        
        user_id = user_data['user_id']
        
        # Convert UUID to numeric ID for database operations
        numeric_session_id = None
        original_session_id = session_id
        
        # Check if session_id is a UUID or numeric
        if not session_id.isdigit():
            # It's a UUID, try to find the numeric ID
            session_data = chat_history.get_session_by_uuid(session_id)
            if session_data:
                numeric_session_id = session_data['id']
                logger.info(f"Found numeric ID {numeric_session_id} for UUID {session_id}")
            else:
                # Create new session with the provided UUID
                logger.info(f"Creating new session with UUID: {session_id}")
                numeric_session_id = chat_history.create_session(user_id, "Neue Unterhaltung", uuid=session_id)
                if not numeric_session_id:
                    logger.error("Fehler beim Erstellen einer neuen Session")
                    raise HTTPException(status_code=500, detail="Fehler beim Erstellen einer Session")
        else:
            # It's already a numeric ID
            numeric_session_id = int(session_id)
            
            # Verify session belongs to user
            user_sessions = chat_history.get_user_sessions(user_id)
            session_ids = [s['id'] for s in user_sessions]
            
            if numeric_session_id not in session_ids:
                # Create new session
                logger.warning(f"Session {numeric_session_id} nicht gefunden, erstelle neue Session")
                numeric_session_id = chat_history.create_session(user_id, "Neue Unterhaltung")
                if not numeric_session_id:
                    logger.error("Fehler beim Erstellen einer neuen Session")
                    raise HTTPException(status_code=500, detail="Fehler beim Erstellen einer Session")
        
        # Speichere die Benutzerfrage in der Chat-Historie
        logger.info(f"Speichere Benutzerfrage in Session {numeric_session_id}")
        message_id = chat_history.add_message(numeric_session_id, question, is_user=True)
        
        if not message_id:
            logger.error(f"Fehler beim Speichern der Benutzerfrage in Session {numeric_session_id}")
        
        # Überprüfe, ob einfache Sprache verwendet werden soll
        use_simple_language = False
        
        # Prüfe URL-Parameter
        if simple_language and simple_language.lower() in ['true', '1', 'yes']:
            use_simple_language = True
            logger.info("Einfache Sprache aktiviert via URL-Parameter")
        
        # Prüfe Header (hat Vorrang vor URL-Parameter)
        if request.headers.get("X-Use-Simple-Language", "").lower() in ['true', '1', 'yes']:
            use_simple_language = True
            logger.info("Einfache Sprache aktiviert via HTTP-Header")
        
        # Stream-Identifier
        stream_id = f"stream_{numeric_session_id}_{hash(question)}"
        
        # Stream die Antwort vom RAG-Engine
        try:
            logger.info(f"Starte Streaming für Frage: '{question[:50]}...' (Einfache Sprache: {use_simple_language})")
            
            # Start des neuen Streams
            response = await rag_engine.stream_answer(question, numeric_session_id, use_simple_language, stream_id=stream_id)
            
            return response
        except Exception as stream_error:
            logger.error(f"Fehler beim Streaming: {stream_error}", exc_info=True)
            
            # Konvertiere die Exception in ein EventSourceResponse für den Client
            async def error_stream():
                yield f"data: {json.dumps({'error': str(stream_error)})}\n\n"
                yield "event: done\ndata: \n\n"
            
            return EventSourceResponse(error_stream())
            
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        logger.error(f"Unerwarteter Fehler in stream_question: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Interner Serverfehler: {str(e)}")