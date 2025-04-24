import sys
import os

# Füge das Projektverzeichnis zum Python-Pfad hinzu
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import asyncio
import time
import uuid
import json
from pathlib import Path
from typing import Dict, Any, Optional, List
from modules.core.motd_manager import MOTDManager
from fastapi import FastAPI, HTTPException, Depends, BackgroundTasks, Request
from fastapi.responses import JSONResponse, FileResponse
from sse_starlette.sse import EventSourceResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, EmailStr
from jose import JWTError, jwt
from starlette.concurrency import run_in_threadpool
from fastapi import HTTPException, Depends, Security
from pydantic import BaseModel, EmailStr
from typing import List
from modules.core.config import Config
from modules.core.logging import LogManager
from modules.auth.user_model import UserManager
from modules.rag.engine import RAGEngine
from modules.session.chat_history import ChatHistoryManager
from modules.feedback.feedback_manager import FeedbackManager

try:
    from dotenv import load_dotenv
    load_dotenv()
    print("Umgebungsvariablen aus .env geladen")
    import os
    print(f"ADMIN_EMAILS-Wert: {os.getenv('ADMIN_EMAILS')}")
except ImportError:
    print("python-dotenv nicht installiert")

motd_manager = MOTDManager()
logger = LogManager.setup_logging()
feedback_manager = FeedbackManager()
app = FastAPI(title="nscale DMS Assistent API")

# CORS-Konfiguration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In Produktion einschränken
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# App Mounten
app.mount("/static", StaticFiles(directory="frontend"), name="static")

@app.get("/")
async def root():
    return FileResponse("frontend/index.html")
        
# Initialisiere Module
user_manager = UserManager()
rag_engine = RAGEngine()
chat_history = ChatHistoryManager()

# Datenmodelle für API-Anfragen und Antworten
class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str

class ResetPasswordRequest(BaseModel):
    email: EmailStr

class SetPasswordRequest(BaseModel):
    token: str
    new_password: str

class QuestionRequest(BaseModel):
    question: str
    session_id: Optional[int] = None

class StartSessionRequest(BaseModel):
    title: Optional[str] = "Neue Unterhaltung"

class RenameSessionRequest(BaseModel):
    session_id: int
    title: str

# Neue Pydantic-Modelle für API-Anfragen
class UserRoleUpdateRequest(BaseModel):
    user_id: int
    new_role: str

class CreateUserRequest(BaseModel):
    email: EmailStr
    password: str
    role: str = "user"

class FeedbackRequest(BaseModel):
    message_id: int
    session_id: int
    is_positive: bool
    comment: Optional[str] = None

# Helper-Funktion zur Überprüfung von Admin-Rechten
async def get_admin_user(request: Request) -> Dict[str, Any]:
    """Überprüft, ob der aktuelle Benutzer Admin-Rechte hat"""
    user_data = await get_current_user(request)
    
    if user_data.get('role') != 'admin':
        logger.warning(f"Benutzer {user_data['email']} ohne Admin-Rechte versucht, auf Admin-Funktionen zuzugreifen")
        raise HTTPException(status_code=403, detail="Admin-Rechte erforderlich")
    
    return user_data

# Hilfsfunktionen
async def get_current_user(request: Request) -> Dict[str, Any]:
    """Extrahiert und verifiziert den aktuellen Benutzer aus dem JWT-Token"""
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Nicht authentifiziert")
    
    token = auth_header.split("Bearer ")[1]
    user_data = user_manager.verify_token(token)
    
    if not user_data:
        raise HTTPException(status_code=401, detail="Ungültiges oder abgelaufenes Token")
    
    return user_data


# API-Endpunkte für Authentifizierung
@app.post("/api/auth/login")
async def login(request: LoginRequest):
    """Authentifiziert einen Benutzer und gibt ein JWT-Token zurück"""
    token = user_manager.authenticate(request.email, request.password)
    
    if not token:
        raise HTTPException(status_code=401, detail="Ungültige Anmeldedaten")
    
    return {"token": token}

