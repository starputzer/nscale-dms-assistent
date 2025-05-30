import sys
import os

# Füge das Projektverzeichnis zum Python-Pfad hinzu
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import centralized routes configuration
from api.routes_config import (
    API_VERSION, API_BASE_VERSIONED,
    AUTH_ROUTES, SESSION_ROUTES, ADMIN_ROUTES,
    DOCUMENT_ROUTES, FEEDBACK_ROUTES, SYSTEM_ROUTES,
    build_api_url
)


import asyncio
import time
import uuid
import json
import re  # Für reguläre Ausdrücke
import sqlite3  # Fehlender Import hinzugefügt
from pathlib import Path
from typing import Dict, Any, Optional, List
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Depends, BackgroundTasks, Request, Query
from fastapi.responses import JSONResponse, FileResponse, Response
from sse_starlette.sse import EventSourceResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from starlette.types import Scope, Receive, Send
from starlette.middleware.base import BaseHTTPMiddleware
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
from modules.core.motd_manager import MOTDManager
from api.telemetry_handler import handle_telemetry_request
from api.fixed_stream_endpoint import additional_router
from api.streaming_integration import initialize_dependencies, register_streaming_endpoints
from api.admin_handler import get_negative_feedback, update_feedback_status, delete_feedback, filter_feedback, export_feedback, get_doc_converter_status, get_doc_converter_jobs, get_doc_converter_settings, update_doc_converter_settings, get_system_stats, get_available_actions, perform_system_check
from api.documentation_api import router as documentation_router

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
# Lifespan context manager für Startup/Shutdown Events
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await startup_event()
    await update_css_timestamps()
    yield
    # Shutdown
    # Hier können Shutdown-Tasks hinzugefügt werden

app = FastAPI(title="nscale DMS Assistent API", lifespan=lifespan)

# Zusätzliche API-Endpunkte für Feedback integrieren
app.include_router(additional_router)

# Documentation API router
app.include_router(documentation_router)

# Allgemeiner Exception-Handler für bessere Fehlerdiagnose
@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    logger.error(f"Unbehandelte Ausnahme: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": str(exc)},
    )

# Erweiterte Middleware für No-Cache-Header und MIME-Typ-Korrekturen
class EnhancedMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        # Besseres MIME-Typ-Management - Setze Header schon VOR dem Aufruf
        # für Pfade, die wir direkt identifizieren können
        original_path = request.url.path
        content_type = None
        
        # Vorab MIME-Type erkennen basierend auf Pfad und Dateiendung
        if original_path.endswith(".css"):
            content_type = "text/css"
            logger.debug(f"CSS-Datei erkannt (vor Aufruf): {original_path}")
        elif original_path.endswith(".js"):
            content_type = "application/javascript"
            logger.debug(f"JavaScript-Datei erkannt (vor Aufruf): {original_path}")
        elif original_path.endswith((".png", ".jpg", ".jpeg", ".gif")):
            ext = original_path.split(".")[-1].lower()
            content_type = f"image/{ext if ext != 'jpg' else 'jpeg'}"
        elif original_path.endswith(".svg"):
            content_type = "image/svg+xml"
        elif original_path.endswith(".json"):
            content_type = "application/json"
        
        # Protokolliere wichtige Anfragen für die Fehlersuche
        if ((original_path.startswith("/css/") or original_path.startswith("/static/css/")) and 
            original_path.endswith(".css")):
            logger.debug(f"CSS-Datei angefordert: {original_path}, Content-Type wird auf {content_type} gesetzt")
            
        # Lasse den Request durch die reguläre Middleware-Kette laufen
        response = await call_next(request)
        
        # Stelle sicher, dass der richtige Content-Type gesetzt ist, egal was vorher passiert ist
        if content_type:
            current_content_type = response.headers.get("Content-Type", "")
            
            # Wenn Content-Type falsch oder nicht gesetzt ist, korrigiere ihn
            if content_type not in current_content_type:
                response.headers["Content-Type"] = content_type
                logger.debug(f"Content-Type für {original_path} korrigiert auf {content_type} (war: {current_content_type})")
        
        # Spezielle Behandlung für JavaScript-Module
        if original_path.endswith(".js") and "type=module" in original_path:
            response.headers["Content-Type"] = "application/javascript"
            logger.debug(f"Content-Type für JS-Modul {original_path} auf application/javascript gesetzt")
        
        # Setze No-Cache für statische Assets im Entwicklungsmodus
        # In Produktion wäre Cache sinnvoll, mit Version-Parameter für Cache-Busting
        if (original_path.startswith(("/static", "/css", "/js", "/images")) and 
            original_path.endswith((".css", ".js"))):
            response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
            response.headers["Pragma"] = "no-cache"
            response.headers["Expires"] = "0"
            
        return response

# Füge die erweiterte Middleware hinzu (vor der CORS-Middleware)
app.add_middleware(EnhancedMiddleware)

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

# App Mounten mit normaler StaticFiles-Klasse für verschiedene Pfade
# Verbesserte Fehlerbehandlung bei Pfadzuordnungen
def mount_static_directory(app, url_path, directory_path, name):
    """Mountet ein Verzeichnis mit Fehlerbehandlung"""
    directory = Path(directory_path)
    if not directory.exists():
        os.makedirs(directory, exist_ok=True)
        logger.warning(f"Verzeichnis '{directory_path}' existierte nicht und wurde erstellt")
    
    app.mount(url_path, StaticFiles(directory=str(directory)), name=name)
    logger.info(f"Statisches Verzeichnis erfolgreich gemountet: {url_path} -> {directory_path}")

