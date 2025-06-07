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
from modules.rag.engine import RAGEngine

logger = logging.getLogger(__name__)
router = APIRouter()

# Initialize services
chat_history_manager = ChatHistoryManager()
session_manager = SessionManager()
llm_service = LLMService()

# RAG engine will be initialized at server startup
rag_engine = None

def get_rag_engine(request: Request) -> RAGEngine:
    """Get RAG engine from app state"""
    global rag_engine
    if rag_engine is None and hasattr(request.app.state, 'rag_engine'):
        rag_engine = request.app.state.rag_engine
    return rag_engine

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
    model: str,
    request: Request = None
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
        
        # Try to use RAG system first
        try:
            # Get RAG engine from request if available
            current_rag_engine = rag_engine
            if current_rag_engine is None and request:
                current_rag_engine = get_rag_engine(request)
                
            # Check if RAG engine is available
            if current_rag_engine is None:
                logger.warning("RAG engine not initialized, falling back to direct LLM")
                raise Exception("RAG not available")
                
            # Use RAG system for enhanced responses
            accumulated_response = ""
            
            async for chunk_json in current_rag_engine.stream_answer_chunks(
                question=message,
                session_id=int(session_id) if session_id.isdigit() else None,
                use_simple_language=False
            ):
                try:
                    # Parse the JSON chunk
                    chunk_data = json.loads(chunk_json)
                    
                    if 'response' in chunk_data:
                        # This is a content chunk
                        accumulated_response += chunk_data['response']
                        yield f"data: {json.dumps({'type': 'content', 'content': chunk_data['response']})}\n\n"
                    elif 'done' in chunk_data and chunk_data['done']:
                        # Stream is done
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
                    elif 'error' in chunk_data:
                        # Handle error
                        logger.error(f"RAG error: {chunk_data['error']}")
                        yield f"data: {json.dumps({'type': 'error', 'error': chunk_data['error']})}\n\n"
                        break
                except json.JSONDecodeError:
                    logger.error(f"Failed to parse chunk: {chunk_json}")
                    continue
                    
        except Exception as rag_error:
            logger.warning(f"RAG system unavailable, falling back to direct LLM: {rag_error}")
            
            # Fallback to direct LLM
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
        
        # Update session
        session_manager.update_session_activity(session_id)
        
    except Exception as e:
        logger.error(f"Error in chat stream: {e}")
        yield f"data: {json.dumps({'type': 'error', 'error': str(e)})}\n\n"

@router.post("/chat")
async def chat(
    chat_request: ChatMessage,
    request: Request,
    user_data: Dict[str, Any] = Depends(get_current_user)
):
    """Main chat endpoint with streaming response"""
    try:
        user_id = user_data.get("user_id")
        if not user_id:
            raise HTTPException(status_code=401, detail="User not authenticated")
        
        # Validate session exists and belongs to user
        session = session_manager.get_session(chat_request.sessionId, user_id)
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        logger.info(f"Chat request from user {user_id} in session {chat_request.sessionId}")
        
        # Return streaming response
        return StreamingResponse(
            generate_sse_response(
                message=chat_request.message,
                session_id=chat_request.sessionId,
                user_id=user_id,
                model=chat_request.model,
                request=request
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