@app.post("/api/auth/register")
async def register(request: RegisterRequest):
    """Registriert einen neuen Benutzer"""
    success = user_manager.register_user(request.email, request.password)
    
    if not success:
        raise HTTPException(status_code=400, detail="Benutzer existiert bereits")
    
    return {"message": "Benutzer erfolgreich registriert"}

@app.post("/api/auth/reset-password")
async def reset_password(request: ResetPasswordRequest, background_tasks: BackgroundTasks):
    """Initiiert den Passwort-Reset-Prozess"""
    token = user_manager.initiate_password_reset(request.email)
    
    if not token:
        # Gebe trotzdem Erfolg zurück, um keine Information über existierende E-Mails preiszugeben
        return {"message": "Wenn die E-Mail existiert, wurde eine Passwort-Reset-E-Mail gesendet"}
    
    # In einer echten Anwendung würde hier eine E-Mail gesendet
    # Für dieses Beispiel geben wir den Token direkt zurück
    return {"message": "Passwort-Reset initiiert", "token": token}

@app.post("/api/auth/set-password")
async def set_password(request: SetPasswordRequest):
    """Setzt das Passwort mit einem gültigen Token zurück"""
    success = user_manager.reset_password(request.token, request.new_password)
    
    if not success:
        raise HTTPException(status_code=400, detail="Ungültiger oder abgelaufener Token")
    
    return {"message": "Passwort erfolgreich zurückgesetzt"}

# API-Endpunkte für Benutzerverwaltung (nur für Admins)
@app.get("/api/admin/users")
async def get_users(admin_data: Dict[str, Any] = Depends(get_admin_user)):
    """Gibt eine Liste aller Benutzer zurück (Admin-Funktion)"""
    users = user_manager.get_all_users(admin_data['user_id'])
    
    if users is None:
        raise HTTPException(status_code=500, detail="Fehler beim Laden der Benutzerliste")
    
    return {"users": users}

@app.post("/api/admin/users")
async def create_user(request: CreateUserRequest, admin_data: Dict[str, Any] = Depends(get_admin_user)):
    """Erstellt einen neuen Benutzer mit angegebener Rolle (Admin-Funktion)"""
    success = user_manager.register_user(request.email, request.password, request.role)
    
    if not success:
        raise HTTPException(status_code=400, detail="Benutzer existiert bereits oder ungültige Daten")
    
    return {"message": f"Benutzer {request.email} mit Rolle {request.role} erfolgreich erstellt"}

@app.put("/api/admin/users/role")
async def update_user_role(request: UserRoleUpdateRequest, admin_data: Dict[str, Any] = Depends(get_admin_user)):
    """Aktualisiert die Rolle eines Benutzers (Admin-Funktion)"""
    success = user_manager.update_user_role(request.user_id, request.new_role, admin_data['user_id'])
    
    if not success:
        raise HTTPException(status_code=400, detail="Benutzer nicht gefunden oder ungültige Rolle")
    
    return {"message": f"Rolle für Benutzer ID {request.user_id} auf {request.new_role} aktualisiert"}

@app.delete("/api/admin/users/{user_id}")
async def delete_user(user_id: int, admin_data: Dict[str, Any] = Depends(get_admin_user)):
    """Löscht einen Benutzer (Admin-Funktion)"""
    # Diese Funktion müsste noch in der UserManager-Klasse implementiert werden
    # Da wir sie im Moment nicht benötigen, geben wir eine entsprechende Meldung zurück
    raise HTTPException(status_code=501, detail="Diese Funktion ist noch nicht implementiert")

# Endpoint um die Rolle des aktuellen Benutzers abzurufen
@app.get("/api/user/role")
async def get_current_user_role(user_data: Dict[str, Any] = Depends(get_current_user)):
    """Gibt die Rolle des aktuellen Benutzers zurück"""
    return {"role": user_data.get('role', 'user')}
@app.post("/api/feedback")
async def add_feedback(request: FeedbackRequest, user_data: Dict[str, Any] = Depends(get_current_user)):
    """Fügt Feedback zu einer Nachricht hinzu"""
    user_id = user_data['user_id']
    
    success = feedback_manager.add_feedback(
        message_id=request.message_id,
        session_id=request.session_id,
        user_id=user_id,
        is_positive=request.is_positive,
        comment=request.comment
    )
    
    if not success:
        raise HTTPException(status_code=500, detail="Fehler beim Speichern des Feedbacks")
    
    return {"message": "Feedback erfolgreich gespeichert"}

