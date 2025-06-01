# Sofortige Lösung für den 422 Fehler

## Quick Fix

1. **Server-Seite**: Fügen Sie bessere Fehlerbehandlung hinzu
   
   In `/api/server.py`, ändern Sie den Stream-Endpoint:
   ```python
   @app.get("/api/question/stream")
   async def stream_question(
       question: str = Query(...),  # Explizite Query-Parameter
       session_id: str = Query(...),
       simple_language: Optional[str] = Query(None),
       auth_token: Optional[str] = Query(None),
       request: Request = None
   ):
       try:
           # Log raw parameters
           logger.info(f"Raw params - question: '{question}', session_id: '{session_id}'")
           
           # Decode question if needed
           import urllib.parse
           decoded_question = urllib.parse.unquote(question)
           logger.info(f"Decoded question: '{decoded_question}'")
           
           # Rest of the code...
       except Exception as e:
           logger.error(f"Parameter parsing error: {e}")
           raise HTTPException(status_code=422, detail=str(e))
   ```

2. **Client-Seite**: Token aus URL entfernen
   
   In `src/stores/sessions.ts`:
   ```typescript
   // Entfernen Sie diese Zeile:
   // params.append('token', authToken);
   
   // Verwenden Sie stattdessen den Authorization-Header
   // (EventSource unterstützt keine Header, also Alternative verwenden)
   ```

3. **Alternative: Server-seitiges Proxy-Endpoint**
   
   Erstellen Sie einen POST-Endpoint, der die Streaming-Anfrage weiterleitet:
   ```python
   @app.post("/api/question/stream-proxy")
   async def stream_proxy(
       request: StreamRequest,
       user_data: Dict[str, Any] = Depends(get_current_user)
   ):
       # Leitet zur GET-Methode weiter
       return await stream_question(
           question=request.question,
           session_id=str(request.session_id),
           simple_language=request.simple_language,
           auth_token=None,
           request=request
       )
   ```

## Soforttest

Testen Sie mit einem einfachen curl-Befehl:
```bash
curl "http://localhost:3000/api/question/stream?question=test&session_id=1"
```

Wenn das funktioniert, liegt das Problem beim Token oder der Frage-Encodierung.