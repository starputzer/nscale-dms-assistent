import sys
import os

# Füge das Projektverzeichnis zum Python-Pfad hinzu
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Setze das Arbeitsverzeichnis auf das Projektverzeichnis für einheitliche Pfadbehandlung
os.chdir(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import asyncio
import time
import uuid
import json
import re  # Für reguläre Ausdrücke
import sqlite3  # Fehlender Import hinzugefügt
import tempfile

from pathlib import Path
from typing import Dict, Any, Optional, List
from fastapi import FastAPI, HTTPException, Depends, BackgroundTasks, Request
from fastapi.responses import JSONResponse, FileResponse
from sse_starlette.sse import EventSourceResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from starlette.types import Scope, Receive, Send
from starlette.middleware.base import BaseHTTPMiddleware
from pydantic import BaseModel, EmailStr
from jose import JWTError, jwt
from starlette.concurrency import run_in_threadpool
from fastapi import HTTPException, Depends, Security, File, UploadFile, Form, BackgroundTasks
from pydantic import BaseModel, EmailStr
from typing import List
from modules.core.config import Config
from modules.core.logging import LogManager
from modules.auth.user_model import UserManager
from modules.rag.engine import RAGEngine
from modules.session.chat_history import ChatHistoryManager
from modules.feedback.feedback_manager import FeedbackManager
from modules.core.motd_manager import MOTDManager

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

# Allgemeiner Exception-Handler für bessere Fehlerdiagnose
@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    logger.error(f"Unbehandelte Ausnahme: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": str(exc)},
    )

# Einfache Middleware für No-Cache-Header (robustere Lösung als NoCacheStaticFiles)
class NoCacheMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        response = await call_next(request)
        if request.url.path.startswith("/static") and (request.url.path.endswith(".css") or request.url.path.endswith(".js")):
            response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
            response.headers["Pragma"] = "no-cache"
            response.headers["Expires"] = "0"
        return response

# Füge die No-Cache-Middleware hinzu (vor der CORS-Middleware)
app.add_middleware(NoCacheMiddleware)

# CORS-Konfiguration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In Produktion einschränken
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Prüfe und melde den Status der Frontend-Verzeichnisse
frontend_dir = Path("frontend")
logger.info(f"Frontend-Verzeichnis: {frontend_dir.absolute()}")
logger.info(f"Frontend-Verzeichnis existiert: {frontend_dir.exists()}")
if frontend_dir.exists():
    css_dir = frontend_dir / "css"
    js_dir = frontend_dir / "js"
    logger.info(f"CSS-Verzeichnis existiert: {css_dir.exists()}")
    logger.info(f"JS-Verzeichnis existiert: {js_dir.exists()}")
    
    if css_dir.exists():
        logger.info(f"CSS-Dateien: {[f.name for f in css_dir.iterdir() if f.is_file()]}")
    if js_dir.exists():
        logger.info(f"JS-Dateien: {[f.name for f in js_dir.iterdir() if f.is_file()]}")

# App Mounten mit normaler StaticFiles-Klasse
# Mounte das Frontend-Verzeichnis mit absoluten Pfaden für mehr Zuverlässigkeit
frontend_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "frontend")
app.mount("/static", StaticFiles(directory=frontend_path), name="static")
logger.info(f"Frontend gemountet von: {frontend_path}")

# Mount Vue.js static assets mit absoluten Pfaden
vue_app_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "nscale-vue")
logger.info(f"Vue.js App-Pfad: {vue_app_path}")

# Pfade relativ zum Hauptverzeichnis
vue_paths_to_mount = [
    {
        "url_path": "/static/vue",
        "directory": os.path.join(vue_app_path, ""),
        "name": "vue_static_root",
        "description": "Vue.js Root-Assets"
    },
    {
        "url_path": "/static/vue/src",
        "directory": os.path.join(vue_app_path, "src"),
        "name": "vue_static_src",
        "description": "Vue.js Source-Assets"
    },
    {
        "url_path": "/static/vue/dist",
        "directory": os.path.join(vue_app_path, "dist"),
        "name": "vue_static_dist",
        "description": "Vue.js Dist-Assets"
    },
    {
        "url_path": "/static/vue/components",
        "directory": os.path.join(vue_app_path, "src/components"),
        "name": "vue_static_components",
        "description": "Vue.js Components"
    },
    {
        "url_path": "/static/vue/components/common",
        "directory": os.path.join(vue_app_path, "src/components/common"),
        "name": "vue_static_common_components",
        "description": "Vue.js Common Components"
    },
    {
        "url_path": "/static/vue/standalone",
        "directory": os.path.join(vue_app_path, "src/standalone"),
        "name": "vue_static_standalone",
        "description": "Vue.js Standalone Scripts"
    },
    {
        "url_path": "/static/vue/assets/js",
        "directory": os.path.join(vue_app_path, "dist/assets/js"),
        "name": "vue_static_js",
        "description": "Vue.js JavaScript Assets"
    }
]

