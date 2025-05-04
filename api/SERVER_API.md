# Server API - Endpunkte und Funktionalität

## Übersicht

Die `server.py`-Datei ist das Herzstück der API des nscale DMS Assistent. Sie definiert alle API-Endpunkte für die Interaktion mit dem System, einschließlich Authentifizierung, Chat-Funktionen, Dokumentenverwaltung und Admin-Operationen. Die API ist mit FastAPI implementiert und nutzt moderne asynchrone Python-Funktionalität.

## API-Bereiche

### 1. Authentifizierung und Benutzerverwaltung

Diese Endpunkte behandeln den Benutzer-Login, die Registrierung und Passwort-Management:

| Endpunkt | Methode | Funktion | Beschreibung |
|----------|---------|----------|-------------|
| `/api/auth/login` | POST | `login` | Authentifiziert einen Benutzer und gibt ein JWT-Token zurück |
| `/api/auth/register` | POST | `register` | Registriert einen neuen Benutzer |
| `/api/auth/reset-password` | POST | `reset_password` | Initiiert den Passwort-Reset-Prozess |
| `/api/auth/set-password` | POST | `set_password` | Setzt das Passwort mit einem gültigen Token zurück |

### 2. Chat und Session Management

Diese Endpunkte verwalten Chat-Sessions und die Interaktion mit dem LLM:

| Endpunkt | Methode | Funktion | Beschreibung |
|----------|---------|----------|-------------|
| `/api/chat` | POST | `chat` | Sendet eine Nachricht an das LLM und gibt die Antwort zurück |
| `/api/sessions` | GET | `get_sessions` | Gibt alle Chat-Sessions des Benutzers zurück |
| `/api/sessions/{session_id}` | GET | `get_session` | Gibt Details einer bestimmten Session zurück |
| `/api/sessions` | POST | `create_session` | Erstellt eine neue Chat-Session |
| `/api/sessions/{session_id}` | DELETE | `delete_session` | Löscht eine bestimmte Session |
| `/api/sessions/{session_id}/rename` | POST | `rename_session` | Benennt eine Session um |

### 3. Admin-Bereich

Diese Endpunkte sind für Administratoren reserviert:

| Endpunkt | Methode | Funktion | Beschreibung |
|----------|---------|----------|-------------|
| `/api/admin/users` | GET | `get_users` | Gibt eine Liste aller Benutzer zurück |
| `/api/admin/users` | POST | `create_user` | Erstellt einen neuen Benutzer mit angegebener Rolle |
| `/api/admin/users/{user_id}` | DELETE | `delete_user` | Löscht einen Benutzer |
| `/api/admin/users/{user_id}/role` | PUT | `update_user_role` | Aktualisiert die Rolle eines Benutzers |
| `/api/admin/motd` | GET | `get_motd` | Gibt die aktuelle "Message of the Day" zurück |
| `/api/admin/motd` | POST | `set_motd` | Setzt eine neue "Message of the Day" |
| `/api/admin/feedback` | GET | `get_feedback` | Gibt Feedback zu Nachrichten zurück |

### 4. Dokumentenkonverter

Diese Endpunkte verwalten das Hochladen und Konvertieren von Dokumenten:

| Endpunkt | Methode | Funktion | Beschreibung |
|----------|---------|----------|-------------|
| `/api/admin/upload/document` | POST | `upload_document` | Lädt ein Dokument hoch und konvertiert es |
| `/api/converted/{file_path:path}` | GET | `get_converted_file` | Gibt eine konvertierte Datei zurück |

## Middleware und Abhängigkeiten

### Authentifizierungs-Middleware

```python
def get_current_user(token: str = Depends(oauth2_scheme)):
    """Überprüft das JWT-Token und gibt die Benutzerinformationen zurück"""
    payload = user_manager.verify_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Ungültiger oder abgelaufener Token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return payload
```

### Admin-Benutzer-Überprüfung

