# Chat Streaming Fix: Integration Guide

This guide provides detailed steps for integrating the chat streaming fixes into your production environment. Follow these steps carefully to ensure a smooth deployment.

## Prerequisites

- Backup your current server implementation
- Schedule a maintenance window for the deployment
- Have rollback procedures ready

## Backend Integration

### Option 1: Complete Server Replacement (Recommended)

This is the cleanest approach and ensures all fixes are applied consistently.

1. **Create a backup of the current server.py**
   ```bash
   cp /path/to/your/api/server.py /path/to/your/api/server.py.backup-$(date +%Y%m%d%H%M%S)
   ```

2. **Copy the fixed server implementation**
   ```bash
   cp /opt/nscale-assist/worktrees/fix-chat-streaming/api/fixed_server.py /path/to/your/api/server.py
   ```

3. **Restart the server**
   ```bash
   # If using a process manager like systemd
   sudo systemctl restart your-api-service
   
   # Or if using other process managers
   pm2 restart your-api-process
   ```

### Option 2: Modular Integration

If you have customizations in your server.py that you need to preserve:

1. **Copy the supporting files**
   ```bash
   cp /opt/nscale-assist/worktrees/fix-chat-streaming/api/server_streaming_fix.py /path/to/your/api/
   cp /opt/nscale-assist/worktrees/fix-chat-streaming/api/batch_handler_fix.py /path/to/your/api/
   ```

2. **Update your server.py imports**
   Add these lines to your server.py:
   ```python
   from .batch_handler_fix import handle_batch_request
   from .server_streaming_fix import stream_question_fix
   ```

3. **Update the streaming endpoint**
   Replace the existing streaming endpoint implementation with:
   ```python
   @app.get("/api/question/stream")
   async def stream_question(
       question: str = Query(..., description="Die Frage des Benutzers"),
       session_id: str = Query(..., description="Die Session-ID"), 
       simple_language: Optional[bool] = Query(False, description="Einfache Sprache verwenden"),
       request: Request = None,
       user_data: Dict[str, Any] = Depends(get_current_user)
   ):
       """
       Verbesserter Streaming-Endpoint ohne Token in URL
       Authentifizierung erfolgt über Authorization-Header
       """
       return await stream_question_fix(
           question=question,
           session_id=session_id,
           simple_language=simple_language,
           request=request,
           user_data=user_data,
           chat_history=chat_history,
           rag_engine=rag_engine,
           logger=logger
       )
   ```

4. **Add the POST endpoint for sessions**
   Add this endpoint to your server.py:
   ```python
   @app.post("/api/sessions")
   async def create_session(request: Request, user_data: Dict[str, Any] = Depends(get_current_user)):
       """Erstellt eine neue Chat-Session"""
       user_id = user_data['user_id']
       
       try:
           # Request-Daten lesen
           data = await request.json()
           title = data.get("title", "Neue Unterhaltung")
           session_id = data.get("id")  # Client sendet möglicherweise eine ID
           
           # Wenn keine ID angegeben ist, erstelle eine neue Session
           if not session_id:
               session_id = chat_history.create_session(user_id, title)
               logger.info(f"Neue Session erstellt mit ID: {session_id}")
           else:
               # Wenn die ID angegeben ist, prüfe ob sie ein gültiges Format hat
               try:
                   if isinstance(session_id, str) and session_id.isdigit():
                       session_id = int(session_id)
               except (ValueError, TypeError):
                   # Bei Fehler die ID unverändert lassen (könnte eine UUID sein)
                   pass
               
               # Versuche die Session mit der angegebenen ID zu erstellen
               try:
                   if hasattr(chat_history, 'create_session_with_id'):
                       success = chat_history.create_session_with_id(session_id, user_id, title)
                       if not success:
                           # Fallback zu neuer Session
                           session_id = chat_history.create_session(user_id, title)
                   else:
                       # Methode nicht unterstützt, erstelle neue Session
                       session_id = chat_history.create_session(user_id, title)
               except Exception as e:
                   logger.warning(f"Fehler beim Erstellen einer Session mit ID {session_id}: {e}")
                   session_id = chat_history.create_session(user_id, title)
           
           if not session_id:
               raise HTTPException(status_code=500, detail="Fehler beim Erstellen einer Session")
           
           # Hole die Session-Details
           user_sessions = chat_history.get_user_sessions(user_id)
           session_details = next((s for s in user_sessions if str(s['id']) == str(session_id)), None)
           
           if not session_details:
               # Fallback: Minimales Objekt zurückgeben
               session_details = {
                   "id": session_id,
                   "title": title,
                   "userId": user_id,
                   "createdAt": datetime.now().isoformat(),
                   "updatedAt": datetime.now().isoformat(),
               }
           
           return session_details
       except Exception as e:
           logger.error(f"Fehler beim Erstellen einer Session: {str(e)}")
           raise HTTPException(status_code=500, detail=f"Interner Serverfehler: {str(e)}")
   ```