# Versuche, alle Vue.js-Verzeichnisse zu mounten
successful_mounts = 0
for path_config in vue_paths_to_mount:
    dir_path = path_config["directory"]
    if os.path.exists(dir_path):
        try:
            app.mount(
                path_config["url_path"],
                StaticFiles(directory=dir_path),
                name=path_config["name"]
            )
            logger.info(f"{path_config['description']} erfolgreich gemountet von {dir_path}")
            successful_mounts += 1
        except Exception as e:
            logger.error(f"Fehler beim Mounten von {dir_path}: {e}")

if successful_mounts == 0:
    logger.warning("Keine Vue.js Assets-Verzeichnisse gefunden oder konnten gemountet werden")

@app.get("/")
async def root():
    index_path = os.path.join(frontend_path, "index.html")
    logger.info(f"Serving index.html from: {index_path}")
    return FileResponse(index_path)

# Route für Vue.js SPA (Single Page Application)
@app.get("/app/{path:path}")
async def vue_app(path: str):
    """
    Liefert die Vue.js SPA für alle /app/* Pfade
    Dies ermöglicht Client-Side-Routing in der Vue.js-Anwendung
    """
    vue_index_path = os.path.join(vue_app_path, "dist/index.html")
    vue_dev_index_path = os.path.join(vue_app_path, "index.html")
    frontend_index_path = os.path.join(frontend_path, "index.html")
    
    logger.info(f"Vue.js App-Route angefordert für Pfad: {path}")
    logger.info(f"Prüfe Vue.js Pfade: {vue_index_path}, {vue_dev_index_path}")
    
    if os.path.exists(vue_index_path):
        logger.info(f"Vue.js Dist Index gefunden, liefere: {vue_index_path}")
        return FileResponse(vue_index_path)
    elif os.path.exists(vue_dev_index_path):
        logger.info(f"Vue.js Dev Index gefunden, liefere: {vue_dev_index_path}")
        return FileResponse(vue_dev_index_path)
    else:
        # Fallback zur existierenden index.html, wenn Vue.js-App nicht gefunden
        logger.warning(f"Vue.js App-Route angefordert, aber index.html nicht gefunden. Path: {path}")
        logger.info(f"Liefere Fallback-Index: {frontend_index_path}")
        return FileResponse(frontend_index_path)
        
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

#Datenmodelle für Konvertierung
class ConversionRequest(BaseModel):
    source_path: str
    target_dir: Optional[str] = None
    post_processing: bool = True

class DirectoryConversionRequest(BaseModel):
    source_dir: str
    target_dir: Optional[str] = None
    priority_group: Optional[str] = None

class MarkdownProcessRequest(BaseModel):
    markdown_dir: str

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

@app.delete("/api/admin/users/{user_id}")
async def delete_user(user_id: int, admin_data: Dict[str, Any] = Depends(get_admin_user)):
    """Löscht einen Benutzer (nur für Administratoren)"""
    admin_user_id = admin_data['user_id']
    
    # Prüfen, ob der Admin versucht, sich selbst zu löschen
    if user_id == admin_user_id:
        raise HTTPException(status_code=400, detail="Sie können Ihr eigenes Konto nicht löschen")
    
    # Diese Implementierung nutzt nun die erweiterte delete_user-Methode
    success = user_manager.delete_user(user_id, admin_user_id)
    
    if not success:
        raise HTTPException(status_code=403, detail="Löschen nicht möglich. Der Benutzer könnte ein Administrator sein oder existiert nicht.")
    
    return {"message": f"Benutzer mit ID {user_id} erfolgreich gelöscht"}

