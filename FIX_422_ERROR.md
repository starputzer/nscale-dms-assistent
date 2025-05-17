# Lösung für den 422 Fehler beim Streaming-Endpoint

## Problem
Der Fehler 422 (Unprocessable Entity) tritt auf, wenn die URL-Parameter nicht korrekt validiert werden können.

## Ursachen
1. Die Frage "afs sas fa" enthält Leerzeichen, die nicht richtig URL-encodiert sind
2. FastAPI kann die Parameter nicht korrekt parsen
3. Mögliche Token-Längenprobleme in der URL

## Lösungsvorschläge

### 1. Client-Seite anpassen
Stellen Sie sicher, dass die Frage richtig URL-encodiert wird:

```javascript
// Im Frontend (Vue/JavaScript)
const encodedQuestion = encodeURIComponent(question);
const url = `/api/question/stream?question=${encodedQuestion}&session_id=${sessionId}&token=${token}`;
```

### 2. Server-Seite verbessern
Fügen Sie bessere Parametervalidierung hinzu:

```python
from fastapi import Query
from urllib.parse import unquote_plus

@app.get("/api/question/stream")
async def stream_question(
    question: str = Query(..., description="Die Frage des Benutzers"),
    session_id: str = Query(..., description="Die Session-ID"), 
    simple_language: Optional[str] = Query(None),
    auth_token: Optional[str] = Query(None),
    request: Request = None
):
    # URL-decode die Frage
    decoded_question = unquote_plus(question)
    
    # Validierung
    if not decoded_question.strip():
        raise HTTPException(status_code=422, detail="Frage darf nicht leer sein")
```

### 3. Token im Header statt URL
Verschieben Sie das Token aus der URL in den Authorization-Header:

```javascript
// Frontend
const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
};

const url = `/api/question/stream?question=${encodedQuestion}&session_id=${sessionId}`;
```

### 4. Logging erweitern
Fügen Sie detaillierteres Logging hinzu:

```python
logger.info(f"Raw query params: {request.url.query}")
logger.info(f"Parsed params - question: '{question}', session_id: '{session_id}'")
```

## Sofortmaßnahmen

1. Überprüfen Sie das Frontend-Code, wo die API aufgerufen wird
2. Stellen Sie sicher, dass alle URL-Parameter richtig encodiert werden
3. Verwenden Sie den Authorization-Header für das Token
4. Fügen Sie Fehlerbehandlung für 422-Fehler im Frontend hinzu

## Test
Testen Sie mit einer einfachen Frage ohne Sonderzeichen:
```
/api/question/stream?question=test&session_id=123
```

Wenn das funktioniert, liegt das Problem beim URL-Encoding.