@app.get("/api/feedback/message/{message_id}")
async def get_message_feedback(message_id: int, user_data: Dict[str, Any] = Depends(get_current_user)):
    """Gibt das Feedback für eine bestimmte Nachricht zurück"""
    feedback = feedback_manager.get_message_feedback(message_id)
    
    if feedback is None:
        return {"feedback": None}
    
    return {"feedback": feedback}

@app.get("/api/user/feedback")
async def get_user_feedback(user_data: Dict[str, Any] = Depends(get_current_user)):
    """Gibt alle Feedback-Einträge des aktuellen Benutzers zurück"""
    user_id = user_data['user_id']
    
    feedback_list = feedback_manager.get_user_feedback(user_id)
    
    return {"feedback": feedback_list}

# Endpunkte für Admins
@app.get("/api/admin/feedback/stats")
async def get_feedback_stats(admin_data: Dict[str, Any] = Depends(get_admin_user)):
    """Gibt Feedback-Statistiken zurück (Admin)"""
    stats = feedback_manager.get_feedback_stats()
    
    return {"stats": stats}

@app.get("/api/admin/feedback/negative")
async def get_negative_feedback(admin_data: Dict[str, Any] = Depends(get_admin_user)):
    """Gibt Nachrichten mit negativem Feedback zurück (Admin)"""
    negative_feedback = feedback_manager.get_negative_feedback_messages()
    
    return {"feedback": negative_feedback}

# MOTD API-Endpunkte
@app.get("/api/motd")
async def get_motd():
    """Gibt die aktuelle Message of the Day zurück"""
    return motd_manager.get_motd()

@app.post("/api/admin/reload-motd")
async def reload_motd(user_data: Dict[str, Any] = Depends(get_admin_user)):
    """Lädt die MOTD-Konfiguration neu (nur für Admins)"""
    success = motd_manager.reload_config()
    
    if not success:
        raise HTTPException(status_code=500, detail="Fehler beim Neuladen der MOTD-Konfiguration")
    
    return {"message": "MOTD-Konfiguration erfolgreich neu geladen"}

# Neuer Endpunkt für die Aktualisierung der MOTD-Konfiguration
@app.post("/api/admin/update-motd")
async def update_motd(request: Request, admin_data: Dict[str, Any] = Depends(get_admin_user)):
    """Aktualisiert die MOTD-Konfiguration (nur für Admins)"""
    try:
        data = await request.json()
        
        # Validiere die MOTD-Daten
        if 'content' not in data or not data['content']:
            raise HTTPException(status_code=400, detail="MOTD-Inhalt darf nicht leer sein")
        
        # Aktualisiere die Konfigurationsdatei
        motd_path = Config.APP_DIR / 'modules' / 'core' / 'motd_config.json'
        
        # Lese aktuelle Konfiguration
        current_config = motd_manager.get_motd()
        
        # Aktualisiere mit neuen Daten (nur erlaubte Felder)
        allowed_fields = ['content', 'enabled', 'format', 'style', 'display']
        for field in allowed_fields:
            if field in data:
                current_config[field] = data[field]
        
        # Schreibe zurück in die Datei
        with open(motd_path, 'w', encoding='utf-8') as f:
            json.dump(current_config, f, indent=2, ensure_ascii=False)
        
        # Lade die Konfiguration neu
        success = motd_manager.reload_config()
        
        if not success:
            raise HTTPException(status_code=500, detail="Fehler beim Neuladen der MOTD-Konfiguration")
        
        return {"message": "MOTD-Konfiguration erfolgreich aktualisiert"}
    
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Ungültiges JSON-Format")
    except Exception as e:
        logger.error(f"Fehler beim Aktualisieren der MOTD-Konfiguration: {e}")
        raise HTTPException(status_code=500, detail=f"Interner Serverfehler: {str(e)}")

