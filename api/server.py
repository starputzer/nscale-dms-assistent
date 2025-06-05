"""
Clean FastAPI Server with Modular Endpoint Management
"""

import os
import sys
from pathlib import Path
from contextlib import asynccontextmanager
from datetime import datetime
import logging

from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from typing import Optional, Dict, Any

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

# Import core modules
from modules.core.logging import LogManager
from modules.core.config import Config
from modules.core.db import DBManager

# Import endpoint management
from api.core.endpoint_manager import EndpointManager

# Initialize logging
logger = LogManager.setup_logging(__name__)

# Initialize database
db_manager = DBManager()

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager"""
    logger.info("=" * 60)
    logger.info("Starting nscale Assist API Server (Clean Version)")
    logger.info(f"Time: {datetime.now()}")
    logger.info("=" * 60)
    
    # Load all endpoints
    endpoint_manager = EndpointManager(app)
    endpoint_manager.load_all_endpoints()
    endpoint_manager.add_management_endpoints()
    
    logger.info("Server is ready!")
    
    yield
    
    # Cleanup
    logger.info("Shutting down server...")

# Create FastAPI app
app = FastAPI(
    title="nscale Assist API",
    description="AI-powered document management assistant for nscale",
    version="2.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"]
)

# Mount static files AFTER all API routes are registered
# This will be done at the end of the file

# Core routes that should always be available
@app.get("/api/health")
@app.head("/api/health")
async def health_check():
    """Basic health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "version": "2.0.0"
    }

@app.get("/api/status")
async def status():
    """Detailed status endpoint"""
    try:
        # Check database
        db_status = "healthy"
        try:
            with db_manager.get_session() as session:
                session.execute("SELECT 1")
        except:
            db_status = "unhealthy"
        
        return {
            "status": "operational",
            "timestamp": datetime.now().isoformat(),
            "components": {
                "api": "healthy",
                "database": db_status,
                "endpoints": "loaded"  # Will be detailed by endpoint manager
            }
        }
    except Exception as e:
        logger.error(f"Status check error: {e}")
        return JSONResponse(
            status_code=500,
            content={"status": "error", "message": str(e)}
        )

# Test endpoint to verify routing works
@app.post("/api/auth/test")
async def test_auth():
    return {"message": "Test endpoint works"}

# Import and register core authentication endpoints
try:
    from modules.auth.auth_routes import router as auth_router
    app.include_router(auth_router, prefix="/api/auth", tags=["Authentication"])
    logger.info("✓ Registered core authentication routes")
except ImportError as e:
    logger.error(f"✗ Failed to load authentication routes: {e}")

# Import and register core session endpoints  
try:
    from modules.sessions.session_routes import router as session_router
    app.include_router(session_router, prefix="/api", tags=["Sessions"])
    logger.info("✓ Registered core session routes")
except ImportError as e:
    logger.error(f"✗ Failed to load session routes: {e}")

# Import and register core chat endpoints
try:
    from modules.chat.chat_routes import router as chat_router
    app.include_router(chat_router, prefix="/api", tags=["Chat"])
    logger.info("✓ Registered core chat routes")
except ImportError as e:
    logger.error(f"✗ Failed to load chat routes: {e}")

# Add route aliases for backwards compatibility
@app.get("/api/chat/sessions")
async def get_chat_sessions(
    request: Request,
    since: Optional[int] = None
):
    """Backwards compatible endpoint for /api/chat/sessions"""
    try:
        # Import dependencies
        from modules.sessions.session_manager import SessionManager
        from modules.core.config import Config
        from jose import jwt, JWTError
        
        # Get authorization header
        authorization = request.headers.get("Authorization")
        if not authorization or not authorization.startswith("Bearer "):
            raise HTTPException(status_code=401, detail="Not authenticated")
        
        # Extract token
        token = authorization.replace("Bearer ", "")
        
        try:
            # Decode token directly
            payload = jwt.decode(token, Config.SECRET_KEY, algorithms=['HS256'])
            user_id = payload.get('user_id')
            
            if not user_id:
                raise HTTPException(status_code=401, detail="Invalid token")
                
        except JWTError:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        # Get sessions
        session_manager = SessionManager()
        sessions = session_manager.get_user_sessions(user_id, since)
        
        # Format response
        formatted_sessions = []
        for session in sessions:
            formatted_sessions.append({
                "id": session.get("id"),
                "title": session.get("title", "Untitled Session"),
                "created_at": session.get("created_at"),
                "updated_at": session.get("updated_at"),
                "message_count": session.get("message_count", 0)
            })
        
        return formatted_sessions
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in chat/sessions endpoint: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

