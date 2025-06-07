"""
Ergänzende API-Endpunkte für den Server
Diese Datei wird vom Server importiert und enthält die fehlenden Endpunkte
"""

from typing import Dict, Any, Optional, List
from datetime import datetime
import time
import logging
from fastapi import FastAPI, Request, Query, Depends, HTTPException
from fastapi.responses import JSONResponse
from sse_starlette.sse import EventSourceResponse

# Logger konfigurieren
logger = logging.getLogger("api_endpoints_fix")

def register_endpoints(app, chat_history, rag_engine, get_current_user):
    """
    Registriert zusätzliche API-Endpunkte
    """
    from .batch_handler_fix import handle_batch_request
    from .server_streaming_fix import stream_question_fix
    
    # POST /api/batch
    @app.post("/api/batch")
    @app.post("/api/v1/batch")
    async def handle_batch(request: Request, user_data: Dict[str, Any] = Depends(get_current_user)):
        """
        Handler für Batch-API-Anfragen. Erlaubt die Ausführung mehrerer API-Requests in einem einzigen Call.
        """
        try:
            data = await request.json()
            
            if not isinstance(data, dict) or 'requests' not in data:
                raise HTTPException(status_code=400, detail="Invalid request format, missing 'requests' array")
            
            requests_list = data.get('requests', [])
            
            if not isinstance(requests_list, list):
                raise HTTPException(status_code=400, detail="Requests must be an array")
            
            # Leere Anfrage behandeln
            if len(requests_list) == 0:
                return {
                    'success': True,
                    'data': {
                        'responses': [],
                        'count': 0,
                        'timestamp': int(time.time() * 1000)
                    }
                }
            
            # Maximale Anzahl von Anfragen pro Batch begrenzen
            max_batch_size = 20
            if len(requests_list) > max_batch_size:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Batch size exceeds maximum of {max_batch_size} requests"
                )
            
            # Use the optimized batch handler
            return handle_batch_request(requests_list, user_data, chat_history)
        
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Batch request handler error: {str(e)}", exc_info=True)
            raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")
    
    # GET /api/question/stream
    @app.get("/api/question/stream")
    async def stream_question(
        question: str = Query(..., description="Die Frage des Benutzers"),
        session_id: str = Query(..., description="Die Session-ID"), 
        simple_language: Optional[bool] = Query(False, description="Einfache Sprache verwenden"),
        request: Request = None,
        user_data: Dict[str, Any] = Depends(get_current_user)
    ):
        """
        Verbesserter Streaming-Endpoint ohne Token in URL
        Authentifizierung erfolgt über Authorization-Header
        """
        return await stream_question_fix(
            question=question,
            session_id=session_id,
            simple_language=simple_language,
            request=request,
            user_data=user_data,
            chat_history=chat_history,
            rag_engine=rag_engine,
            logger=logger
        )
    
    # POST /api/sessions
    @app.post("/api/sessions")
    async def create_session(request: Request, user_data: Dict[str, Any] = Depends(get_current_user)):
        """Erstellt eine neue Chat-Session"""
        user_id = user_data['user_id']
        
        try:
            # Request-Daten lesen
            data = await request.json()
            title = data.get("title", "Neue Unterhaltung")
            session_id = data.get("id")  # Client sendet möglicherweise eine ID
            
            # Wenn keine ID angegeben ist, erstelle eine neue Session
            if not session_id:
                session_id = chat_history.create_session(user_id, title)
                logger.info(f"Neue Session erstellt mit ID: {session_id}")
            else:
                # Wenn die ID angegeben ist, prüfe ob sie ein gültiges Format hat
                try:
                    if isinstance(session_id, str) and session_id.isdigit():
                        session_id = int(session_id)
                except (ValueError, TypeError):
                    # Bei Fehler die ID unverändert lassen (könnte eine UUID sein)
                    pass
                
                # Versuche die Session mit der angegebenen ID zu erstellen
                try:
                    if hasattr(chat_history, 'create_session_with_id'):
                        success = chat_history.create_session_with_id(session_id, user_id, title)
                        if not success:
                            # Fallback zu neuer Session
                            session_id = chat_history.create_session(user_id, title)
                    else:
                        # Methode nicht unterstützt, erstelle neue Session
                        session_id = chat_history.create_session(user_id, title)
                except Exception as e:
                    logger.warning(f"Fehler beim Erstellen einer Session mit ID {session_id}: {e}")
                    session_id = chat_history.create_session(user_id, title)
            
            if not session_id:
                raise HTTPException(status_code=500, detail="Fehler beim Erstellen einer Session")
            
            # Hole die Session-Details
            user_sessions = chat_history.get_user_sessions(user_id)
            session_details = next((s for s in user_sessions if str(s['id']) == str(session_id)), None)
            
            if not session_details:
                # Fallback: Minimales Objekt zurückgeben
                session_details = {
                    "id": session_id,
                    "title": title,
                    "userId": user_id,
                    "createdAt": datetime.now().isoformat(),
                    "updatedAt": datetime.now().isoformat(),
                }
            
            return session_details
        except Exception as e:
            logger.error(f"Fehler beim Erstellen einer Session: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Interner Serverfehler: {str(e)}")
    
    # GET /api/sessions/{session_id}/messages
    @app.get("/api/sessions/{session_id}/messages")
    async def get_messages(session_id: str, user_data: Dict[str, Any] = Depends(get_current_user)):
        """Gibt alle Nachrichten einer Session zurück"""
        user_id = user_data['user_id']
        
        # Prüfen, ob die Session existiert und dem Benutzer gehört
        user_sessions = chat_history.get_user_sessions(user_id)
        session_ids = [str(s['id']) for s in user_sessions]
        
        if session_id not in session_ids:
            logger.warning(f"Session {session_id} nicht gefunden für Benutzer {user_id} oder keine Berechtigung")
            
            # Prüfen mit alternativer String-Konvertierung
            if not any(str(s_id) == str(session_id) for s_id in session_ids):
                logger.error(f"Zugriff verweigert auf Session {session_id} für Benutzer {user_id}")
                logger.debug(f"Verfügbare Sessions: {session_ids}")
                raise HTTPException(status_code=404, detail="Session nicht gefunden")
        
        try:
            # Nachrichten abrufen
            session_id_int = int(session_id) if session_id.isdigit() else session_id
            messages = chat_history.get_session_history(session_id_int)
            
            if messages:
                logger.info(f"Nachrichten für Session {session_id} abgerufen: {len(messages)}")
            else:
                logger.info(f"Keine Nachrichten für Session {session_id} gefunden")
                messages = []  # Sicherstellen, dass ein leeres Array zurückgegeben wird
            
            return messages
        except ValueError:
            logger.error(f"Ungültiges Session-ID-Format: {session_id}")
            raise HTTPException(status_code=400, detail="Ungültiges Session-ID-Format")
        except Exception as e:
            logger.error(f"Fehler beim Abrufen von Nachrichten für Session {session_id}: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Fehler beim Abrufen von Nachrichten: {str(e)}")