@app.put("/api/admin/users/{user_id}/role")
async def update_user_role(user_id: int, request: dict, admin_data: Dict[str, Any] = Depends(get_admin_user)):
    """Aktualisiert die Rolle eines Benutzers (Admin-Funktion)"""
    # Prüfen, ob der Admin versucht, seine eigene Rolle zu ändern
    if user_id == admin_data['user_id']:
        raise HTTPException(status_code=400, detail="Sie können Ihre eigene Rolle nicht ändern")
    
    # Validiere Rollenangabe
    new_role = request.get("role")
    if new_role not in ["user", "admin"]:
        raise HTTPException(status_code=400, detail="Ungültige Rolle")
    
    # Aktualisiere die Rolle
    success = user_manager.update_user_role(user_id, new_role, admin_data['user_id'])
    
    if not success:
        raise HTTPException(status_code=403, detail="Aktualisierung nicht möglich. Der Benutzer könnte ein geschützter Admin sein oder existiert nicht.")
    
    return {"message": f"Rolle des Benutzers mit ID {user_id} erfolgreich auf {new_role} aktualisiert"}

# Endpoint um die Rolle des aktuellen Benutzers abzurufen
@app.get("/api/user/role")
async def get_current_user_role(user_data: Dict[str, Any] = Depends(get_current_user)):
    """Gibt die Rolle und ID des aktuellen Benutzers zurück"""
    return {
        "role": user_data.get('role', 'user'),
        "user_id": user_data.get('user_id')
    }

