"""
Integrationsmodul für verbesserte Streaming-Funktionalität
Verbindet alle Komponenten und stellt konsistente Schnittstellen bereit
"""

import asyncio
import json
import logging
from typing import Dict, Any, Optional, List, AsyncGenerator
from fastapi import FastAPI, Request, Depends, HTTPException
from starlette.concurrency import run_in_threadpool
from starlette.responses import StreamingResponse
from fastapi.responses import JSONResponse

from modules.core.logging import LogManager
from modules.rag.engine import RAGEngine
from modules.session.chat_history import ChatHistoryManager
from modules.auth.user_model import UserManager

logger = LogManager.setup_logging(__name__)

# Globale Instanzen für konsistenten Zugriff
user_manager = None
rag_engine = None
chat_history = None

def initialize_dependencies(um, re, ch):
    """Initialisiert die Abhängigkeiten für das Streaming-Modul"""
    global user_manager, rag_engine, chat_history
    user_manager = um
    rag_engine = re
    chat_history = ch
    logger.info("Streaming-Integration: Abhängigkeiten initialisiert")

def register_streaming_endpoints(app: FastAPI):
    """Registriert alle Streaming-Endpunkte bei der FastAPI-Anwendung"""
    
    # Hilfsfunktion für die Benutzerauthentifizierung
    async def get_current_user(request: Request) -> Dict[str, Any]:
        """Extrahiert und verifiziert den aktuellen Benutzer aus dem JWT-Token"""
        auth_header = request.headers.get("Authorization")
        
        if not auth_header or not auth_header.startswith("Bearer "):
            logger.warning(f"Invalid authorization header format: {auth_header}")
            raise HTTPException(status_code=401, detail="Nicht authentifiziert")
        
        token = auth_header.split("Bearer ")[1]
        
        user_data = user_manager.verify_token(token)
        
        if not user_data:
            raise HTTPException(status_code=401, detail="Ungültiges oder abgelaufenes Token")
        
        return user_data
    
    @app.get("/api/v1/question/stream")
    async def stream_question_v1(
        question: str, 
        session_id: str, 
        simple_language: Optional[bool] = False,
        request: Request = None,
    ):
        """
        Verbesserte Streaming-API (v1) mit HTTP/1.1 Chunked Transfer Encoding
        Kompatibel mit allen modernen Browsern und Frameworks
        """
        try:
            # Benutzer authentifizieren
            user_data = await get_current_user(request)
            user_id = user_data['user_id']
            
            # Validierung
            if not question or not question.strip():
                return JSONResponse(
                    status_code=422, 
                    content={"error": "Die Frage darf nicht leer sein"}
                )
            
            if not session_id or not session_id.strip():
                return JSONResponse(
                    status_code=422, 
                    content={"error": "Session-ID ist erforderlich"}
                )
            
            # Session-Validierung
            user_sessions = chat_history.get_user_sessions(user_id)
            session_ids = [str(s['id']) for s in user_sessions]
            
            if session_id not in session_ids:
                logger.info(f"Erstelle neue Session für Benutzer {user_id}")
                new_session_id = chat_history.create_session(user_id, "Neue Unterhaltung")
                if not new_session_id:
                    return JSONResponse(
                        status_code=500, 
                        content={"error": "Fehler beim Erstellen einer Session"}
                    )
                session_id = str(new_session_id)
            
            # Speichere die Frage
            message_id = chat_history.add_message(int(session_id), question, is_user=True)
            logger.info(f"Frage gespeichert mit ID: {message_id}")
            
            # Stream-ID generieren
            stream_id = f"stream_{session_id}_{hash(question)}"
            
            # Stream starten - Die Daten sind bereits SSE-formatiert
            return StreamingResponse(
                rag_engine.stream_answer_chunks(
                    question, 
                    int(session_id), 
                    use_simple_language=simple_language,
                    stream_id=stream_id
                ),
                media_type="text/event-stream",
                headers={
                    "Cache-Control": "no-cache",
                    "Connection": "keep-alive",
                    "X-Accel-Buffering": "no",
                }
            )
            
        except HTTPException:
            # HTTP Exceptions durchreichen
            raise
        except Exception as e:
            logger.error(f"Unerwarteter Fehler in stream_question_v1: {e}", exc_info=True)
            return JSONResponse(
                status_code=500, 
                content={"error": f"Interner Serverfehler: {str(e)}"}
            )
    
    @app.post("/api/v1/question/stream")
    async def stream_question_post_v1(request: Request):
        """POST-Alternative für Streaming mit Body-Parametern"""
        try:
            # Body-Parameter lesen
            body = await request.json()
            question = body.get("question", "")
            session_id = str(body.get("session_id", ""))
            simple_language = body.get("simple_language", False)
            
            # Verwende die gleiche Logik wie GET
            return await stream_question_v1(
                question=question,
                session_id=session_id,
                simple_language=simple_language,
                request=request
            )
        except json.JSONDecodeError:
            return JSONResponse(
                status_code=400, 
                content={"error": "Ungültiges JSON-Format"}
            )
        except Exception as e:
            logger.error(f"Fehler in stream_question_post_v1: {e}", exc_info=True)
            return JSONResponse(
                status_code=500, 
                content={"error": f"Interner Serverfehler: {str(e)}"}
            )
    
    logger.info("Streaming-Integration: Endpunkte registriert")

def get_streaming_integration_info():
    """Gibt Statusinformationen zur Streaming-Integration zurück"""
    return {
        "streaming_status": "active",
        "endpoints": [
            {
                "path": "/api/v1/question/stream",
                "methods": ["GET", "POST"],
                "description": "Verbesserte Streaming-API mit HTTP/1.1 Chunked Transfer"
            }
        ],
        "dependencies": {
            "user_manager": user_manager is not None,
            "rag_engine": rag_engine is not None,
            "chat_history": chat_history is not None
        }
    }