# API-Endpunkte für RAG
@app.post("/api/question")
async def answer_question(request: QuestionRequest, user_data: Dict[str, Any] = Depends(get_current_user)):
    """Beantwortet eine Frage mit dem RAG-System"""
    user_id = user_data['user_id']
    
    # Erstelle eine neue Session wenn nötig
    session_id = request.session_id
    if not session_id:
        session_id = chat_history.create_session(user_id)
        if not session_id:
            raise HTTPException(status_code=500, detail="Fehler beim Erstellen einer Session")
    
    # Speichere die Benutzerfrage
    chat_history.add_message(session_id, request.question, is_user=True)
    
    # Beantworte die Frage
    result = await rag_engine.answer_question(request.question, user_id)
    if not result['success']:
        return JSONResponse(status_code=500, content={"error": result['message']})
    
    
    # Prüfe, ob die Antwort Englisch sein könnte
    answer = result['answer']
    english_keywords = ['the', 'this', 'that', 'and', 'for', 'with', 'from', 'here', 'there', 'question']
    german_keywords = ['der', 'die', 'das', 'und', 'für', 'mit', 'von', 'hier', 'dort', 'frage']
    
    english_count = sum(1 for word in english_keywords if f" {word} " in f" {answer.lower()} ")
    german_count = sum(1 for word in german_keywords if f" {word} " in f" {answer.lower()} ")
    
    # Wenn die Antwort wahrscheinlich Englisch ist
    if english_count > german_count:
        answer = "Entschuldigung, aber ich konnte nur eine englische Antwort generieren. " \
                "Hier ist die relevanteste Information auf Deutsch:\n\n" + \
                "\n".join([chunk['text'][:200] for chunk in result['chunks'][:1]])
        
        result['answer'] = answer
    
    # Speichere die Antwort
    chat_history.add_message(session_id, result['answer'], is_user=False)
    
    return {
        "answer": result['answer'],
        "session_id": session_id,
        "sources": result['sources'],
        "cached": result.get('cached', False)
    }

# API-Endpunkt für das Streaming
@app.get("/api/question/stream")
async def stream_question(
    question: str, 
    session_id: int,
    auth_token: Optional[str] = None,
    request: Request = None
):
    """Streamt die Antwort auf eine Frage via Server-Sent Events (SSE)"""
    # Logging für Debugging
    logger.info(f"Stream-Anfrage erhalten: Frage='{question[:50]}...', Session={session_id}")
    
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
    
    # Prüfe, ob die Session existiert und dem Benutzer gehört
    user_sessions = chat_history.get_user_sessions(user_id)
    session_ids = [s['id'] for s in user_sessions]
    
    if session_id not in session_ids:
        # Erstelle eine neue Session, wenn die angegebene nicht existiert
        logger.warning(f"Session {session_id} nicht gefunden, erstelle neue Session")
        session_id = chat_history.create_session(user_id, "Neue Unterhaltung")
        
        if not session_id:
            logger.error("Fehler beim Erstellen einer neuen Session")
            raise HTTPException(status_code=500, detail="Fehler beim Erstellen einer Session")
    
    # Speichere die Benutzerfrage in der Chat-Historie
    logger.info(f"Speichere Benutzerfrage in Session {session_id}")
    chat_history.add_message(session_id, question, is_user=True)
    
    # Stream die Antwort vom RAG-Engine
    try:
        logger.info(f"Starte Streaming für Frage: '{question[:50]}...'")
        response = await rag_engine.stream_answer(question, session_id)
        
        # Speichere vollständige Antwort am Ende
        # Anmerkung: Dies muss im Frontend in einem 'done' Event-Handler erfolgen
        # Hier ist es nicht einfach möglich, da wir die vollständige Antwort nicht haben
        
        return response
    except Exception as e:
        logger.error(f"Fehler beim Streaming: {e}", exc_info=True)
        # Konvertiere die Exception in ein EventSourceResponse für den Client
        async def error_stream():
            yield f"data: {json.dumps({'error': str(e)})}\n\n"
            yield "event: done\ndata: \n\n"
        return EventSourceResponse(error_stream())

