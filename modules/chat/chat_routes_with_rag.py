"""
Chat Routes with RAG Integration
Enhanced chat routes that use the RAG system for document-based responses
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
from modules.rag.engine import RAGEngine

logger = logging.getLogger(__name__)
router = APIRouter()

# Initialize services
chat_history_manager = ChatHistoryManager()
session_manager = SessionManager()
llm_service = LLMService()
rag_engine = RAGEngine()

class ChatMessage(BaseModel):
    message: str
    sessionId: str
    model: Optional[str] = "llama3:8b-instruct-q4_1"

class FeedbackRequest(BaseModel):
    messageId: str
    isPositive: bool
    comment: Optional[str] = None

async def generate_sse_response_with_rag(
    message: str,
    session_id: str,
    user_id: str,
    model: str
) -> AsyncGenerator[str, None]:
    """Generate Server-Sent Events for streaming response using RAG"""
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
        
        # Use RAG system to process the query
        accumulated_response = ""
        
        try:
            # Create an async generator for the RAG response
            async def rag_generator():
                async for event in rag_engine.stream_rag_response(
                    query=message,
                    session_id=session_id,
                    chat_history=history,
                    model=model
                ):
                    yield event
                    
            # Process the RAG stream
            async for event in rag_generator():
                if event["type"] == "content":
                    accumulated_response += event["content"]
                    yield f"data: {json.dumps(event)}\n\n"
                elif event["type"] == "done":
                    # Save complete assistant message
                    assistant_msg_id = chat_history_manager.add_message(
                        session_id=session_id,
                        role="assistant", 
                        content=accumulated_response,
                        user_id=user_id,
                        model=model
                    )
                    logger.info(f"Assistant message saved with ID: {assistant_msg_id}")
                    
                    # Send completion event
                    yield f"data: {json.dumps({'type': 'done', 'messageId': assistant_msg_id})}\n\n"
                    break
                elif event["type"] == "error":
                    logger.error(f"RAG error: {event.get('error')}")
                    raise Exception(event.get('error', 'Unknown RAG error'))
                else:
                    # Forward other event types (sources, metadata, etc.)
                    yield f"data: {json.dumps(event)}\n\n"
                    
        except Exception as rag_error:
            logger.error(f"RAG system error, falling back to direct LLM: {rag_error}")
            
            # Fallback to direct LLM without RAG
            messages = []
            for msg in history[:-1]:  # Exclude the just-added message
                messages.append({
                    "role": msg["role"],
                    "content": msg["content"]
                })
            messages.append({"role": "user", "content": message})
            
            # Stream response from LLM
            assistant_content = ""
            
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
        
        # Update session activity
        session_manager.update_session_activity(session_id)
        
    except Exception as e:
        logger.error(f"Error in chat stream: {e}")
        yield f"data: {json.dumps({'type': 'error', 'error': str(e)})}\n\n"

@router.post("/chat")
async def chat(
    request: ChatMessage,
    user_data: Dict[str, Any] = Depends(get_current_user)
):
    """Main chat endpoint with streaming response and RAG integration"""
    try:
        user_id = user_data.get("user_id")
        if not user_id:
            raise HTTPException(status_code=401, detail="User not authenticated")
        
        # Validate session exists and belongs to user
        session = session_manager.get_session(request.sessionId, user_id)
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        logger.info(f"Chat request from user {user_id} in session {request.sessionId}")
        
        # Return streaming response with RAG
        return StreamingResponse(
            generate_sse_response_with_rag(
                message=request.message,
                session_id=request.sessionId,
                user_id=str(user_id),
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
        logger.error(f"Error in chat endpoint: {e}")
        raise HTTPException(status_code=500, detail=str(e))

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
        
        # Add feedback to the message
        chat_history_manager.add_feedback(
            message_id=request.messageId,
            is_positive=request.isPositive,
            comment=request.comment
        )
        
        return {"success": True, "message": "Feedback recorded"}
        
    except Exception as e:
        logger.error(f"Error submitting feedback: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/test")
async def test_chat():
    """Test endpoint to verify chat service is running"""
    return {"status": "ok", "service": "chat"}