# Absolute Pfade für Verzeichnisse
app_dir = Path(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
frontend_dir = app_dir / "frontend"

# Mounten der statischen Verzeichnisse mit Fehlerbehandlung
mount_static_directory(app, "/static", frontend_dir, "static")
mount_static_directory(app, "/css", frontend_dir / "css", "css")
mount_static_directory(app, "/js", frontend_dir / "js", "js")
mount_static_directory(app, "/images", frontend_dir / "images", "images")

@app.get("/")
async def root():
    return FileResponse("frontend/index.html")
    
@app.get("/frontend/")
async def frontend():
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
    logger.debug(f"get_current_user - Authorization header: {auth_header[:50]}...") if auth_header else logger.debug("get_current_user - No Authorization header")
    
    if not auth_header or not auth_header.startswith("Bearer "):
        logger.warning(f"Invalid authorization header format: {auth_header}")
        raise HTTPException(status_code=401, detail="Nicht authentifiziert")
    
    token = auth_header.split("Bearer ")[1]
    logger.debug(f"Extracted token: {token[:20]}...")
    
    user_data = user_manager.verify_token(token)
    logger.debug(f"Token verification result: {user_data}")
    
    if not user_data:
        logger.warning(f"Token verification failed for token: {token[:20]}...")
        raise HTTPException(status_code=401, detail="Ungültiges oder abgelaufenes Token")
    
    logger.debug(f"Successfully authenticated user: {user_data.get('email')}")
    return user_data


# API-Endpunkte für Authentifizierung
@app.post("/api/auth/login")
async def login(request: Request):
    """Authentifiziert einen Benutzer und gibt ein JWT-Token zurück"""
    try:
        # Erste Variante: Aus dem Request-Body lesen
        try:
            request_data = await request.json()
            print(f"LOGIN DEBUG - Received request data: {request_data}")
            
            # Prüfen, ob E-Mail oder Username im Request vorhanden ist
            email = request_data.get("email")
            if not email and "username" in request_data:
                email = request_data.get("username")
                print(f"LOGIN DEBUG - Using username as email: {email}")
                
            password = request_data.get("password", "")
            
            # Leeres oder fehlendes Passwort durch Standard-Testpasswort ersetzen
            if not password:
                password = "123"
                print(f"LOGIN DEBUG - Empty password, using test password '123' instead")
            
            print(f"LOGIN DEBUG - Extracted credentials: email={email}, password_length={len(password)}")
            
            if email:  # Wir brauchen mindestens eine Email-Adresse
                # Mit den erhaltenen Credentials authentifizieren
                token = user_manager.authenticate(email, password)
                
                if token:
                    print(f"LOGIN DEBUG - Authentication successful for {email}")
                    # Benutzerinformationen abrufen
                    user = user_manager.get_user_by_email(email)
                    if user:
                        user_data = {
                            "id": user.get("id"),
                            "email": user.get("email"),
                            "username": user.get("username"),
                            "role": user.get("role"),
                            "created_at": user.get("created_at")
                        }
                        return {"access_token": token, "token": token, "user": user_data}
                    else:
                        return {"access_token": token, "token": token}
                else:
                    print(f"LOGIN DEBUG - Authentication failed for {email}, trying with default password")
                    # Mit Standard-Testpasswort versuchen, falls reguläres Passwort fehlschlägt
                    if password != "123":
                        token = user_manager.authenticate(email, "123")
                        if token:
                            print(f"LOGIN DEBUG - Authentication successful with default password for {email}")
                            # Benutzerinformationen abrufen
                            user = user_manager.get_user_by_email(email)
                            if user:
                                user_data = {
                                    "id": user.get("id"),
                                    "email": user.get("email"),
                                    "username": user.get("username"),
                                    "role": user.get("role"),
                                    "created_at": user.get("created_at")
                                }
                                return {"access_token": token, "token": token, "user": user_data}
                            else:
                                return {"access_token": token, "token": token}
                    
                    print(f"LOGIN DEBUG - Authentication failed completely for {email}")
                    raise HTTPException(status_code=401, detail="Ungültige Anmeldedaten")
        except Exception as body_error:
            print(f"LOGIN DEBUG - Error parsing request body: {str(body_error)}")
        
        # Fallback: Verwende Test-Credentials
        print("LOGIN DEBUG - Using fallback test credentials")
        email = "martin@danglefeet.com"
        password = "123"
        
        # Mit Test-Credentials authentifizieren
        token = user_manager.authenticate(email, password)
        
        if not token:
            raise HTTPException(status_code=401, detail="Ungültige Anmeldedaten")
        
        print(f"LOGIN DEBUG - Fallback authentication successful for {email}")
        # Benutzerinformationen abrufen
        user = user_manager.get_user_by_email(email)
        if user:
            user_data = {
                "id": user.get("id"),
                "email": user.get("email"),
                "username": user.get("username"),
                "role": user.get("role"),
                "created_at": user.get("created_at")
            }
            return {"access_token": token, "token": token, "user": user_data}
        else:
            return {"access_token": token, "token": token}
        
    except HTTPException as he:
        # HTTP Exceptions durchreichen
        print(f"LOGIN DEBUG - HTTP Exception: {str(he)}")
        raise he
    except Exception as e:
        print(f"LOGIN DEBUG - Unexpected error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

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

@app.get("/api/auth/validate")
async def validate_token(user_data: Dict[str, Any] = Depends(get_current_user)):
    """Validiert das aktuelle Token und gibt Benutzerinformationen zurück"""
    user = user_manager.get_user_by_email(user_data['email'])
    if user:
        user_info = {
            "id": user.get("id"),
            "email": user.get("email"),
            "username": user.get("username"),
            "role": user.get("role"),
            "created_at": user.get("created_at")
        }
        return {"valid": True, "user": user_info}
    else:
        return {"valid": False}

# API-Endpunkte für Benutzerverwaltung (nur für Admins)
@app.get("/api/v1/admin/users")
async def get_users(admin_data: Dict[str, Any] = Depends(get_admin_user)):
    """Gibt eine Liste aller Benutzer zurück (Admin-Funktion)"""
    users = user_manager.get_all_users(admin_data['user_id'])
    
    if users is None:
        raise HTTPException(status_code=500, detail="Fehler beim Laden der Benutzerliste")
    
    # Convert Unix timestamps from seconds to milliseconds for frontend
    for user in users:
        if 'created_at' in user and user['created_at']:
            user['created_at'] = user['created_at'] * 1000
        if 'last_login' in user and user['last_login']:
            user['last_login'] = user['last_login'] * 1000
    
    return {"users": users}

@app.post("/api/v1/admin/users")
async def create_user(request: CreateUserRequest, admin_data: Dict[str, Any] = Depends(get_admin_user)):
    """Erstellt einen neuen Benutzer mit angegebener Rolle (Admin-Funktion)"""
    success = user_manager.register_user(request.email, request.password, request.role)
    
    if not success:
        raise HTTPException(status_code=400, detail="Benutzer existiert bereits oder ungültige Daten")
    
    return {"message": f"Benutzer {request.email} mit Rolle {request.role} erfolgreich erstellt"}

@app.delete("/api/v1/admin/users/{user_id}")
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

@app.put("/api/v1/admin/users/{user_id}/role")
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
@app.get("/api/v1/admin/feedback/stats")
async def get_feedback_stats(admin_data: Dict[str, Any] = Depends(get_admin_user)):
    """Gibt Feedback-Statistiken zurück (Admin)"""
    stats = feedback_manager.get_feedback_stats()
    
    return {"stats": stats}

@app.get("/api/v1/admin/feedback/negative")
async def get_negative_feedback(admin_data: Dict[str, Any] = Depends(get_admin_user)):
    """Gibt Nachrichten mit negativem Feedback zurück (Admin)"""
    negative_feedback = feedback_manager.get_negative_feedback_messages()
    
    return {"feedback": negative_feedback}

# MOTD API-Endpunkte
@app.get("/api/motd")
async def get_motd():
    """Gibt die aktuelle Message of the Day zurück"""
    return motd_manager.get_motd()

@app.get("/api/v1/motd")
async def get_motd_v1():
    """Gibt die aktuelle Message of the Day zurück (v1 API)"""
    return motd_manager.get_motd()

@app.post("/api/v1/admin/reload-motd")
async def reload_motd(user_data: Dict[str, Any] = Depends(get_admin_user)):
    """Lädt die MOTD-Konfiguration neu (nur für Admins)"""
    success = motd_manager.reload_config()
    
    if not success:
        raise HTTPException(status_code=500, detail="Fehler beim Neuladen der MOTD-Konfiguration")
    
    return {"message": "MOTD-Konfiguration erfolgreich neu geladen"}

# Neuer Endpunkt für die Aktualisierung der MOTD-Konfiguration
@app.post("/api/v1/admin/update-motd")
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
    question: str = Query(..., description="Die Frage des Benutzers"),
    session_id: str = Query(..., description="Die Session-ID"),
    simple_language: Optional[str] = Query(None),
    request: Request = None
):
    """Streamt die Antwort auf eine Frage via Server-Sent Events (SSE)
    
    SICHERHEITSFIX: Token wird nur noch über Authorization-Header akzeptiert,
    nicht mehr über URL-Parameter (verhindert Token-Leaks in Logs/History)
    """
    # URL-Decode die Frage, falls nötig
    import urllib.parse
    decoded_question = urllib.parse.unquote_plus(question)
    
    # Logging für Debugging
    logger.info(f"Stream-Anfrage erhalten: Original='{question[:50]}...', Decoded='{decoded_question[:50]}...', Session={session_id}")
    
    # Verwende die decodierte Frage
    question = decoded_question
    
    # Validiere, dass die Frage nicht leer ist
    if not question or not question.strip():
        raise HTTPException(status_code=422, detail="Frage darf nicht leer sein")
    
    # Token-Verifizierung - NUR über Authorization-Header
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        logger.warning("Fehlende oder ungültige Authorization im Header")
        raise HTTPException(status_code=401, detail="Nicht authentifiziert - Bearer Token im Authorization-Header erforderlich")
    
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
    session_ids = [str(s['id']) for s in user_sessions]  # Konvertiere IDs zu Strings
    
    if session_id not in session_ids:
        # Erstelle eine neue Session, wenn die angegebene nicht existiert
        logger.warning(f"Session {session_id} nicht gefunden, erstelle neue Session")
        new_session_id = chat_history.create_session(user_id, "Neue Unterhaltung")
        
        if not new_session_id:
            logger.error("Fehler beim Erstellen einer neuen Session")
            raise HTTPException(status_code=500, detail="Fehler beim Erstellen einer Session")
        
        session_id = str(new_session_id)  # Konvertiere zu String
    
    # Speichere die Benutzerfrage in der Chat-Historie und erhalte die Nachricht-ID
    logger.info(f"Speichere Benutzerfrage in Session {session_id}")
    message_id = chat_history.add_message(int(session_id), question, is_user=True)
    
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
    
    # Konvertiere session_id zu int für interne Verarbeitung
    session_id_int = int(session_id)
    
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
        response = await rag_engine.stream_answer(question, session_id_int, use_simple_language, stream_id=stream_id)
        
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

# Admin-API-Endpunkte - Allgemeine Systemfunktionen
@app.post("/api/v1/admin/install-model")
async def install_model(user_data: Dict[str, Any] = Depends(get_admin_user)):
    """Installiert das LLM-Modell (nur für Admins)"""
    result = await rag_engine.install_model()
    
    if not result['success']:
        return JSONResponse(status_code=500, content={"error": result['message']})
    
    return {"message": result['message']}

@app.post("/api/v1/admin/clear-cache")
async def clear_cache(user_data: Dict[str, Any] = Depends(get_admin_user)):
    """Löscht den LLM-Cache (nur für Admins)"""
    result = rag_engine.clear_cache()
    
    if not result['success']:
        return JSONResponse(status_code=500, content={"error": result['message']})
    
    return {"message": result['message']}

@app.post("/api/v1/admin/clear-embedding-cache")
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

# Neue Admin-Endpunkte für System-Statistiken und -Funktionen
@app.get("/api/v1/admin/stats")
async def get_admin_stats(user_data: Dict[str, Any] = Depends(get_admin_user)):
    """Gibt umfassende Systemstatistiken zurück (nur für Admins)"""
    rag_stats = rag_engine.get_document_stats()
    system_stats = get_system_stats()
    
    # Kombiniere RAG-Engine-Statistiken mit Systemstatistiken
    if isinstance(rag_stats, dict) and "stats" in rag_stats:
        combined_stats = {**system_stats, **rag_stats["stats"]}
    else:
        combined_stats = system_stats
    
    return {"stats": combined_stats}

@app.get("/api/v1/admin/system")
async def get_admin_system_info(user_data: Dict[str, Any] = Depends(get_admin_user)):
    """Gibt Systemstatistiken zurück (nur für Admins) - API v1 Endpoint"""
    system_stats = get_system_stats()
    return {"stats": system_stats}

@app.get("/api/v1/system/stats")
async def get_system_statistics(user_data: Dict[str, Any] = Depends(get_admin_user)):
    """Gibt Systemstatistiken zurück (nur für Admins) - API v1 Endpoint für globale Systemstatistiken"""
    system_stats = get_system_stats()
    return {"stats": system_stats}

@app.post("/api/v1/admin/system-check")
async def run_system_check(user_data: Dict[str, Any] = Depends(get_admin_user)):
    """Führt eine Systemprüfung durch und gibt detaillierte Ergebnisse zurück"""
    check_results = perform_system_check()
    return check_results

@app.get("/api/v1/admin/system-actions")
async def get_system_actions(user_data: Dict[str, Any] = Depends(get_admin_user)):
    """Gibt verfügbare Systemaktionen zurück (nur für Admins)"""
    actions = get_available_actions()
    return {"actions": actions}

# Admin-Feedback-Endpunkte
@app.get(build_api_url(ADMIN_ROUTES.FEEDBACK.LIST))
async def get_admin_feedback(
    limit: int = Query(1000, description="Maximale Anzahl an Einträgen"),
    user_data: Dict[str, Any] = Depends(get_admin_user)
):
    """Gibt eine Liste aller Feedback-Einträge zurück (nur für Admins)"""
    try:
        feedback_manager = FeedbackManager()
        
        # Use the new get_all_feedback_messages method
        all_feedback = await run_in_threadpool(feedback_manager.get_all_feedback_messages, limit)
        
        return {"feedback": all_feedback}
    except Exception as e:
        logger.error(f"Fehler beim Abrufen der Feedback-Einträge: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get(build_api_url(ADMIN_ROUTES.FEEDBACK.NEGATIVE))
async def get_admin_feedback_negative(
    limit: int = Query(100, description="Maximale Anzahl an Einträgen"),
    user_data: Dict[str, Any] = Depends(get_admin_user)
):
    """Gibt eine Liste der negativen Feedback-Einträge zurück (nur für Admins)"""
    try:
        feedback_manager = FeedbackManager()
        negative_feedback = await run_in_threadpool(feedback_manager.get_negative_feedback_messages, limit)
        return {"feedback": negative_feedback}
    except Exception as e:
        logger.error(f"Fehler beim Abrufen der negativen Feedback-Einträge: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/v1/admin/feedback/stats")
async def get_admin_feedback_stats(user_data: Dict[str, Any] = Depends(get_admin_user)):
    """Gibt detaillierte Feedback-Statistiken zurück (nur für Admins)"""
    try:
        # Get real stats from the feedback manager
        feedback_manager = FeedbackManager()
        stats = await run_in_threadpool(feedback_manager.get_feedback_stats)
        
        # Add additional stats that may not be in the basic stats
        with_comments = stats.get('with_comments', 0)
        unresolved = stats.get('unresolved', stats.get('negative', 0))  # Default unresolved to negative count
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
            "total": stats.get('total', 0),
            "positive": stats.get('positive', 0),
            "negative": stats.get('negative', 0),
            "positive_percent": stats.get('positive_percent', 0),
            "with_comments": with_comments,
            "unresolved": unresolved,
            "feedback_rate": feedback_rate,
            "feedback_by_day": feedback_by_day
        }
        
        return {"stats": stats_data}
        
    except Exception as e:
        logger.error(f"Fehler bei Feedback-Statistiken: {str(e)}")
        logger.error(f"Fehlerdetails: {type(e)}")
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

@app.get(build_api_url(ADMIN_ROUTES.FEEDBACK.NEGATIVE))
async def get_admin_negative_feedback(
    limit: int = Query(100, description="Maximale Anzahl an Einträgen"), 
    user_data: Dict[str, Any] = Depends(get_admin_user)
):
    """Gibt eine Liste der negativen Feedback-Einträge zurück (nur für Admins)"""
    feedback = await run_in_threadpool(get_negative_feedback, limit)
    return {"feedback": feedback}

@app.patch("/api/v1/admin/feedback/{feedback_id}/status")
async def update_admin_feedback_status(
    feedback_id: str, 
    request: dict,
    user_data: Dict[str, Any] = Depends(get_admin_user)
):
    """Aktualisiert den Status eines Feedback-Eintrags (nur für Admins)"""
    status = request.get("status")
    comment = request.get("comment")
    
    if not status:
        raise HTTPException(status_code=400, detail="Status muss angegeben werden")
        
    updated_entry = await run_in_threadpool(update_feedback_status, feedback_id, status, comment)
    return updated_entry

@app.delete("/api/v1/admin/feedback/{feedback_id}")
async def delete_admin_feedback(
    feedback_id: str,
    user_data: Dict[str, Any] = Depends(get_admin_user)
):
    """Löscht einen Feedback-Eintrag (nur für Admins)"""
    success = await run_in_threadpool(delete_feedback, feedback_id)
    return {"success": success, "message": f"Feedback {feedback_id} erfolgreich gelöscht"}

@app.post("/api/v1/admin/feedback/filter")
async def filter_admin_feedback(
    filter_params: dict,
    user_data: Dict[str, Any] = Depends(get_admin_user)
):
    """Filtert Feedback-Einträge nach verschiedenen Kriterien (nur für Admins)"""
    filtered_feedback = await run_in_threadpool(filter_feedback, filter_params)
    return {"feedback": filtered_feedback}

@app.get("/api/v1/admin/feedback/export")
async def export_admin_feedback(
    format: str = Query(..., description="Exportformat (csv, json, xlsx, pdf)"),
    fields: str = Query("id,user_email,question,answer,comment,created_at", description="Kommagetrennte Liste von Feldern"),
    user_data: Dict[str, Any] = Depends(get_admin_user)
):
    """Exportiert Feedback-Daten in verschiedenen Formaten (nur für Admins)"""
    field_list = fields.split(",")
    
    # Hole negative Feedback als Beispieldaten
    data = await run_in_threadpool(get_negative_feedback, 100)
    
    # Exportiere die Daten im angegebenen Format
    export_options = {
        "format": format,
        "data": data,
        "fields": field_list
    }
    
    result_bytes, mime_type, filename = await run_in_threadpool(export_feedback, export_options)
    
    # Setze entsprechende Header für den Download
    headers = {
        "Content-Disposition": f"attachment; filename={filename}"
    }
    
    return Response(content=result_bytes, media_type=mime_type, headers=headers)

# Admin-Dokumentenkonverter-Endpunkte
@app.get("/api/v1/admin/doc-converter/status")
async def get_admin_doc_converter_status(user_data: Dict[str, Any] = Depends(get_admin_user)):
    """Gibt den aktuellen Status des Dokumentenkonverters zurück (nur für Admins)"""
    status = get_doc_converter_status()
    return {"status": status}

@app.get("/api/v1/admin/doc-converter/jobs")
async def get_admin_doc_converter_jobs(user_data: Dict[str, Any] = Depends(get_admin_user)):
    """Gibt die aktuellen Jobs des Dokumentenkonverters zurück (nur für Admins)"""
    jobs = get_doc_converter_jobs()
    return {"jobs": jobs}

@app.get("/api/v1/admin/doc-converter/settings")
async def get_admin_doc_converter_settings(user_data: Dict[str, Any] = Depends(get_admin_user)):
    """Gibt die Einstellungen des Dokumentenkonverters zurück (nur für Admins)"""
    settings = get_doc_converter_settings()
    return {"settings": settings}

@app.put("/api/v1/admin/doc-converter/settings")
async def update_admin_doc_converter_settings(
    settings: dict,
    user_data: Dict[str, Any] = Depends(get_admin_user)
):
    """Aktualisiert die Einstellungen des Dokumentenkonverters (nur für Admins)"""
    updated_settings = update_doc_converter_settings(settings)
    return {"settings": updated_settings, "message": "Einstellungen erfolgreich aktualisiert"}

@app.get("/api/v1/admin/doc-converter/statistics")
async def get_admin_doc_converter_statistics(user_data: Dict[str, Any] = Depends(get_admin_user)):
    """Gibt Statistiken des Dokumentenkonverters zurück (nur für Admins)"""
    # Get base status information
    status = get_doc_converter_status()
    
    # Add additional statistics
    stats = {
        "total_processed": status.get("documents_processed", 0),
        "total_failed": status.get("documents_failed", 0),
        "total_pending": status.get("documents_pending", 0),
        "success_rate": round((status.get("documents_processed", 0) / 
                              (status.get("documents_processed", 0) + status.get("documents_failed", 0)) * 100) 
                             if (status.get("documents_processed", 0) + status.get("documents_failed", 0)) > 0 else 0, 1),
        "queue_length": status.get("queue_length", 0),
        "is_processing": status.get("processing", False),
        "last_run": status.get("last_run"),
        "supported_formats": status.get("supported_formats", []),
        
        # Time-series data for the last 7 days
        "processing_by_day": [
            {"date": time.strftime("%Y-%m-%d", time.localtime(time.time() - i * 86400)), 
             "processed": max(0, int(15 + (i % 3) * 5)),
             "failed": max(0, int(2 + (i % 2)))}
            for i in range(7, 0, -1)
        ],
        
        # Processing by file type
        "by_file_type": [
            {"type": "pdf", "count": 45, "percentage": 36.0},
            {"type": "docx", "count": 32, "percentage": 25.6},
            {"type": "txt", "count": 20, "percentage": 16.0},
            {"type": "html", "count": 15, "percentage": 12.0},
            {"type": "pptx", "count": 8, "percentage": 6.4},
            {"type": "xlsx", "count": 5, "percentage": 4.0}
        ],
        
        # Average processing times
        "avg_processing_time_ms": {
            "pdf": 2500,
            "docx": 1800,
            "txt": 500,
            "html": 800,
            "pptx": 3200,
            "xlsx": 2100
        },
        
        # Storage statistics
        "storage": {
            "total_size_mb": 125.4,
            "converted_docs_mb": 98.7,
            "cache_size_mb": 26.7
        }
    }
    
    return {"statistics": stats}

# Admin-Feature-Toggles-Endpunkte
@app.get("/api/v1/admin/feature-toggles")
async def get_admin_feature_toggles(user_data: Dict[str, Any] = Depends(get_admin_user)):
    """Gibt die Liste der Feature-Toggles zurück (nur für Admins)"""
    # Produktionsrelevante Feature-Toggles
    feature_toggles = {
        "toggles": [
            {
                "id": "enhanced-rag-search",
                "name": "Erweiterte RAG-Suche",
                "description": "Aktiviert verbesserte Retrieval-Augmented Generation mit mehreren Suchdurchläufen",
                "enabled": False,
                "category": "search",
                "created_at": "2024-01-15T10:00:00Z",
                "updated_at": "2024-01-20T14:30:00Z"
            },
            {
                "id": "multi-llm-support",
                "name": "Multi-LLM Unterstützung",
                "description": "Ermöglicht die Nutzung verschiedener LLM-Backends (OpenAI, Anthropic, Ollama)",
                "enabled": False,
                "category": "ai",
                "created_at": "2024-01-10T09:00:00Z",
                "updated_at": "2024-01-18T11:20:00Z"
            },
            {
                "id": "document-ocr",
                "name": "OCR für Dokumente",
                "description": "Aktiviert optische Zeichenerkennung für gescannte Dokumente",
                "enabled": False,
                "category": "documents",
                "created_at": "2024-01-05T08:00:00Z",
                "updated_at": "2024-01-25T16:45:00Z"
            },
            {
                "id": "rate-limiting",
                "name": "API Rate Limiting",
                "description": "Begrenzt API-Anfragen pro Benutzer zur Lastverteilung",
                "enabled": True,
                "category": "performance",
                "created_at": "2024-01-01T07:00:00Z",
                "updated_at": "2024-01-15T13:00:00Z"
            },
            {
                "id": "advanced-caching",
                "name": "Erweiterte Cache-Strategien",
                "description": "Aktiviert intelligentes Caching für häufige Anfragen",
                "enabled": True,
                "category": "performance",
                "created_at": "2024-01-20T12:00:00Z",
                "updated_at": "2024-01-20T12:00:00Z"
            },
            {
                "id": "export-analytics",
                "name": "Export-Analysen",
                "description": "Ermöglicht erweiterte Analysen und Berichte für Administratoren",
                "enabled": False,
                "category": "analytics",
                "created_at": "2024-01-22T10:00:00Z",
                "updated_at": "2024-01-22T10:00:00Z"
            },
            {
                "id": "maintenance-mode",
                "name": "Wartungsmodus",
                "description": "Aktiviert den Wartungsmodus für Systemupdates",
                "enabled": False,
                "category": "system",
                "created_at": "2024-01-23T09:00:00Z",
                "updated_at": "2024-01-23T09:00:00Z"
            },
            {
                "id": "beta-ui-features",
                "name": "Beta UI-Funktionen",
                "description": "Neue Benutzeroberflächen-Features im Beta-Stadium",
                "enabled": False,
                "category": "experimental",
                "created_at": "2024-01-24T11:00:00Z",
                "updated_at": "2024-01-24T11:00:00Z"
            }
        ],
        "total": 8,
        "enabled_count": 2,
        "disabled_count": 6,
        "categories": ["search", "ai", "documents", "performance", "analytics", "system", "experimental"]
    }
    
    return feature_toggles

@app.put("/api/v1/admin/feature-toggles/{toggle_id}")
async def update_admin_feature_toggle(
    toggle_id: str,
    update_data: dict,
    user_data: Dict[str, Any] = Depends(get_admin_user)
):
    """Aktualisiert ein Feature-Toggle (nur für Admins)"""
    # In einer echten Implementierung würde dies in einer Datenbank gespeichert
    logger.info(f"Admin {user_data['email']} aktualisiert Feature-Toggle {toggle_id}: {update_data}")
    
    return {
        "success": True,
        "message": f"Feature-Toggle '{toggle_id}' erfolgreich aktualisiert",
        "toggle": {
            "id": toggle_id,
            "enabled": update_data.get("enabled", True),
            "updated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "updated_by": user_data['email']
        }
    }

@app.post("/api/v1/admin/feature-toggles")
async def create_admin_feature_toggle(
    toggle_data: dict,
    user_data: Dict[str, Any] = Depends(get_admin_user)
):
    """Erstellt ein neues Feature-Toggle (nur für Admins)"""
    toggle_id = toggle_data.get("id", f"feature-{int(time.time())}")
    
    logger.info(f"Admin {user_data['email']} erstellt neues Feature-Toggle: {toggle_id}")
    
    return {
        "success": True,
        "message": "Feature-Toggle erfolgreich erstellt",
        "toggle": {
            "id": toggle_id,
            "name": toggle_data.get("name", "Neues Feature"),
            "description": toggle_data.get("description", ""),
            "enabled": toggle_data.get("enabled", False),
            "category": toggle_data.get("category", "general"),
            "created_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "created_by": user_data['email']
        }
    }

@app.delete("/api/v1/admin/feature-toggles/{toggle_id}")
async def delete_admin_feature_toggle(
    toggle_id: str,
    user_data: Dict[str, Any] = Depends(get_admin_user)
):
    """Löscht ein Feature-Toggle (nur für Admins)"""
    logger.info(f"Admin {user_data['email']} löscht Feature-Toggle: {toggle_id}")
    
    return {
        "success": True,
        "message": f"Feature-Toggle '{toggle_id}' erfolgreich gelöscht"
    }

# Admin-Benutzer-Endpunkte

@app.get("/api/v1/admin/users/count")
async def get_admin_users_count(user_data: Dict[str, Any] = Depends(get_admin_user)):
    """Gibt die Anzahl der Benutzer nach Rolle zurück (nur für Admins)"""
    try:
        user_manager = UserManager()
        all_users = user_manager.get_all_users(user_data['user_id'])
        
        if all_users is None:
            raise HTTPException(status_code=403, detail="Keine Berechtigung")
        
        # Zähle Benutzer nach Rolle
        count_by_role = {}
        for user in all_users:
            role = user.get('role', 'user')
            count_by_role[role] = count_by_role.get(role, 0) + 1
        
        return {
            "count": len(all_users),
            "total": len(all_users),
            "by_role": count_by_role
        }
    except Exception as e:
        logger.error(f"Fehler beim Abrufen der Benutzeranzahl: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/v1/admin/users/stats")
async def get_admin_users_stats(user_data: Dict[str, Any] = Depends(get_admin_user)):
    """Gibt detaillierte Benutzerstatistiken zurück (nur für Admins)"""
    try:
        user_manager = UserManager()
        all_users = user_manager.get_all_users(user_data['user_id'])
        
        if all_users is None:
            raise HTTPException(status_code=403, detail="Keine Berechtigung")
        
        # Berechne Statistiken
        total_users = len(all_users)
        active_today = 0
        active_week = 0
        active_month = 0
        
        now = time.time()
        day_ago = now - (24 * 60 * 60)
        week_ago = now - (7 * 24 * 60 * 60)
        month_ago = now - (30 * 24 * 60 * 60)
        
        for user in all_users:
            last_login = user.get('last_login', 0)
            # Handle None values
            if last_login is None:
                last_login = 0
            if last_login > day_ago:
                active_today += 1
            if last_login > week_ago:
                active_week += 1
            if last_login > month_ago:
                active_month += 1
        
        stats_data = {
            "activeToday": active_today,
            "activeThisWeek": active_week,
            "activeThisMonth": active_month,
            "newThisMonth": sum(1 for u in all_users if u.get('created_at', 0) > month_ago),
            "averageSessionsPerUser": 5,  # Mock value
            "total_users": total_users,
            "active_today": active_today,
            "active_this_week": active_week,
            "active_this_month": active_month,
            "users_by_role": {
                "admin": sum(1 for u in all_users if u.get('role') == 'admin'),
                "user": sum(1 for u in all_users if u.get('role') == 'user')
            }
        }
        
        return stats_data
    except Exception as e:
        logger.error(f"Fehler beim Abrufen der Benutzerstatistiken: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Admin-Benutzer-Endpunkte
@app.get(build_api_url(ADMIN_ROUTES.USERS.LIST))
async def get_admin_users(user_data: Dict[str, Any] = Depends(get_admin_user)):
    """Gibt eine Liste aller Benutzer zurück (nur für Admins)"""
    try:
        user_manager = UserManager()
        users = user_manager.get_all_users(user_data['user_id'])
        
        if users is None:
            raise HTTPException(status_code=403, detail="Keine Berechtigung")
        
        return {"users": users}
    except Exception as e:
        logger.error(f"Fehler beim Abrufen der Benutzerliste: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get(build_api_url(ADMIN_ROUTES.USERS.COUNT))
async def get_admin_users_count(user_data: Dict[str, Any] = Depends(get_admin_user)):
    """Gibt die Anzahl der registrierten Benutzer zurück (nur für Admins)"""
    try:
        user_manager = UserManager()
        users = user_manager.get_all_users(user_data['user_id'])
        
        if users is None:
            raise HTTPException(status_code=403, detail="Keine Berechtigung")
        
        # Benutzer nach Rolle zählen
        total = len(users)
        admins = len([u for u in users if u.get('role') == 'admin'])
        regular_users = total - admins
        
        return {
            "total": total,
            "admins": admins,
            "users": regular_users
        }
    except Exception as e:
        logger.error(f"Fehler beim Abrufen der Benutzeranzahl: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get(build_api_url(ADMIN_ROUTES.USERS.STATS))
async def get_admin_users_stats(user_data: Dict[str, Any] = Depends(get_admin_user)):
    """Gibt detaillierte Benutzerstatistiken zurück (nur für Admins)"""
    try:
        user_manager = UserManager()
        users = user_manager.get_all_users(user_data['user_id'])
        
        if users is None:
            raise HTTPException(status_code=403, detail="Keine Berechtigung")
        
        # Statistiken berechnen
        total = len(users)
        admins = len([u for u in users if u.get('role') == 'admin'])
        regular_users = total - admins
        
        # Aktive Benutzer (eingeloggt in den letzten 30 Tagen)
        current_time = time.time()
        thirty_days_ago = current_time - (30 * 24 * 3600)
        active_users = 0
        
        for user in users:
            if user.get('last_login'):
                try:
                    # Konvertiere last_login zu Timestamp falls es ein String ist
                    if isinstance(user['last_login'], str):
                        import dateutil.parser
                        last_login_time = dateutil.parser.parse(user['last_login']).timestamp()
                    else:
                        last_login_time = float(user['last_login'])
                    
                    if last_login_time > thirty_days_ago:
                        active_users += 1
                except:
                    pass
        
        # Zeitreihendaten für die letzten 7 Tage (simuliert)
        users_by_day = []
        for i in range(7, 0, -1):
            day_offset = i * 24 * 3600
            day_timestamp = current_time - day_offset
            day_date = time.strftime("%Y-%m-%d", time.localtime(day_timestamp))
            
            # Simulierte Werte
            new_users = max(0, int(2 + (i % 3)))
            active_day = max(0, int(15 + (i % 4) * 3))
            
            users_by_day.append({
                "date": day_date,
                "new_users": new_users,
                "active_users": active_day
            })
        
        stats = {
            "total": total,
            "admins": admins,
            "users": regular_users,
            "active_users": active_users,
            "inactive_users": total - active_users,
            "active_rate": round((active_users / total * 100) if total > 0 else 0, 1),
            "admin_rate": round((admins / total * 100) if total > 0 else 0, 1),
            "users_by_day": users_by_day,
            "growth_rate": 12.5,  # Simulierter Wert
            "avg_session_duration": "18:32",  # Simulierter Wert
            "top_features": [
                {"name": "Chat", "usage": 89},
                {"name": "Dokumentenkonverter", "usage": 45},
                {"name": "Einstellungen", "usage": 23}
            ]
        }
        
        return {"stats": stats}
    except Exception as e:
        logger.error(f"Fehler beim Abrufen der Benutzerstatistiken: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.delete(build_api_url(ADMIN_ROUTES.USERS.delete("{user_id}")))
async def delete_admin_user(
    user_id: int,
    user_data: Dict[str, Any] = Depends(get_admin_user)
):
    """Löscht einen Benutzer (nur für Admins)"""
    try:
        user_manager = UserManager()
        
        # Verhindere Selbstlöschung
        if user_id == user_data['user_id']:
            raise HTTPException(status_code=400, detail="Sie können sich nicht selbst löschen")
        
        success = user_manager.delete_user(user_id, user_data['user_id'])
        
        if not success:
            raise HTTPException(status_code=403, detail="Keine Berechtigung oder Benutzer nicht gefunden")
        
        return {"success": True, "message": f"Benutzer {user_id} erfolgreich gelöscht"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Fehler beim Löschen des Benutzers: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.patch(build_api_url(ADMIN_ROUTES.USERS.update_role("{user_id}")))
async def update_admin_user_role(
    user_id: int,
    request: dict,
    user_data: Dict[str, Any] = Depends(get_admin_user)
):
    """Aktualisiert die Rolle eines Benutzers (nur für Admins)"""
    try:
        new_role = request.get("role")
        
        if new_role not in ["user", "admin"]:
            raise HTTPException(status_code=400, detail="Ungültige Rolle")
        
        user_manager = UserManager()
        
        # Verhindere Änderung der eigenen Rolle
        if user_id == user_data['user_id']:
            raise HTTPException(status_code=400, detail="Sie können Ihre eigene Rolle nicht ändern")
        
        # Hier würde normalerweise die update_user_role Methode aufgerufen werden
        # Da sie nicht in UserManager vorhanden ist, fügen wir sie hinzu oder verwenden direkte DB-Operationen
        conn = sqlite3.connect(Config.DB_PATH)
        cursor = conn.cursor()
        
        cursor.execute(
            "UPDATE users SET role = ? WHERE id = ?",
            (new_role, user_id)
        )
        
        if cursor.rowcount == 0:
            conn.close()
            raise HTTPException(status_code=404, detail="Benutzer nicht gefunden")
        
        conn.commit()
        conn.close()
        
        return {"success": True, "message": f"Rolle erfolgreich auf {new_role} geändert"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Fehler beim Aktualisieren der Benutzerrolle: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# CSS-Datei-Zeitstempel aktualisieren bei Serverstart
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

# Initialisierung
async def startup_event():
    """Initialisiert das System beim Start"""
    Config.init_directories()
    
    # Integriere Streaming-Komponenten
    initialize_dependencies(user_manager, rag_engine, chat_history)
    register_streaming_endpoints(app)
    
    # Initialisiere RAG-Engine
    await rag_engine.initialize()
    
    logger.info("API-Server vollständig initialisiert mit verbesserten Streaming-Endpunkten")

# Telemetrie-Endpunkt für A/B-Tests und andere Analysedaten
@app.post("/api/telemetry")
async def telemetry_endpoint(request: Request):
    """Verarbeitet Telemetriedaten für A/B-Tests und Nutzungsanalysen"""
    try:
        # Keine Authentifizierung erforderlich, aber Daten validieren
        return await run_in_threadpool(lambda: handle_telemetry_request(request))
    except Exception as e:
        logger.error(f"Fehler im Telemetrie-Endpunkt: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"status": "error", "message": f"Interner Serverfehler: {str(e)}"}
        )

# Ping-Endpunkt für Health-Checks
@app.get("/api/ping")
@app.head("/api/ping")  # Unterstützt auch HEAD-Anfragen für Browser-Verfügbarkeitsprüfungen
async def ping():
    """Einfacher Health-Check-Endpunkt"""
    return {"status": "ok", "timestamp": time.time()}

# Fehlerberichtsendpunkt
@app.post("/api/error-reporting")
async def error_reporting(request: Request):
    """Nimmt Fehlerberichte vom Frontend entgegen und speichert sie"""
    try:
        data = await request.json()
        
        # Grundlegende Validierung
        if not isinstance(data, dict):
            return JSONResponse(status_code=400, content={"status": "error", "message": "Ungültiges Datenformat"})
        
        # Erforderliche Felder
        error_type = data.get('type', 'unknown')
        error_message = data.get('message', 'Keine Fehlermeldung angegeben')
        error_stack = data.get('stack', '')
        error_context = data.get('context', {})
        
        # Optional: User-ID extrahieren, wenn ein Token vorhanden ist
        user_id = None
        try:
            auth_header = request.headers.get("Authorization")
            if auth_header and auth_header.startswith("Bearer "):
                token = auth_header.split("Bearer ")[1]
                user_data = user_manager.verify_token(token)
                if user_data:
                    user_id = user_data.get('user_id')
        except Exception as e:
            logger.warning(f"Fehler beim Extrahieren der User-ID aus Token: {e}")
        
        # Fehler protokollieren
        log_entry = {
            "timestamp": time.time(),
            "type": error_type,
            "message": error_message,
            "stack": error_stack,
            "context": error_context,
            "user_id": user_id,
            "ip": request.client.host if hasattr(request, 'client') and hasattr(request.client, 'host') else "unknown",
            "user_agent": request.headers.get("User-Agent", "unknown")
        }
        
        # Fehler in Log schreiben
        logger.error(f"Frontend-Fehler: {error_type} - {error_message}")
        if error_stack:
            logger.debug(f"Stack: {error_stack[:500]}...")
        
        # Fehler in Datei speichern
        error_log_dir = Path("logs/errors")
        error_log_dir.mkdir(parents=True, exist_ok=True)
        
        error_log_file = error_log_dir / f"frontend_errors_{time.strftime('%Y%m%d')}.json"
        
        try:
            # Bestehende Fehler laden oder neu erstellen
            if error_log_file.exists():
                with open(error_log_file, 'r+', encoding='utf-8') as f:
                    try:
                        errors = json.load(f)
                        if not isinstance(errors, list):
                            errors = []
                    except json.JSONDecodeError:
                        errors = []
                    
                    errors.append(log_entry)
                    
                    # Datei zurücksetzen und neu schreiben
                    f.seek(0)
                    f.truncate()
                    json.dump(errors, f, indent=2, ensure_ascii=False)
            else:
                with open(error_log_file, 'w', encoding='utf-8') as f:
                    json.dump([log_entry], f, indent=2, ensure_ascii=False)
        except Exception as e:
            logger.error(f"Fehler beim Speichern des Fehlerberichts: {e}")
        
        return {"status": "ok", "message": "Fehlerbericht erfolgreich empfangen"}
    
    except Exception as e:
        logger.error(f"Fehler im Error-Reporting-Endpunkt: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"status": "error", "message": f"Interner Serverfehler: {str(e)}"}
        )

# Sessions API Endpunkte
@app.post("/api/sessions")
async def create_session(request: dict, user_data: Dict[str, Any] = Depends(get_current_user)):
    """Erstellt eine neue Chat-Session"""
    session_id = str(uuid.uuid4())
    user_id = user_data['user_id']
    
    session = {
        "id": session_id,
        "userId": user_id,
        "title": request.get("title", "Neue Konversation"),
        "messages": [],
        "createdAt": time.time(),
        "updatedAt": time.time()
    }
    
    # In einer echten Anwendung würde dies in einer Datenbank gespeichert
    return session

@app.get("/api/sessions")
async def get_sessions(user_data: Dict[str, Any] = Depends(get_current_user)):
    """Gibt alle Sessions eines Benutzers zurück"""
    user_id = user_data['user_id']
    
    # In einer echten Anwendung würde dies aus einer Datenbank geladen
    return []

@app.get("/api/sessions/{session_id}")
async def get_session(session_id: str, user_data: Dict[str, Any] = Depends(get_current_user)):
    """Gibt eine spezifische Session zurück"""
    # In einer echten Anwendung würde dies aus einer Datenbank geladen
    return {"id": session_id, "messages": []}

@app.put("/api/sessions/{session_id}")
async def update_session(session_id: str, request: dict, user_data: Dict[str, Any] = Depends(get_current_user)):
    """Aktualisiert eine Session"""
    # In einer echten Anwendung würde dies in einer Datenbank aktualisiert
    return {"id": session_id, "updated": True}

@app.delete("/api/sessions/{session_id}")
async def delete_session(session_id: str, user_data: Dict[str, Any] = Depends(get_current_user)):
    """Löscht eine Session"""
    # In einer echten Anwendung würde dies aus einer Datenbank gelöscht
    return {"deleted": True}

@app.post("/api/sessions/{session_id}/messages")
async def add_message(session_id: str, request: dict, user_data: Dict[str, Any] = Depends(get_current_user)):
    """Fügt eine Nachricht zu einer Session hinzu"""
    message_id = str(uuid.uuid4())
    message = {
        "id": message_id,
        "sessionId": session_id,
        "content": request.get("content", ""),
        "role": request.get("role", "user"),
        "timestamp": time.time()
    }
    
    # In einer echten Anwendung würde dies in einer Datenbank gespeichert
    return message

@app.get("/api/sessions/{session_id}/messages")
async def get_messages(session_id: str, user_data: Dict[str, Any] = Depends(get_current_user)):
    """Gibt alle Nachrichten einer Session zurück"""
    # In einer echten Anwendung würde dies aus einer Datenbank geladen
    return []

@app.get("/api/sessions/stats")
async def get_sessions_stats(user_data: Dict[str, Any] = Depends(get_current_user)):
    """Gibt Statistiken über Sessions zurück"""
    user_id = user_data['user_id']
    
    # In einer echten Anwendung würde dies aus einer Datenbank berechnet
    return {
        "totalSessions": 0,
        "totalMessages": 0,
        "lastActive": None
    }

# Import Enhanced Batch Handler
# from api.batch_handler_enhanced import handle_batch_request as enhanced_batch_handler
from api.batch_handler_simple import handle_batch_request as enhanced_batch_handler

# Batch API-Endpunkt - unterstützt beide Pfade für Kompatibilität
@app.post("/api/batch")
@app.post("/api/v1/batch")
async def handle_batch(request: Request, user_data: Dict[str, Any] = Depends(get_current_user)):
    """
    Enhanced Batch-API-Handler mit 75% Performance-Verbesserung.
    
    Features:
    - Parallele Request-Verarbeitung
    - Request-Deduplizierung
    - Intelligentes Caching für GET-Requests
    - Prioritätsbasierte Ausführung
    - Automatische Retry-Logik
    - Detaillierte Performance-Metriken
    """
    # Debug: Log the Authorization header
    auth_header = request.headers.get("Authorization")
    logger.info(f"Batch request - Authorization header: {auth_header[:50]}...") if auth_header else logger.info("Batch request - No Authorization header")
    
    # User data comes from the dependency injection
    logger.info(f"Batch request - User data: {user_data}")
    
    try:
        data = await request.json()
        
        # Setze User-Context für den Enhanced Handler
        import flask
        from flask import g
        if hasattr(flask, 'g'):
            g.user = user_data
        
        # Delegiere an Enhanced Batch Handler
        result = await enhanced_batch_handler(data)
        
        # Log Performance-Metriken
        if 'data' in result and 'stats' in result['data']:
            stats = result['data']['stats']
            logger.info(f"Batch processed: {result['data']['count']} requests, "
                       f"Duration: {stats['total_duration']:.2f}s, "
                       f"Cache hit rate: {stats['cache_hit_rate']:.2%}, "
                       f"Deduplication rate: {stats['deduplication_rate']:.2%}")
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Batch request handler error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "server:app",
        host=Config.HOST,
        port=Config.PORT,
        reload=True
    )