@app.get("/api/explain/{message_id}")
async def explain_answer(message_id: int, user_data: Dict[str, Any] = Depends(get_current_user)):
    """
    Erklärt, wie eine bestimmte Antwort generiert wurde, inkl. genutzter Quellen
    und Entscheidungsprozess.
    """
    try:
        # Hole die Nachricht aus der Datenbank
        conn = sqlite3.connect(Config.DB_PATH)
        cursor = conn.cursor()
        
        # Prüfe, ob die Nachricht existiert und ob sie dem Benutzer gehört
        cursor.execute("""
            SELECT m.id, m.message, m.session_id, s.user_id 
            FROM chat_messages m
            JOIN chat_sessions s ON m.session_id = s.id
            WHERE m.id = ? AND m.is_user = 0
        """, (message_id,))
        
        result = cursor.fetchone()
        if not result:
            # Überprüfe, ob die ID möglicherweise ein temporärer Zeitstempel ist
            current_time = int(time.time())
            one_hour_ago = current_time - 3600  # Eine Stunde zurück
            
            # Wenn die ID wie ein Zeitstempel aussieht (z.B. 13-stellig), versuche die letzte Assistenten-Nachricht
            if len(str(message_id)) >= 13 and one_hour_ago < message_id < current_time * 1000:
                logger.warning(f"Message ID {message_id} sieht wie ein Zeitstempel aus, verwende Fallback")
                
                # Suche nach der letzten Assistenten-Nachricht in der aktuellen Sitzung
                cursor.execute("""
                    SELECT m.id, m.message, m.session_id, s.user_id 
                    FROM chat_messages m
                    JOIN chat_sessions s ON m.session_id = s.id
                    WHERE s.user_id = ? AND m.is_user = 0
                    ORDER BY m.created_at DESC
                    LIMIT 1
                """, (user_data['user_id'],))
                
                result = cursor.fetchone()
                
                if not result:
                    conn.close()
                    logger.error(f"Nachricht mit ID {message_id} nicht gefunden und kein Fallback verfügbar")
                    # Statt 404 geben wir ein leeres Ergebnis zurück, um im Frontend eine bessere Fehlermeldung anzuzeigen
                    return {
                        "original_question": "Keine Frage gefunden",
                        "answer_summary": "Keine Antwort gefunden",
                        "source_references": [],
                        "explanation_text": "Leider konnte keine Erklärung generiert werden, da keine zugehörige Nachricht gefunden wurde."
                    }
            else:
                conn.close()
                logger.error(f"Nachricht mit ID {message_id} nicht gefunden")
                # Statt 404 geben wir ein leeres Ergebnis zurück
                return {
                    "original_question": "Keine Frage gefunden",
                    "answer_summary": "Keine Antwort gefunden",
                    "source_references": [],
                    "explanation_text": "Leider konnte keine Erklärung generiert werden, da keine zugehörige Nachricht gefunden wurde."
                }
        
        msg_id, message_text, session_id, message_user_id = result
        
        # Prüfe, ob der Benutzer Zugriff auf diese Nachricht hat
        if message_user_id != user_data['user_id'] and user_data.get('role') != 'admin':
            conn.close()
            logger.warning(f"Benutzer {user_data['user_id']} hat keine Berechtigung für Nachricht {message_id}")
            # Statt 403 geben wir ein leeres Ergebnis zurück
            return {
                "original_question": "Keine Berechtigung",
                "answer_summary": "Keine Berechtigung",
                "source_references": [],
                "explanation_text": "Sie haben keine Berechtigung, diese Erklärung anzuzeigen."
            }
        
        # Hole die vorherige Benutzerfrage
        cursor.execute("""
            SELECT message FROM chat_messages 
            WHERE session_id = ? AND is_user = 1 AND created_at < (
                SELECT created_at FROM chat_messages WHERE id = ?
            )
            ORDER BY created_at DESC
            LIMIT 1
        """, (session_id, msg_id))  # Wichtig: Hier msg_id verwenden, nicht message_id
        
        prev_question_result = cursor.fetchone()
        if not prev_question_result:
            # Fallback: Versuche irgendeine Benutzerfrage aus der Session zu finden
            cursor.execute("""
                SELECT message FROM chat_messages 
                WHERE session_id = ? AND is_user = 1
                ORDER BY created_at DESC
                LIMIT 1
            """, (session_id,))
            
            prev_question_result = cursor.fetchone()
            
            if not prev_question_result:
                conn.close()
                logger.warning(f"Keine Benutzerfrage für Nachricht {msg_id} gefunden")
                # Statt 404 geben wir ein leeres Ergebnis zurück
                return {
                    "original_question": "Keine Frage gefunden",
                    "answer_summary": message_text[:200] + "..." if len(message_text) > 200 else message_text,
                    "source_references": [],
                    "explanation_text": "Es konnte keine zugehörige Frage gefunden werden, daher kann keine detaillierte Erklärung generiert werden."
                }
        
        question = prev_question_result[0]
        conn.close()
        
        # Analysiere die Antwort auf verwendete Quellen
        source_references = []
        source_pattern = r'\(Quelle-(\d+)\)'  # Korrigiertes Regex-Pattern
        source_matches = re.findall(source_pattern, message_text)
        
        # Zähle Vorkommen der einzelnen Quellen
        source_counts = {}
        for source_id in source_matches:
            if source_id in source_counts:
                source_counts[source_id] += 1
            else:
                source_counts[source_id] = 1
        
        # Hole die originalen Quellen zum Kontext
        relevant_chunks = []
        try:
            # Versuche die Chunks über den RAG-Engine zu holen
            if not hasattr(rag_engine, "embedding_manager") or not rag_engine.embedding_manager:
                # Initialisiere RAG-Engine falls nötig
                await rag_engine.initialize()
                
            if hasattr(rag_engine, "embedding_manager") and rag_engine.embedding_manager:
                relevant_chunks = rag_engine.embedding_manager.search(question, top_k=Config.TOP_K)
            else:
                logger.warning("Embedding-Manager nicht verfügbar")
                relevant_chunks = []
        except Exception as e:
            logger.error(f"Fehler bei der Quellensuche für Erklärung: {e}")
            # Fallback: leere Quellenliste
            relevant_chunks = []
        
        # Erstelle die Quellenliste
        source_references_text = ""
        for i, chunk in enumerate(relevant_chunks[:5]):
            if str(i+1) in source_counts:
                source_file = chunk.get('file', 'Unbekannte Quelle')
                section_text = f", Abschnitt '{chunk.get('title', '')}'" if chunk.get('type') == 'section' else ''
                count_text = f" - ca. {source_counts.get(str(i+1), 0)} mal referenziert"
                source_references_text += f"- {source_file}{section_text}{count_text}\n"
        
        # Erstelle eine detaillierte Erklärung
        explanation = {
            "original_question": question,
            "answer_summary": message_text[:200] + "..." if len(message_text) > 200 else message_text,
            "source_references": [
                {
                    "source_id": f"Quelle-{i+1}",
                    "file": chunk.get('file', 'Unbekannte Quelle'),
                    "type": chunk.get('type', 'chunk'),
                    "title": chunk.get('title', '') if chunk.get('type') == 'section' else '',
                    "usage_count": source_counts.get(str(i+1), 0),
                    "relevance_score": float(chunk.get('score', 0)),
                    "preview": chunk.get('text', '')[:200] + "..." if len(chunk.get('text', '')) > 200 else chunk.get('text', '')
                }
                for i, chunk in enumerate(relevant_chunks[:5])  # Nur die ersten 5 Quellen
            ],
            "explanation_text": f"""
Diese Antwort wurde basierend auf Ihrer Frage "{question}" generiert.

Der Assistent hat dazu folgende Quellen verwendet:
{source_references_text}
Die Antwort wurde so formuliert, dass sie Ihre Frage direkt beantwortet und dabei die relevantesten Informationen aus den Quellen verständlich zusammenfasst.
"""
        }
        
        return explanation
        
    except Exception as e:
        logger.error(f"Fehler bei der Generierung der Erklärung: {e}", exc_info=True)
        # Statt einer Exception geben wir eine leere Erklärung zurück
        return {
            "original_question": "Fehler aufgetreten",
            "answer_summary": "",
            "source_references": [],
            "explanation_text": f"Bei der Generierung der Erklärung ist ein Fehler aufgetreten: {str(e)}"
        }
        
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