@app.get("/api/session/{session_id}")
async def get_session(session_id: int, user_data: Dict[str, Any] = Depends(get_current_user)):
    """Gibt den Chatverlauf einer Session zurück"""
    user_id = user_data['user_id']
    
    # Hole alle Sessions des Benutzers
    user_sessions = chat_history.get_user_sessions(user_id)
    session_ids = [s['id'] for s in user_sessions]
    
    # Überprüfe, ob die Session dem Benutzer gehört
    if session_id not in session_ids:
        raise HTTPException(status_code=403, detail="Zugriff verweigert")
    
    # Hole den Chatverlauf
    history = chat_history.get_session_history(session_id)
    
    # Finde den Session-Titel
    session_info = next((s for s in user_sessions if s['id'] == session_id), None)
    
    return {
        "session_id": session_id,
        "title": session_info['title'] if session_info else "Unbekannte Unterhaltung",
        "messages": history
    }

@app.get("/api/sessions")
async def get_sessions(user_data: Dict[str, Any] = Depends(get_current_user)):
    """Gibt alle Chat-Sessions eines Benutzers zurück"""
    user_id = user_data['user_id']
    
    sessions = chat_history.get_user_sessions(user_id)
    
    return {"sessions": sessions}

@app.post("/api/session")
async def start_session(request: StartSessionRequest, user_data: Dict[str, Any] = Depends(get_current_user)):
    """Startet eine neue Chat-Session"""
    user_id = user_data['user_id']
    
    session_id = chat_history.create_session(user_id, request.title)
    
    if not session_id:
        raise HTTPException(status_code=500, detail="Fehler beim Erstellen einer Session")
    
    return {"session_id": session_id, "title": request.title}

@app.delete("/api/session/{session_id}")
async def delete_session(session_id: int, user_data: Dict[str, Any] = Depends(get_current_user)):
    """Löscht eine Chat-Session"""
    user_id = user_data['user_id']
    
    success = chat_history.delete_session(session_id, user_id)
    
    if not success:
        raise HTTPException(status_code=403, detail="Zugriff verweigert")
    
    return {"message": "Session erfolgreich gelöscht"}

@app.put("/api/session/rename")
async def rename_session(request: RenameSessionRequest, user_data: Dict[str, Any] = Depends(get_current_user)):
    """Benennt eine Chat-Session um"""
    user_id = user_data['user_id']
    
    success = chat_history.rename_session(request.session_id, user_id, request.title)
    
    if not success:
        raise HTTPException(status_code=403, detail="Zugriff verweigert")
    
    return {"message": "Session erfolgreich umbenannt"}

# Admin-API-Endpunkte
@app.post("/api/admin/install-model")
async def install_model(user_data: Dict[str, Any] = Depends(get_current_user)):
    """Installiert das LLM-Modell"""
    # In einer echten Anwendung würde hier eine Admin-Berechtigung geprüft werden
    result = await rag_engine.install_model()
    
    if not result['success']:
        return JSONResponse(status_code=500, content={"error": result['message']})
    
    return {"message": result['message']}

@app.post("/api/admin/clear-cache")
async def clear_cache(user_data: Dict[str, Any] = Depends(get_current_user)):
    """Löscht den Cache"""
    # In einer echten Anwendung würde hier eine Admin-Berechtigung geprüft werden
    result = rag_engine.clear_cache()
    
    if not result['success']:
        return JSONResponse(status_code=500, content={"error": result['message']})
    
    return {"message": result['message']}

@app.get("/api/admin/stats")
async def get_stats(user_data: Dict[str, Any] = Depends(get_current_user)):
    """Gibt Statistiken zum System zurück"""
    # In einer echten Anwendung würde hier eine Admin-Berechtigung geprüft werden
    stats = rag_engine.get_document_stats()
    
    return {"stats": stats}

# Initialisierung
@app.on_event("startup")
async def startup_event():
    """Initialisiert das System beim Start"""
    Config.init_directories()
    await rag_engine.initialize()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "server:app",
        host=Config.HOST,
        port=Config.PORT,
        reload=True
    )