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

from fastapi import FastAPI, HTTPException, Depends, BackgroundTasks, Request
from fastapi.responses import JSONResponse, FileResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, EmailStr
from jose import JWTError, jwt
from starlette.concurrency import run_in_threadpool

from modules.core.config import Config
from modules.core.logging import LogManager
from modules.auth.user_model import UserManager
from modules.rag.engine import RAGEngine
from modules.session.chat_history import ChatHistoryManager

logger = LogManager.setup_logging()

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
    
    if not result['success']:
        return JSONResponse(status_code=500, content={"error": result['message']})
    
    # Speichere die Antwort
    chat_history.add_message(session_id, result['answer'], is_user=False)
    
    return {
        "answer": result['answer'],
        "session_id": session_id,
        "sources": result['sources'],
        "cached": result.get('cached', False)
    }

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

# Statische Dateien für Frontend
@app.get("/")
async def root():
    return {"message": "nscale DMS Assistent API ist aktiv"}

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