@app.post("/api/session/{session_id}/update-title")
async def update_session_title(session_id: int, user_data: Dict[str, Any] = Depends(get_current_user)):
    """Aktualisiert den Titel einer Session basierend auf der ersten Nachricht"""
    user_id = user_data['user_id']
    
    try:
        # Überprüfe, ob die Session dem Benutzer gehört
        user_sessions = chat_history.get_user_sessions(user_id)
        session_ids = [s['id'] for s in user_sessions]
        
        if session_id not in session_ids:
            raise HTTPException(status_code=403, detail="Zugriff verweigert")
        
        # Aktualisiere den Titel
        success = chat_history.update_session_after_message(session_id)
        
        if not success:
            return JSONResponse(status_code=400, content={"detail": "Titel konnte nicht aktualisiert werden"})
        
        # Hole den aktualisierten Titel
        updated_sessions = chat_history.get_user_sessions(user_id)
        updated_session = next((s for s in updated_sessions if s['id'] == session_id), None)
        
        if not updated_session:
            return JSONResponse(status_code=404, content={"detail": "Session nach Aktualisierung nicht gefunden"})
        
        return {"new_title": updated_session['title']}
    
    except Exception as e:
        logger.error(f"Fehler beim Aktualisieren des Session-Titels: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    
# API-Endpunkte für RAG
@app.post("/api/question")
async def answer_question(request: QuestionRequest, request_obj: Request, user_data: Dict[str, Any] = Depends(get_current_user)):
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
    
    # Überprüfe, ob einfache Sprache verwendet werden soll
    use_simple_language = False
    
    # Prüfe Header
    if request_obj.headers.get("X-Use-Simple-Language", "").lower() in ['true', '1', 'yes']:
        use_simple_language = True
        logger.info("Einfache Sprache aktiviert via HTTP-Header")
    
    # Beantworte die Frage
    result = await rag_engine.answer_question(request.question, user_id, use_simple_language)
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
    
    # Speichere die Antwort und erhalte die message_id
    message_id = chat_history.add_message(session_id, result['answer'], is_user=False)
    
    # Wenn etwas bei der Speicherung schiefging, loggen wir das
    if not message_id:
        logger.error(f"Fehler beim Speichern der Antwort in Session {session_id}")
    
    return {
        "answer": result['answer'],
        "session_id": session_id,
        "message_id": message_id,  # Wichtig: Gib die message_id zurück an das Frontend
        "sources": result['sources'],
        "cached": result.get('cached', False)
    }


@app.get("/api/question/stream")
async def stream_question(
    question: str, 
    session_id: int,
    simple_language: Optional[str] = None,
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
    
    # Speichere die Benutzerfrage in der Chat-Historie und erhalte die Nachricht-ID
    logger.info(f"Speichere Benutzerfrage in Session {session_id}")
    message_id = chat_history.add_message(session_id, question, is_user=True)
    
    if not message_id:
        logger.error(f"Fehler beim Speichern der Benutzerfrage in Session {session_id}")
    
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
    
    # BUGFIX: Füge einen eindeutigen Stream-Identifier hinzu, der auf Session und Frage basiert
    # Dieser wird verwendet, um laufende Streams zu identifizieren und zu gruppieren
    stream_id = f"stream_{session_id}_{hash(question)}"
    
    # Stream die Antwort vom RAG-Engine mit Spracheinstellung
    try:
        logger.info(f"Starte Streaming für Frage: '{question[:50]}...' (Einfache Sprache: {use_simple_language})")
        
        # BUGFIX: Versuche, laufende Streams für dieselbe Session abzubrechen
        if hasattr(rag_engine, "_active_streams"):
            for active_id in list(rag_engine._active_streams.keys()):
                if active_id != stream_id and active_id.startswith(f"stream_{session_id}_"):
                    logger.warning(f"Abbruch eines laufenden Streams für dieselbe Session: {active_id}")
                    try:
                        await rag_engine.cancel_active_streams()
                    except Exception as cancel_err:
                        logger.error(f"Fehler beim Abbrechen aktiver Streams: {cancel_err}")
        
        # Start des neuen Streams mit Stream-ID
        response = await rag_engine.stream_answer(question, session_id, use_simple_language, stream_id=stream_id)
        
        # Speichern der vollständigen Antwort erfolgt intern in stream_answer
        
        return response
    except Exception as e:
        logger.error(f"Fehler beim Streaming: {e}", exc_info=True)
        
        # KORRIGIERT: Verwende ein lokales error_message für den error_stream
        error_message = str(e)
        
        # Konvertiere die Exception in ein EventSourceResponse für den Client
        async def error_stream():
            yield f"data: {json.dumps({'error': error_message})}\n\n"
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
async def install_model(user_data: Dict[str, Any] = Depends(get_admin_user)):
    """Installiert das LLM-Modell (nur für Admins)"""
    result = await rag_engine.install_model()
    
    if not result['success']:
        return JSONResponse(status_code=500, content={"error": result['message']})
    
    return {"message": result['message']}

@app.post("/api/admin/clear-cache")
async def clear_cache(user_data: Dict[str, Any] = Depends(get_admin_user)):
    """Löscht den LLM-Cache (nur für Admins)"""
    result = rag_engine.clear_cache()
    
    if not result['success']:
        return JSONResponse(status_code=500, content={"error": result['message']})
    
    return {"message": result['message']}

@app.post("/api/admin/clear-embedding-cache")
async def clear_embedding_cache(user_data: Dict[str, Any] = Depends(get_admin_user)):
    """Löscht den Embedding-Cache (nur für Admins)"""
    try:
        # Löschlogik für Embedding-Cache
        embedding_cache_path = Config.EMBED_CACHE_PATH
        if embedding_cache_path.exists():
            embedding_cache_path.unlink()
            logger.info(f"Embedding-Cache-Datei gelöscht: {embedding_cache_path}")
            
            # Setze den RAG-Engine-Zustand zurück, um Neuinitialisierung zu erzwingen
            rag_engine.initialized = False
            if hasattr(rag_engine, 'embedding_manager'):
                if hasattr(rag_engine.embedding_manager, 'embeddings'):
                    rag_engine.embedding_manager.embeddings = None
                if hasattr(rag_engine.embedding_manager, 'chunks'):
                    rag_engine.embedding_manager.chunks = []
                if hasattr(rag_engine.embedding_manager, 'tfidf_vectorizer'):
                    rag_engine.embedding_manager.tfidf_vectorizer = None
                if hasattr(rag_engine.embedding_manager, 'tfidf_matrix'):
                    rag_engine.embedding_manager.tfidf_matrix = None
                rag_engine.embedding_manager.initialized = False
            
            return {"message": "Embedding-Cache erfolgreich gelöscht"}
        else:
            logger.info(f"Embedding-Cache-Datei existiert nicht: {embedding_cache_path}")
            return {"message": "Embedding-Cache existiert nicht oder wurde bereits gelöscht"}
    except Exception as e:
        logger.error(f"Fehler beim Löschen des Embedding-Cache: {e}")
        raise HTTPException(status_code=500, detail=f"Fehler beim Löschen des Embedding-Cache: {str(e)}")

@app.get("/api/admin/stats")
async def get_stats(user_data: Dict[str, Any] = Depends(get_admin_user)):
    """Gibt Statistiken zum System zurück (nur für Admins)"""
    stats = rag_engine.get_document_stats()
    
    return {"stats": stats}

# CSS-Datei-Zeitstempel aktualisieren bei Serverstart
@app.on_event("startup")
async def update_css_timestamps():
    """Aktualisiert die Zeitstempel aller CSS-Dateien beim Server-Start"""
    import os
    from datetime import datetime
    
    css_dir = Path("frontend/css")
    if css_dir.exists():
        now = datetime.now().timestamp()
        count = 0
        for file_path in css_dir.glob("*.css"):
            try:
                # Ändere Zugriffs- und Modifizierungszeit
                os.utime(file_path, (now, now))
                count += 1
                logger.info(f"CSS-Datei aktualisiert: {file_path.name}")
            except Exception as e:
                logger.error(f"Fehler beim Aktualisieren des Zeitstempels von {file_path.name}: {e}")
        
        logger.info(f"Insgesamt {count} CSS-Dateien aktualisiert")

# API-Endpunkte für Dokumentenkonvertierung hinzufügen:

@app.post("/api/admin/convert/document")
async def convert_document(
    request: ConversionRequest,
    admin_data: Dict[str, Any] = Depends(get_admin_user)
):
    """Konvertiert ein einzelnes Dokument (nur für Administratoren)"""
    result = rag_engine.document_store.convert_document(
        source_path=request.source_path,
        target_dir=request.target_dir
    )
    
    if not result.get('success', False):
        return JSONResponse(
            status_code=500,
            content={"error": result.get('error', "Unbekannter Fehler bei der Konvertierung")}
        )
    
    return result

@app.post("/api/admin/convert/directory")
async def convert_directory(
    request: DirectoryConversionRequest,
    admin_data: Dict[str, Any] = Depends(get_admin_user)
):
    """Konvertiert alle Dokumente in einem Verzeichnis (nur für Administratoren)"""
    result = rag_engine.document_store.convert_and_load_documents(
        source_dir=request.source_dir,
        target_dir=request.target_dir
    )
    
    if not result.get('success', False):
        return JSONResponse(
            status_code=500,
            content={"error": result.get('error', "Unbekannter Fehler bei der Konvertierung")}
        )
    
    return result

@app.post("/api/admin/inventory")
async def inventory_documents(
    request: DirectoryConversionRequest,
    admin_data: Dict[str, Any] = Depends(get_admin_user)
):
    """Führt eine Inventarisierung von Dokumenten durch (nur für Administratoren)"""
    result = rag_engine.document_store.inventory_documents(
        source_dir=request.source_dir
    )
    
    if not result.get('success', False):
        return JSONResponse(
            status_code=500,
            content={"error": result.get('error', "Unbekannter Fehler bei der Inventarisierung")}
        )
    
    return result

@app.post("/api/admin/process/markdown")
async def process_markdown_directory(
    request: MarkdownProcessRequest,
    admin_data: Dict[str, Any] = Depends(get_admin_user)
):
    """Verarbeitet alle Markdown-Dateien in einem Verzeichnis (nur für Administratoren)"""
    result = rag_engine.document_store.process_markdown_directory(
        markdown_dir=request.markdown_dir
    )
    
    if not result.get('success', False):
        return JSONResponse(
            status_code=500,
            content={"error": result.get('error', "Unbekannter Fehler bei der Markdown-Verarbeitung")}
        )
    
    return result

@app.get("/api/admin/converter/status")
async def get_converter_status(
    admin_data: Dict[str, Any] = Depends(get_admin_user)
):
    """Gibt den Status des Dokumentenkonverters zurück (nur für Administratoren)"""
    result = rag_engine.document_store.get_converter_status()
    
    if not result.get('available', False) and 'error' in result:
        return JSONResponse(
            status_code=500,
            content={"error": result.get('error', "Dokumentenkonverter nicht verfügbar")}
        )
    
    return result

@app.post("/api/admin/upload/document")
async def upload_and_convert_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    post_processing: bool = Form(True),
    target_dir: Optional[str] = Form(None),
    admin_data: Dict[str, Any] = Depends(get_admin_user)
):
    """Lädt ein Dokument hoch und konvertiert es (nur für Administratoren)"""
    # Erstelle temporäres Verzeichnis für Upload
    temp_dir = tempfile.mkdtemp(prefix="nscale_upload_")
    temp_file_path = os.path.join(temp_dir, file.filename)
    
    try:
        # Speichere die hochgeladene Datei
        with open(temp_file_path, "wb") as f:
            content = await file.read()
            f.write(content)
        
        # Starte Konvertierung als Hintergrundaufgabe
        background_tasks.add_task(
            process_uploaded_document,
            temp_file_path,
            target_dir,
            post_processing,
            admin_data['user_id']
        )
        
        return {
            "success": True,
            "message": "Dokument erfolgreich hochgeladen. Konvertierung läuft im Hintergrund.",
            "filename": file.filename,
            "temp_path": temp_file_path
        }
    
    except Exception as e:
        try:
            # Aufräumen
            import shutil
            shutil.rmtree(temp_dir)
        except:
            pass
        
        logger.error(f"Fehler beim Hochladen/Konvertieren von {file.filename}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Fehler bei der Verarbeitung: {str(e)}")

async def process_uploaded_document(
    temp_file_path: str,
    target_dir: Optional[str],
    post_processing: bool,
    user_id: int
):
    """Verarbeitet ein hochgeladenes Dokument im Hintergrund"""
    try:
        # Speichere ursprüngliche Einstellung
        original_post_processing = rag_engine.document_store.doc_converter.post_processing
        # Setze gewünschte Einstellung
        rag_engine.document_store.doc_converter.post_processing = post_processing
        
        # Konvertiere Dokument
        result = rag_engine.document_store.convert_document(
            source_path=temp_file_path,
            target_dir=target_dir
        )
        
        # Stelle ursprüngliche Einstellung wieder her
        rag_engine.document_store.doc_converter.post_processing = original_post_processing
        
        # Lade Dokumente neu
        if result.get('success', False):
            rag_engine.document_store.load_documents()
            
            # Erstelle Log-Eintrag
            logger.info(
                f"Dokument erfolgreich konvertiert: {os.path.basename(temp_file_path)} -> "
                f"{result.get('target', 'Unbekanntes Ziel')} (Benutzer-ID: {user_id})"
            )
        else:
            # Erstelle Fehler-Log
            logger.error(
                f"Fehler bei der Konvertierung von {os.path.basename(temp_file_path)}: "
                f"{result.get('error', 'Unbekannter Fehler')} (Benutzer-ID: {user_id})"
            )
    
    except Exception as e:
        logger.error(f"Unbehandelter Fehler bei der Dokumentverarbeitung: {e}", exc_info=True)
    
    finally:
        try:
            # Aufräumen - temporäres Verzeichnis löschen
            import shutil
            temp_dir = os.path.dirname(temp_file_path)
            shutil.rmtree(temp_dir)
        except Exception as cleanup_error:
            logger.warning(f"Fehler beim Aufräumen temporärer Dateien: {cleanup_error}")

@app.get("/api/admin/conversions/recent")
async def get_recent_conversions(
    limit: int = 10,
    admin_data: Dict[str, Any] = Depends(get_admin_user)
):
    """Gibt eine Liste der kürzlich durchgeführten Konvertierungen zurück (nur für Administratoren)"""
    # Diese Funktion benötigt eine Implementierung im DocumentStore, um Konvertierungsprotokolle zu speichern
    # Hier ein Beispiel für die Struktur der Rückgabe:
    return {
        "success": True,
        "conversions": [
            # Beispieldaten, in der tatsächlichen Implementierung durch echte Daten ersetzen
            {
                "id": 1,
                "source_filename": "beispiel.pdf",
                "target_filename": "beispiel.md",
                "timestamp": "2025-04-29T10:00:00",
                "user_id": admin_data['user_id'],
                "success": True
            }
        ]
    }

# Reload-Endpunkt nach Konvertierung
@app.post("/api/admin/reload-documents")
async def admin_reload_documents(
    admin_data: Dict[str, Any] = Depends(get_admin_user)
):
    """Lädt alle Dokumente neu (nur für Administratoren)"""
    try:
        # Dokumentenstore neu laden
        rag_engine.document_store.load_documents()
        
        # Wenn der RAG-Engine eine Neuinitialisierung benötigt
        if hasattr(rag_engine, "initialize"):
            await rag_engine.initialize()
        
        return {
            "success": True,
            "message": "Dokumente erfolgreich neu geladen",
            "document_count": len(rag_engine.document_store.documents),
            "chunk_count": len(rag_engine.document_store.chunks)
        }
    
    except Exception as e:
        logger.error(f"Fehler beim Neuladen der Dokumente: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Fehler beim Neuladen der Dokumente: {str(e)}")

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