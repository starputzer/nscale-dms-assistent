"""
Consolidated Server Fixes

Diese Datei fasst alle Fixes für den Server zusammen. Da wir keine Berechtigungen haben,
die server_fix_implementation.py direkt zu überschreiben, stellen wir hier die wichtigsten
Änderungen bereit.
"""

# Verbesserte Session-ID-Behandlung für Batch-Handler
def improved_batch_handler(session_id, user_id, chat_history, logger):
    """Verbesserte Funktion zum Umgang mit verschiedenen Session-ID-Formaten im Batch-Handler"""
    try:
        # Versuche verschiedene Session-ID-Formate
        if isinstance(session_id, str) and session_id.isdigit():
            session_id_to_use = int(session_id)
        else:
            session_id_to_use = session_id
            
        # Prüfe, ob Session existiert
        sessions = chat_history.get_user_sessions(user_id)
        session_exists = False
        
        if sessions:
            for s in sessions:
                if str(s['id']) == str(session_id):
                    session_exists = True
                    break
        
        # Wenn Session nicht existiert, erstelle sie
        if not session_exists:
            logger.info(f"Session {session_id} nicht gefunden, erstelle neue für Benutzer {user_id}")
            try:
                if hasattr(chat_history, 'create_session_with_id'):
                    success = chat_history.create_session_with_id(session_id_to_use, user_id, "Neue Unterhaltung")
                    if success:
                        logger.info(f"Session mit ID {session_id} erfolgreich erstellt")
                    else:
                        # Verwende automatische ID
                        new_id = chat_history.create_session(user_id, "Neue Unterhaltung")
                        logger.info(f"Neue Session erstellt mit ID: {new_id}")
                else:
                    # Wenn create_session_with_id nicht verfügbar ist
                    new_id = chat_history.create_session(user_id, "Neue Unterhaltung")
                    logger.info(f"Neue Session erstellt mit ID: {new_id}")
            except Exception as e:
                logger.error(f"Fehler beim Erstellen der Session: {e}")
                # Ignoriere den Fehler und mache weiter
        
        # Hole Nachrichten
        try:
            messages = chat_history.get_session_history(session_id_to_use)
            return messages
        except Exception as e:
            logger.warning(f"Fehler beim Laden der Nachrichten für {session_id}: {e}")
            # Leere Liste als Fallback
            return []
            
    except Exception as e:
        logger.error(f"Allgemeiner Fehler in improved_batch_handler: {e}")
        return []


# Empfohlener Fix für server.py - API-Format-Korrektur für Batch-Handler
# Hier ist ein Beispiel für die verbesserte Batch-Handler-Implementierung
"""
@app.post("/api/batch")
@app.post("/api/v1/batch")
async def handle_batch(request: Request, user_data: Dict[str, Any] = Depends(get_current_user)):
    \"""
    Handler für Batch-API-Anfragen. Erlaubt die Ausführung mehrerer API-Requests in einem einzigen Call.
    
    Erwartet ein JSON-Objekt mit einem 'requests'-Array, das mehrere API-Anfragen enthält.
    Führt diese Anfragen parallel aus und gibt die Ergebnisse zurück.
    \"""
    # Debug: Log the Authorization header
    auth_header = request.headers.get("Authorization")
    logger.info(f"Batch request - Authorization header: {auth_header[:50]}...") if auth_header else logger.info("Batch request - No Authorization header")
    
    # Improved debugging
    logger.info(f"Batch request - User data: {user_data}")
    
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
"""