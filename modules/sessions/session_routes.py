"""
Session Management Routes
Extracted from the main server.py for better organization
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Dict, Any, List, Optional
from datetime import datetime
import logging
import uuid

from modules.core.db import DBManager
from modules.core.auth_dependency import get_current_user
from modules.sessions.session_manager import SessionManager
from modules.chat.chat_history_manager import ChatHistoryManager

logger = logging.getLogger(__name__)
router = APIRouter()

# Initialize managers
db_manager = DBManager()
session_manager = SessionManager()
chat_history_manager = ChatHistoryManager()

@router.get("/sessions")
async def get_sessions(
    since: Optional[int] = Query(None, description="Timestamp to get sessions since"),
    user_data: Dict[str, Any] = Depends(get_current_user)
):
    """Get all sessions for the current user"""
    try:
        user_id = user_data.get("user_id")
        if not user_id:
            raise HTTPException(status_code=401, detail="User not authenticated")
        
        logger.info(f"Getting sessions for user: {user_id}")
        
        # Get sessions from database
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
        logger.error(f"Error getting sessions: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.post("/sessions")
async def create_session(
    user_data: Dict[str, Any] = Depends(get_current_user)
):
    """Create a new session"""
    try:
        user_id = user_data.get("user_id")
        if not user_id:
            raise HTTPException(status_code=401, detail="User not authenticated")
        
        # Create new session
        session_id = str(uuid.uuid4())
        session = session_manager.create_session(
            session_id=session_id,
            user_id=user_id,
            title="New Session"
        )
        
        if not session:
            raise HTTPException(status_code=500, detail="Failed to create session")
        
        logger.info(f"Created session {session_id} for user {user_id}")
        
        return {
            "id": session["id"],
            "title": session["title"],
            "created_at": session["created_at"],
            "message_count": 0
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating session: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/sessions/{session_id}")
async def get_session(
    session_id: str,
    user_data: Dict[str, Any] = Depends(get_current_user)
):
    """Get a specific session with messages"""
    try:
        user_id = user_data.get("user_id")
        if not user_id:
            raise HTTPException(status_code=401, detail="User not authenticated")
        
        # Get session
        session = session_manager.get_session(session_id, user_id)
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Get messages
        messages = chat_history_manager.get_session_messages(session_id)
        
        return {
            "id": session["id"],
            "title": session["title"],
            "created_at": session["created_at"],
            "updated_at": session["updated_at"],
            "messages": messages
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting session: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.put("/sessions/{session_id}")
async def update_session(
    session_id: str,
    title: str,
    user_data: Dict[str, Any] = Depends(get_current_user)
):
    """Update session title"""
    try:
        user_id = user_data.get("user_id")
        if not user_id:
            raise HTTPException(status_code=401, detail="User not authenticated")
        
        # Update session
        success = session_manager.update_session_title(session_id, user_id, title)
        if not success:
            raise HTTPException(status_code=404, detail="Session not found")
        
        return {"success": True, "message": "Session updated"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating session: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.delete("/sessions/{session_id}")
async def delete_session(
    session_id: str,
    user_data: Dict[str, Any] = Depends(get_current_user)
):
    """Delete a session"""
    try:
        user_id = user_data.get("user_id")
        if not user_id:
            raise HTTPException(status_code=401, detail="User not authenticated")
        
        # Delete session
        success = session_manager.delete_session(session_id, user_id)
        if not success:
            raise HTTPException(status_code=404, detail="Session not found")
        
        return {"success": True, "message": "Session deleted"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting session: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")