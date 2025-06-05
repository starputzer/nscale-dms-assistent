# API Endpoint Mismatch Report

## Summary

This report identifies mismatches between the API endpoints that the frontend is trying to call and what the backend actually implements. The main issue is that the frontend expects versioned endpoints under `/api/v1/` but the backend mostly implements endpoints under `/api/` without versioning.

## Critical Missing Endpoints

### 1. Chat Sessions Endpoints (404 ERROR)

**Frontend Expects:**
- `GET /api/v1/chat/sessions` - Get all sessions
- `POST /api/v1/chat/sessions` - Create new session  
- `GET /api/v1/chat/sessions/{id}` - Get single session
- `PATCH /api/v1/chat/sessions/{id}` - Update session
- `DELETE /api/v1/chat/sessions/{id}` - Delete session
- `GET /api/v1/chat/sessions/{id}/messages` - Get messages
- `GET /api/v1/chat/sessions/{id}/stream` - Stream messages

**Backend Implements:**
- `GET /api/sessions` - Get all sessions
- `POST /api/sessions` - Create new session (accepts frontend UUID)
- `GET /api/session/{session_id}` - Get single session (no 's' in session)
- `PUT /api/session/{session_id}/rename` - Rename session (different method)
- `DELETE /api/session/{session_id}` - Delete session (no 's' in session)
- `GET /api/sessions/{session_id}/messages` - Get messages
- No streaming endpoint for sessions

**Status:** ❌ **This is causing the 404 errors**

### 2. Streaming Endpoints

**Frontend Expects:**
- `GET /api/v1/chat/message/stream` - Stream chat response

**Backend Implements:**
- `GET /api/v1/question/stream` - Different endpoint name
- `GET /api/question/stream-backup` - Backup streaming endpoint

**Status:** ⚠️ Partially implemented with different naming

### 3. Authentication Endpoints

**Frontend Expects:**
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `POST /api/auth/refresh`
- `GET /api/auth/user`

**Backend Implements:**
- `POST /api/auth/login` ✅
- `POST /api/auth/logout` ✅
- `POST /api/v1/auth/refresh` (with version)
- `GET /api/user` (without /auth)

**Status:** ⚠️ Mostly implemented with slight path differences

### 4. Admin Endpoints

**Frontend Expects:**
- Various endpoints under `/api/v1/admin/`

**Backend Implements:**
- Mix of `/api/v1/admin/` and `/api/admin/` endpoints
- Some endpoints missing entirely

**Status:** ⚠️ Partially implemented

### 5. Advanced Documents Endpoints

**Frontend Component Calls:**
- `/api/advanced-documents/ocr-status`
- `/api/advanced-documents/processing-stats`
- `/api/advanced-documents/extraction-patterns`

**Backend Status:** ❓ Not found in server.py

## Root Cause Analysis

1. **Version Mismatch**: Frontend uses `/api/v1/` but backend uses `/api/` for many endpoints
2. **Path Inconsistency**: Frontend uses `chat/sessions` but backend uses just `sessions`
3. **Naming Differences**: Frontend expects plural forms (sessions) but backend sometimes uses singular (session)
4. **Missing Routes**: Some frontend endpoints have no backend implementation

## Recommended Fixes

### Option 1: Update Backend (Recommended)
Add the missing routes to server.py:

```python
# Add these routes to server.py

# Chat Sessions - Versioned API
@app.get("/api/v1/chat/sessions")
async def get_chat_sessions_v1(user_data: Dict[str, Any] = Depends(get_current_user)):
    # Redirect to existing implementation
    return await get_sessions(user_data)

@app.post("/api/v1/chat/sessions")
async def create_chat_session_v1(request: Dict[str, Any], user_data: Dict[str, Any] = Depends(get_current_user)):
    # Redirect to existing implementation
    return await create_session_from_frontend(request, user_data)

@app.get("/api/v1/chat/sessions/{session_id}")
async def get_chat_session_v1(session_id: str, user_data: Dict[str, Any] = Depends(get_current_user)):
    # Redirect to existing implementation
    return await get_session(session_id, user_data)

@app.patch("/api/v1/chat/sessions/{session_id}")
async def update_chat_session_v1(session_id: str, updates: Dict[str, Any], user_data: Dict[str, Any] = Depends(get_current_user)):
    # Implement session update logic
    pass

@app.delete("/api/v1/chat/sessions/{session_id}")
async def delete_chat_session_v1(session_id: str, user_data: Dict[str, Any] = Depends(get_current_user)):
    # Redirect to existing delete implementation
    return await delete_session(session_id, user_data)

@app.get("/api/v1/chat/sessions/{session_id}/messages")
async def get_chat_messages_v1(session_id: str, user_data: Dict[str, Any] = Depends(get_current_user)):
    # Redirect to existing implementation
    return await get_session_messages(session_id, user_data)

# Streaming endpoint
@app.get("/api/v1/chat/message/stream")
async def stream_chat_message_v1(
    question: str = Query(...),
    session_id: str = Query(...),
    token: Optional[str] = Query(None),
    request: Request = None
):
    # Redirect to existing streaming implementation
    # Use the existing stream_question logic
    pass
```

### Option 2: Update Frontend Config
Update `/opt/nscale-assist/app/src/services/api/config.ts`:

```typescript
CHAT: {
  SESSIONS: "/api/sessions",  // Remove v1 and chat
  SESSION: (id: string) => `/api/session/${id}`,  // Singular
  MESSAGES: (sessionId: string) => `/api/sessions/${sessionId}/messages`,
  MESSAGE: (sessionId: string, messageId: string) =>
    `/api/sessions/${sessionId}/messages/${messageId}`,
  STREAM: "/api/v1/question/stream",  // Use existing endpoint
},
```

### Option 3: Add API Version Routing
Implement a middleware to handle version routing and redirect `/api/v1/` calls to `/api/` endpoints.

## Immediate Fix for 404 Error

The quickest fix for the 404 error is to add these routes to server.py:

```python
# Quick fix - add aliases for the v1 endpoints
app.add_api_route("/api/v1/chat/sessions", get_sessions, methods=["GET"])
app.add_api_route("/api/v1/chat/sessions", create_session_from_frontend, methods=["POST"])
app.add_api_route("/api/v1/chat/sessions/{session_id}", get_session, methods=["GET"])
app.add_api_route("/api/v1/chat/sessions/{session_id}", delete_session, methods=["DELETE"])
app.add_api_route("/api/v1/chat/sessions/{session_id}/messages", get_session_messages, methods=["GET"])
```

## Testing Checklist

After implementing fixes:

1. ✅ Check that `GET /api/v1/chat/sessions` returns sessions list
2. ✅ Check that `POST /api/v1/chat/sessions` creates new session
3. ✅ Check that session messages load properly
4. ✅ Check that streaming works
5. ✅ Check that authentication flow works

## Priority Actions

1. **HIGH**: Fix `/api/v1/chat/sessions` endpoints - These are causing the 404 errors
2. **HIGH**: Fix streaming endpoint mismatch
3. **MEDIUM**: Standardize authentication endpoints
4. **LOW**: Clean up admin endpoint versioning