5. **Update the batch endpoint**
   Replace the batch endpoint implementation with:
   ```python
   @app.post("/api/batch")
   @app.post("/api/v1/batch")
   async def handle_batch(request: Request, user_data: Dict[str, Any] = Depends(get_current_user)):
       """
       Handler für Batch-API-Anfragen. Erlaubt die Ausführung mehrerer API-Requests in einem einzigen Call.
       
       Erwartet ein JSON-Objekt mit einem 'requests'-Array, das mehrere API-Anfragen enthält.
       Führt diese Anfragen parallel aus und gibt die Ergebnisse zurück.
       """
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
   ```

6. **Restart the server**
   ```bash
   # If using a process manager like systemd
   sudo systemctl restart your-api-service
   
   # Or if using other process managers
   pm2 restart your-api-process
   ```

## Frontend Integration

1. **Copy the streaming service**
   ```bash
   cp /opt/nscale-assist/worktrees/fix-chat-streaming/src/services/streamingService.ts /path/to/your/frontend/src/services/
   ```

2. **Copy the sessions response fix**
   ```bash
   cp /opt/nscale-assist/worktrees/fix-chat-streaming/src/stores/sessionsResponseFix.ts /path/to/your/frontend/src/stores/
   ```

3. **Update the sessions store**
   Either:
   - Copy the fixed sessions store entirely:
     ```bash
     cp /opt/nscale-assist/worktrees/fix-chat-streaming/src/stores/sessions.ts /path/to/your/frontend/src/stores/
     ```
   - Or manually add the imports at the beginning of your existing sessions store:
     ```typescript
     import { 
       processBatchResponse, 
       extractBatchResponseData, 
       validateSessionsResponse, 
       validateMessagesResponse 
     } from './sessionsResponseFix';
     import { streamingService } from '@/services/streamingService';
     ```

4. **Rebuild the frontend**
   ```bash
   # Navigate to your frontend directory
   cd /path/to/your/frontend
   
   # Run the build process
   npm run build
   # or
   yarn build
   ```

5. **Deploy the updated frontend**
   Deployment steps depend on your specific setup.

## Verification

After deployment, run the verification tests to ensure everything is working correctly:

1. **Run the verification script**
   ```bash
   # Edit the script first to update API_BASE_URL and AUTH_TOKEN
   node /opt/nscale-assist/worktrees/fix-chat-streaming/test-chat-streaming-verification.js
   ```

   NOTE: If you encounter ES module issues, you might need to update the script:
   ```bash
   # Convert to ES modules format
   sed -i 's/const fetch = require("node-fetch")/import fetch from "node-fetch"/g' test-chat-streaming-verification.js
   sed -i 's/const AbortController = require("abort-controller")/import { AbortController } from "abort-controller"/g' test-chat-streaming-verification.js
   ```

2. **Manual verification steps**
   - Create a new session via the UI
   - Send a message and verify streaming works correctly
   - Refresh the page and verify that messages load correctly
   - Test batch operations by navigating between sessions

## Rollback Procedure

If issues are encountered, follow these steps to roll back:

### Backend Rollback

```bash
# Restore the original server.py
cp /path/to/your/api/server.py.backup-TIMESTAMP /path/to/your/api/server.py

# Restart the server
sudo systemctl restart your-api-service
# or
pm2 restart your-api-process
```

### Frontend Rollback

```bash
# Deploy the previous frontend version
# This depends on your deployment setup
```

## Troubleshooting

### Common Issues

1. **405 Method Not Allowed still occurring**
   - Check that the POST endpoint for /api/sessions is properly implemented
   - Verify your reverse proxy or load balancer configuration is forwarding POST requests correctly

2. **Streaming not working**
   - Check browser console for CORS errors
   - Verify that authentication tokens are being sent correctly
   - Check server logs for errors during stream initialization

3. **Batch API errors**
   - Verify that the batch handler is correctly importing and using handle_batch_request
   - Check request format in network tab of developer tools

4. **"Failed to execute 'clone' on 'Response'" error**
   - Ensure you've updated the streamingService.ts to remove the problematic Response.clone() calls
   - Verify that the fallback mechanism doesn't rely on cloning the Response object
   - Check if there are other instances of Response.clone() in your codebase that might be causing issues

5. **422 Unprocessable Entity errors**
   - Ensure the batch_handler_fix.py is correctly normalizing session IDs to string format
   - Check that your server is handling both numeric and UUID session ID formats
   - Verify that session ID validation is working properly in stream_question_fix

### Getting Support

If you encounter issues that cannot be resolved using this guide, please:

1. Collect server logs during the error
2. Capture browser console output
3. Save network request/response data
4. Open an issue in the project repository with these details

## Conclusion

This integration should resolve the chat streaming issues by properly handling session creation, message retrieval, and streaming functionality. The changes improve error handling and make the system more robust against different types of session IDs and error conditions.