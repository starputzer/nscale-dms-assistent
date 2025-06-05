"""
Chat Routes
Extracted from the main server.py for better organization
"""

from fastapi import APIRouter, HTTPException, Depends, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Dict, Any, List, Optional, AsyncGenerator
import json
import asyncio
import logging
from datetime import datetime

from modules.core.auth_dependency import get_current_user
from modules.chat.chat_history_manager import ChatHistoryManager
from modules.sessions.session_manager import SessionManager
from modules.llm.llm_service import LLMService

logger = logging.getLogger(__name__)
router = APIRouter()

# Initialize services
chat_history_manager = ChatHistoryManager()
session_manager = SessionManager()
llm_service = LLMService()

class ChatMessage(BaseModel):
    message: str
    sessionId: str
    model: Optional[str] = "llama3:8b-instruct-q4_1"

class FeedbackRequest(BaseModel):
    messageId: str
    isPositive: bool
    comment: Optional[str] = None

async def generate_sse_response(
    message: str,
    session_id: str,
    user_id: str,
    model: str
) -> AsyncGenerator[str, None]:
    """Generate Server-Sent Events for streaming response"""
    try:
        # Save user message
        user_msg_id = chat_history_manager.add_message(
            session_id=session_id,
            role="user",
            content=message,
            user_id=user_id
        )
        logger.info(f"User message saved with ID: {user_msg_id}")
        
        # Get chat history for context
        history = chat_history_manager.get_session_messages(session_id, limit=10)
        
        # Prepare messages for LLM
        messages = []
        for msg in history[:-1]:  # Exclude the just-added message
            messages.append({
                "role": msg["role"],
                "content": msg["content"]
            })
        messages.append({"role": "user", "content": message})
        
        # Stream response from LLM
        assistant_content = ""
        assistant_msg_id = None
        
        async for chunk in llm_service.stream_chat(messages, model):
            if chunk["type"] == "content":
                assistant_content += chunk["content"]
                yield f"data: {json.dumps(chunk)}\n\n"
            elif chunk["type"] == "done":
                # Save assistant message
                assistant_msg_id = chat_history_manager.add_message(
                    session_id=session_id,
                    role="assistant",
                    content=assistant_content,
                    user_id=user_id,
                    model=model
                )
                logger.info(f"Assistant message saved with ID: {assistant_msg_id}")
                
                # Send completion event
                yield f"data: {json.dumps({'type': 'done', 'messageId': assistant_msg_id})}\n\n"
                break
        
        # Update session
        session_manager.update_session_activity(session_id)
        
    except Exception as e:
        logger.error(f"Error in chat stream: {e}")
        yield f"data: {json.dumps({'type': 'error', 'error': str(e)})}\n\n"

@router.post("/chat")
async def chat(
    request: ChatMessage,
    user_data: Dict[str, Any] = Depends(get_current_user)
):
    """Main chat endpoint with streaming response"""
    try:
        user_id = user_data.get("user_id")
        if not user_id:
            raise HTTPException(status_code=401, detail="User not authenticated")
        
        # Validate session exists and belongs to user
        session = session_manager.get_session(request.sessionId, user_id)
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        logger.info(f"Chat request from user {user_id} in session {request.sessionId}")
        
        # Return streaming response
        return StreamingResponse(
            generate_sse_response(
                message=request.message,
                session_id=request.sessionId,
                user_id=user_id,
                model=request.model
            ),
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
        logger.error(f"Chat error: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.post("/feedback")
async def submit_feedback(
    request: FeedbackRequest,
    user_data: Dict[str, Any] = Depends(get_current_user)
):
    """Submit feedback for a message"""
    try:
        user_id = user_data.get("user_id")
        if not user_id:
            raise HTTPException(status_code=401, detail="User not authenticated")
        
        # Save feedback
        feedback_id = chat_history_manager.add_feedback(
            message_id=request.messageId,
            user_id=user_id,
            is_positive=request.isPositive,
            comment=request.comment
        )
        
        if not feedback_id:
            raise HTTPException(status_code=500, detail="Failed to save feedback")
        
        logger.info(f"Feedback submitted for message {request.messageId}")
        
        return {
            "success": True,
            "feedbackId": feedback_id,
            "message": "Feedback submitted successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Feedback error: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/messages/{session_id}")
async def get_messages(
    session_id: str,
    limit: int = 50,
    user_data: Dict[str, Any] = Depends(get_current_user)
):
    """Get messages for a session"""
    try:
        user_id = user_data.get("user_id")
        if not user_id:
            raise HTTPException(status_code=401, detail="User not authenticated")
        
        # Validate session belongs to user
        session = session_manager.get_session(session_id, user_id)
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Get messages
        messages = chat_history_manager.get_session_messages(session_id, limit)
        
        return {
            "messages": messages,
            "total": len(messages)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting messages: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")