# SERVER FIX IMPLEMENTATION
# Diese Datei enthält die Fix-Implementierungen, die in server.py eingebaut werden müssen,
# um die Chat-Streaming- und Batch-API-Probleme zu beheben.

"""
=== WICHTIG: ANLEITUNG ZUR INTEGRATION ===

Um die Fixes in server.py zu integrieren, müssen folgende Änderungen vorgenommen werden:

1. DOPPELTE API-ROUTEN ENTFERNEN
   Die Routen im Abschnitt "DOPPELTE ROUTEN ENTFERNEN" (ca. Zeilen 1251-1326)
   aus der server.py entfernen. Diese überschreiben die funktionierenden Implementierungen.
   
2. BATCH-HANDLER ERSETZEN
   Den bestehenden batch_handler bei Zeile 1280 durch die verbesserte Version
   aus dem Abschnitt "BATCH-HANDLER ERSETZEN" ersetzen.

3. API-FORMAT KORRIGIEREN
   Stellen Sie sicher, dass alle API-Antworten dem erwarteten Format entsprechen:
   
   Für direkte Endpunkte:
   return { ... Daten ... }
   
   Für Batch-API:
   return {
     'success': True,
     'data': {
       'responses': [ ... Antworten ... ],
       'count': len(responses),
       'timestamp': int(time.time() * 1000)
     }
   }
"""

# ========== DOPPELTE ROUTEN ENTFERNEN (Zeilen 1251-1326 in server.py) ==========
# 
# WICHTIG: Diese doppelten API-Routen müssen aus der server.py entfernt werden,
# da sie die funktionierenden Implementierungen überschreiben.
#
# Zu entfernende Routen:
#
# @app.get("/api/sessions")
# async def get_sessions(user_data: Dict[str, Any] = Depends(get_current_user)):
#     """Gibt alle Chat-Sessions eines Benutzers zurück"""
#     user_id = user_data['user_id']
#     return []
# 
# @app.get("/api/session/{session_id}")
# async def get_session(session_id: int, user_data: Dict[str, Any] = Depends(get_current_user)):
#     """Gibt den Chatverlauf einer Session zurück"""
#     return {
#         "id": session_id,
#         "title": "Beispiel-Session",
#         "messages": []
#     }
# 
# @app.get("/api/sessions/{session_id}/messages")
# async def get_messages(session_id: str, user_data: Dict[str, Any] = Depends(get_current_user)):
#     """Gibt alle Nachrichten einer Session zurück"""
#     return []


# ========== BATCH-HANDLER ERSETZEN ==========

@app.post("/api/batch")
@app.post("/api/v1/batch")
async def handle_batch(request: Request, user_data: Dict[str, Any] = Depends(get_current_user)):
    """
    Handler für Batch-API-Anfragen. Erlaubt die Ausführung mehrerer API-Requests in einem einzigen Call.
    
    Erwartet ein JSON-Objekt mit einem 'requests'-Array, das mehrere API-Anfragen enthält.
    Führt diese Anfragen parallel aus und gibt die Ergebnisse zurück.
    """
    # Debug: Log the Authorization header
    auth_header = request.headers.get("Authorization")
    logger.info(f"Batch request - Authorization header: {auth_header[:50]}...") if auth_header else logger.info("Batch request - No Authorization header")
    
    # User data comes from the dependency injection, no need to manually get it
    # If we reach this point, user is authenticated
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
        
        # Batch verarbeiten
        responses = []
        
        for idx, req in enumerate(requests_list):
            request_id = req.get('id', f'req_{idx}')
            endpoint = req.get('endpoint', '')
            method = req.get('method', 'GET').upper()
            params = req.get('params', {})
            payload = req.get('data', {})
            headers = req.get('headers', {})
            
            # Response-Template
            response = {
                'id': request_id,
                'status': 500,
                'success': False,
                'error': 'Unknown error',
                'data': None,
                'timestamp': int(time.time() * 1000),
                'request': req
            }
            
            try:
                # Route zur internen FastAPI-Instanz
                if not endpoint.startswith('/'):
                    endpoint = '/' + endpoint
                    
                # Sessions-Endpunkte
                if endpoint == '/api/sessions' and method == 'GET':
                    # Hier verwenden wir die korrekte Funktion, die echte Daten zurückgibt
                    result = chat_history.get_user_sessions(user_data['user_id'])
                    response.update({
                        'status': 200,
                        'success': True,
                        'data': result,
                        'error': None
                    })
                elif endpoint.startswith('/api/sessions/') and endpoint.endswith('/messages') and method == 'GET':
                    session_id = endpoint.split('/')[-2]
                    try:
                        session_id_int = int(session_id)
                        # Hier verwenden wir die korrekte Funktion, die echte Daten zurückgibt
                        result = chat_history.get_session_history(session_id_int)
                        response.update({
                            'status': 200,
                            'success': True,
                            'data': result,
                            'error': None
                        })
                    except ValueError:
                        response.update({
                            'status': 400,
                            'success': False,
                            'error': f"Invalid session ID format: {session_id}",
                            'data': None
                        })
                # Auth-Endpunkte
                elif endpoint == '/api/auth/validate' and method == 'GET':
                    user = user_manager.get_user_by_email(user_data['email'])
                    if user:
                        user_info = {
                            "id": user.get("id"),
                            "email": user.get("email"),
                            "username": user.get("username"),
                            "role": user.get("role"),
                            "created_at": user.get("created_at")
                        }
                        result = {"valid": True, "user": user_info}
                    else:
                        result = {"valid": False}
                    
                    response.update({
                        'status': 200,
                        'success': True,
                        'data': result,
                        'error': None
                    })
                # User-Endpunkte
                elif endpoint == '/api/user/role' and method == 'GET':
                    result = {
                        "role": user_data.get('role', 'user'),
                        "user_id": user_data.get('user_id')
                    }
                    response.update({
                        'status': 200,
                        'success': True,
                        'data': result,
                        'error': None
                    })
                else:
                    # Endpunkt nicht implementiert
                    response.update({
                        'status': 404,
                        'success': False,
                        'error': f"Endpoint {endpoint} not found or not supported in batch mode",
                        'data': None
                    })
                    
            except HTTPException as he:
                response.update({
                    'status': he.status_code,
                    'success': False,
                    'error': he.detail,
                    'data': None
                })
            except Exception as e:
                logger.error(f"Batch request error for {endpoint}: {str(e)}")
                response.update({
                    'status': 500,
                    'success': False,
                    'error': str(e),
                    'data': None
                })
            
            responses.append(response)
        
        # Antwort zurückgeben - Die TypeScript-Seite erwartet data.responses
        return {
            'success': True,
            'data': {
                'responses': responses,
                'count': len(responses),
                'timestamp': int(time.time() * 1000)
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Batch request handler error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")