# Add POST /api/chat/sessions endpoint
@app.post("/api/chat/sessions")
async def create_chat_session(
    request: Request
):
    """Create a new chat session"""
    try:
        from modules.sessions.session_manager import SessionManager
        from modules.core.config import Config
        from jose import jwt, JWTError
        import uuid
        
        # Get authorization header
        authorization = request.headers.get("Authorization")
        if not authorization or not authorization.startswith("Bearer "):
            raise HTTPException(status_code=401, detail="Not authenticated")
        
        # Extract token and decode
        token = authorization.replace("Bearer ", "")
        
        try:
            payload = jwt.decode(token, Config.SECRET_KEY, algorithms=['HS256'])
            user_id = payload.get('user_id')
            
            if not user_id:
                raise HTTPException(status_code=401, detail="Invalid token")
                
        except JWTError:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        # Create new session
        session_manager = SessionManager()
        session_id = str(uuid.uuid4())
        session = session_manager.create_session(
            session_id=session_id,
            user_id=user_id,
            title="New Session"
        )
        
        if not session:
            raise HTTPException(status_code=500, detail="Failed to create session")
        
        return {
            "id": session["id"],
            "title": session["title"],
            "created_at": session["created_at"],
            "message_count": 0
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating chat session: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

# Add DELETE /api/chat/sessions/{session_id} endpoint
@app.delete("/api/chat/sessions/{session_id}")
async def delete_chat_session(
    session_id: str,
    request: Request
):
    """Delete a chat session"""
    try:
        from modules.sessions.session_manager import SessionManager
        from modules.core.config import Config
        from jose import jwt, JWTError
        
        # Get authorization header
        authorization = request.headers.get("Authorization")
        if not authorization or not authorization.startswith("Bearer "):
            raise HTTPException(status_code=401, detail="Not authenticated")
        
        # Extract token and decode
        token = authorization.replace("Bearer ", "")
        
        try:
            payload = jwt.decode(token, Config.SECRET_KEY, algorithms=['HS256'])
            user_id = payload.get('user_id')
            
            if not user_id:
                raise HTTPException(status_code=401, detail="Invalid token")
                
        except JWTError:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        # Delete session
        session_manager = SessionManager()
        success = session_manager.delete_session(session_id, str(user_id))
        
        if not success:
            raise HTTPException(status_code=404, detail="Session not found or access denied")
        
        return {"success": True, "message": "Session deleted"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting session: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

# This endpoint is already defined in chat_routes as /api/messages/{session_id}
# Keep this as an alias for backwards compatibility
@app.get("/api/chat/sessions/{session_id}/messages")
async def get_chat_session_messages(
    session_id: str,
    request: Request,
    limit: int = 50
):
    """Get messages for a specific chat session"""
    try:
        from modules.sessions.session_manager import SessionManager
        from modules.chat.chat_history_manager import ChatHistoryManager
        from modules.core.config import Config
        from jose import jwt, JWTError
        
        # Get authorization header
        authorization = request.headers.get("Authorization")
        if not authorization or not authorization.startswith("Bearer "):
            raise HTTPException(status_code=401, detail="Not authenticated")
        
        # Extract token and decode
        token = authorization.replace("Bearer ", "")
        
        try:
            payload = jwt.decode(token, Config.SECRET_KEY, algorithms=['HS256'])
            user_id = payload.get('user_id')
            
            if not user_id:
                raise HTTPException(status_code=401, detail="Invalid token")
                
        except JWTError:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        # Validate session belongs to user
        session_manager = SessionManager()
        session = session_manager.get_session(session_id, str(user_id))
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Get messages
        chat_history_manager = ChatHistoryManager()
        messages = chat_history_manager.get_session_messages(session_id, limit)
        
        return {
            "messages": messages,
            "total": len(messages)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting session messages: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

# Add error reporting endpoint
@app.post("/api/error-reporting")
async def report_error(
    request: Request,
    error_data: Dict[str, Any]
):
    """Endpoint for frontend error reporting"""
    try:
        logger.warning(f"Frontend error reported: {error_data}")
        return {"success": True, "message": "Error reported"}
    except Exception as e:
        logger.error(f"Error in error reporting: {e}")
        return {"success": False, "message": str(e)}

# Add chat message streaming endpoint
@app.get("/api/chat/message/stream")
async def stream_chat_message(
    question: str,
    session_id: str,
    request: Request
):
    """Stream chat response using Server-Sent Events"""
    try:
        from modules.sessions.session_manager import SessionManager
        from modules.chat.chat_history_manager import ChatHistoryManager
        from modules.llm.llm_service import LLMService
        from modules.core.config import Config
        from jose import jwt, JWTError
        import json
        import asyncio
        
        # Get authorization
        authorization = request.headers.get("Authorization")
        if not authorization or not authorization.startswith("Bearer "):
            raise HTTPException(status_code=401, detail="Not authenticated")
        
        # Extract token and decode
        token = authorization.replace("Bearer ", "")
        
        try:
            payload = jwt.decode(token, Config.SECRET_KEY, algorithms=['HS256'])
            user_id = payload.get('user_id')
            
            if not user_id:
                raise HTTPException(status_code=401, detail="Invalid token")
                
        except JWTError:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        # Verify session belongs to user
        session_manager = SessionManager()
        session = session_manager.get_session(session_id, str(user_id))
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        async def generate():
            try:
                # Save user message
                chat_history_manager = ChatHistoryManager()
                user_msg_id = chat_history_manager.add_message(
                    session_id=session_id,
                    user_id=str(user_id),
                    role="user",
                    content=question
                )
                
                # Get chat history
                history = chat_history_manager.get_session_messages(session_id, limit=10)
                
                # Prepare messages for LLM
                messages = []
                for msg in history[:-1]:  # Exclude the just-added message
                    messages.append({
                        "role": msg["role"],
                        "content": msg["content"]
                    })
                messages.append({"role": "user", "content": question})
                
                # Stream response from LLM
                llm_service = LLMService()
                assistant_content = ""
                
                async for chunk in llm_service.stream_chat(messages):
                    if chunk["type"] == "content":
                        assistant_content += chunk["content"]
                        yield f"data: {json.dumps(chunk)}\n\n"
                    elif chunk["type"] == "done":
                        # Save assistant message
                        assistant_msg_id = chat_history_manager.add_message(
                            session_id=session_id,
                            role="assistant",
                            content=assistant_content,
                            user_id=str(user_id),
                            model=chunk.get("model")
                        )
                        
                        # Send completion event
                        yield f"data: {json.dumps({'type': 'done', 'messageId': assistant_msg_id})}\n\n"
                        break
                
                # Update session activity
                session_manager.update_session_activity(session_id)
                
            except Exception as e:
                logger.error(f"Error in chat stream: {e}")
                yield f"data: {json.dumps({'type': 'error', 'error': str(e)})}\n\n"
        
        return StreamingResponse(
            generate(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no"
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in chat message stream: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

# Add regular chat message endpoint (non-streaming)
@app.post("/api/chat/message")
async def send_chat_message(
    request: Request
):
    """Send chat message (non-streaming fallback)"""
    try:
        from modules.sessions.session_manager import SessionManager
        from modules.chat.chat_history_manager import ChatHistoryManager
        from modules.llm.llm_service import LLMService
        from modules.core.config import Config
        from jose import jwt, JWTError
        
        # Get authorization
        authorization = request.headers.get("Authorization")
        if not authorization or not authorization.startswith("Bearer "):
            raise HTTPException(status_code=401, detail="Not authenticated")
        
        # Extract token and decode
        token = authorization.replace("Bearer ", "")
        
        try:
            payload = jwt.decode(token, Config.SECRET_KEY, algorithms=['HS256'])
            user_id = payload.get('user_id')
            
            if not user_id:
                raise HTTPException(status_code=401, detail="Invalid token")
                
        except JWTError:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        # Get request body
        body = await request.json()
        message = body.get("message", "")
        session_id = body.get("sessionId", "")
        model = body.get("model", "llama3:8b-instruct-q4_1")
        
        # Verify session
        session_manager = SessionManager()
        session = session_manager.get_session(session_id, str(user_id))
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Save user message
        chat_history_manager = ChatHistoryManager()
        user_msg_id = chat_history_manager.add_message(
            session_id=session_id,
            user_id=str(user_id),
            role="user",
            content=message
        )
        
        # Get chat history
        history = chat_history_manager.get_session_messages(session_id, limit=10)
        
        # Prepare messages for LLM
        messages = []
        for msg in history[:-1]:
            messages.append({
                "role": msg["role"],
                "content": msg["content"]
            })
        messages.append({"role": "user", "content": message})
        
        # Get response from LLM
        llm_service = LLMService()
        response = await llm_service.chat(messages, model)
        
        # Save assistant message
        assistant_msg_id = chat_history_manager.add_message(
            session_id=session_id,
            role="assistant",
            content=response["content"],
            user_id=str(user_id),
            model=model
        )
        
        # Update session activity
        session_manager.update_session_activity(session_id)
        
        return {
            "success": True,
            "messageId": assistant_msg_id,
            "content": response["content"]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in chat message: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

# Add admin users endpoint
@app.get("/api/admin/users")
async def get_admin_users(request: Request):
    """Get all users for admin panel"""
    try:
        from modules.core.config import Config
        from jose import jwt, JWTError
        
        # Get authorization header
        authorization = request.headers.get("Authorization")
        if not authorization or not authorization.startswith("Bearer "):
            raise HTTPException(status_code=401, detail="Not authenticated")
        
        # Extract and verify token
        token = authorization.replace("Bearer ", "")
        try:
            payload = jwt.decode(token, Config.SECRET_KEY, algorithms=['HS256'])
            user_id = payload.get('user_id')
            if not user_id:
                raise HTTPException(status_code=401, detail="Invalid token")
        except JWTError:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        # Return mock data for now
        return [
            {
                "id": "1",
                "email": "admin@example.com",
                "role": "admin",
                "created_at": "2024-01-01T00:00:00Z",
                "is_active": True
            },
            {
                "id": "5", 
                "email": "martin@danglefeet.com",
                "role": "admin",
                "created_at": "2024-06-01T00:00:00Z",
                "is_active": True
            }
        ]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting admin users: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

# Add admin dashboard summary endpoint
@app.get("/api/admin-dashboard/summary")
async def get_admin_dashboard_summary(request: Request):
    """Get dashboard summary for admin panel"""
    try:
        from modules.core.config import Config
        from jose import jwt, JWTError
        
        # Get authorization header
        authorization = request.headers.get("Authorization")
        if not authorization or not authorization.startswith("Bearer "):
            raise HTTPException(status_code=401, detail="Not authenticated")
        
        # Extract and verify token
        token = authorization.replace("Bearer ", "")
        try:
            payload = jwt.decode(token, Config.SECRET_KEY, algorithms=['HS256'])
            user_id = payload.get('user_id')
            if not user_id:
                raise HTTPException(status_code=401, detail="Invalid token")
        except JWTError:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        # Return summary data
        return {
            "users": {
                "total": 2,
                "active": 2,
                "inactive": 0
            },
            "sessions": {
                "total": 10,
                "today": 3,
                "active": 1
            },
            "messages": {
                "total": 50,
                "today": 12
            },
            "system": {
                "status": "healthy",
                "uptime": "2 days",
                "version": "2.0.0"
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting dashboard summary: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

# Add admin feedback stats endpoint
@app.get("/api/admin/feedback/stats")
async def get_admin_feedback_stats(request: Request):
    """Get feedback statistics for admin panel"""
    try:
        from modules.core.config import Config
        from jose import jwt, JWTError
        
        # Get authorization header
        authorization = request.headers.get("Authorization")
        if not authorization or not authorization.startswith("Bearer "):
            raise HTTPException(status_code=401, detail="Not authenticated")
        
        # Extract and verify token
        token = authorization.replace("Bearer ", "")
        try:
            payload = jwt.decode(token, Config.SECRET_KEY, algorithms=['HS256'])
            user_id = payload.get('user_id')
            if not user_id:
                raise HTTPException(status_code=401, detail="Invalid token")
        except JWTError:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        # Return feedback stats
        return {
            "total": 25,
            "positive": 20,
            "negative": 5,
            "pending": 3,
            "resolved": 22,
            "average_rating": 4.2
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting feedback stats: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

# Add MOTD endpoint
@app.get("/api/motd")
async def get_motd():
    """Get the Message of the Day"""
    try:
        from modules.core.motd_manager import MOTDManager
        motd_manager = MOTDManager()
        
        if not motd_manager.is_enabled():
            return {
                "enabled": False,
                "content": "",
                "format": "text"
            }
        
        return {
            "enabled": True,
            "content": motd_manager.get_content(),
            "format": motd_manager.get_format(),
            "style": motd_manager.get_style(),
            "display": motd_manager.get_display_options()
        }
    except Exception as e:
        logger.error(f"Error getting MOTD: {e}")
        return {
            "enabled": False,
            "content": "",
            "format": "text",
            "error": str(e)
        }

# No v1 routes - using clean API structure

# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Global exception handler"""
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "detail": "Internal server error",
            "type": type(exc).__name__,
            "message": str(exc)
        }
    )

# Mount static files LAST so they don't override API routes
static_path = Path(__file__).parent.parent / "dist"
if static_path.exists():
    app.mount("/", StaticFiles(directory=str(static_path), html=True), name="static")
    logger.info(f"✓ Mounted static files from {static_path}")

if __name__ == "__main__":
    import uvicorn
    
    port = int(os.getenv("PORT", "8000"))
    host = os.getenv("HOST", "0.0.0.0")
    
    logger.info(f"Starting server on {host}:{port}")
    
    uvicorn.run(
        app,
        host=host,
        port=port,
        log_level="info",
        access_log=True
    )