```python
def get_admin_user(current_user: dict = Depends(get_current_user)):
    """Stellt sicher, dass der aktuelle Benutzer ein Administrator ist"""
    if current_user.get('role') != 'admin':
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Zugriff verweigert. Admin-Berechtigung erforderlich."
        )
    return current_user
```

## CORS-Konfiguration

Die API unterstützt Cross-Origin Resource Sharing (CORS), um die Interaktion mit der Frontend-Anwendung zu ermöglichen:

```python
# CORS-Middleware hinzufügen
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In Produktion sollte dies eingeschränkt werden
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

## Statische Dateien

Der Server stellt auch statische Dateien für die Frontend-Anwendung bereit:

```python
# Statische Dateien bereitstellen
frontend_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "frontend")
app.mount("/static", StaticFiles(directory=frontend_path), name="static")

# Explizit den API static Ordner mounten
api_static_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "static")
if os.path.exists(api_static_path):
    app.mount("/api/static", StaticFiles(directory=api_static_path), name="api_static")
```

## Fehlerbehandlung

Die API verwendet FastAPI's integrierte Fehlerbehandlung mit HTTP-Statuscodes und detaillierten Fehlermeldungen:

```python
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request, exc):
    """Handler für Validierungsfehler"""
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content={"detail": str(exc)},
    )
```

## Datenmodelle

Die API verwendet Pydantic-Modelle für die Validierung von Anfragen und Antworten:

```python
class LoginRequest(BaseModel):
    """Modell für Login-Anfragen"""
    email: str
    password: str

class RegisterRequest(BaseModel):
    """Modell für Registrierungsanfragen"""
    email: str
    password: str

class CreateUserRequest(BaseModel):
    """Modell für Benutzerkreation durch Admins"""
    email: str
    password: str
    role: str = "user"
```

## Streaming-Support

Die API unterstützt Streaming-Antworten für die Chat-Funktionalität:

```python
@app.post("/api/chat")
async def chat(request: ChatRequest, current_user: dict = Depends(get_current_user)):
    """Chat-Endpunkt für die Kommunikation mit dem LLM"""
    if request.stream:
        # Streaming-Antwort zurückgeben
        return StreamingResponse(
            stream_response(request, current_user),
            media_type="text/event-stream"
        )
    else:
        # Normale Antwort zurückgeben
        response = await process_message(request, current_user)
        return response
```

## Event-Handler

Die API enthält Event-Handler für Anwendungsstart und -ende:

```python
@app.on_event("startup")
async def startup():
    """Wird beim Start der Anwendung ausgeführt"""
    # Initialisierung von Komponenten und Verbindungen

@app.on_event("shutdown")
async def shutdown():
    """Wird beim Herunterfahren der Anwendung ausgeführt"""
    # Aufräumen von Ressourcen und Verbindungen schließen
```

## Beispiel-Anfragen

### Login

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "benutzer@beispiel.de",
  "password": "sicheres-passwort"
}
```

### Nachricht senden

```http
POST /api/chat
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "session_id": 123,
  "message": "Wie kann ich ein Dokument konvertieren?",
  "stream": false
}
```

## Sicherheitsmaßnahmen

1. **JWT-Authentifizierung**: Alle geschützten Endpunkte erfordern ein gültiges JWT-Token
2. **Rollenbasierte Zugriffssteuerung**: Admin-Endpunkte sind nur für Benutzer mit der Rolle "admin" zugänglich
3. **Passwort-Hashing**: Passwörter werden niemals im Klartext übertragen oder gespeichert
4. **Rate-Limiting**: Die API implementiert ein grundlegendes Rate-Limiting, um Brute-Force-Angriffe zu verhindern

## Erweiterbarkeit

Die Server-API ist darauf ausgelegt, einfach erweitert werden zu können:

1. **Neue Endpunkte**: Weitere Funktionalität kann durch Hinzufügen neuer Endpunkte implementiert werden
2. **Middleware**: Zusätzliche Middleware-Komponenten können für spezifische Anforderungen hinzugefügt werden
3. **Validierungsmodelle**: Neue Pydantic-Modelle können für zusätzliche Datenstrukturen definiert werden

---

Aktualisiert: 04.05.2025