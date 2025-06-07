"""
Chat History Manager - Handles chat message storage and retrieval
"""

import sqlite3
from typing import Dict, Any, List, Optional
from datetime import datetime
import json
import uuid
import logging

from modules.core.db import DBManager

logger = logging.getLogger(__name__)

class ChatHistoryManager:
    """Manages chat history and messages"""
    
    def __init__(self):
        self.db_manager = DBManager()
    
    def add_message(
        self,
        session_id: str,
        role: str,
        content: str,
        user_id: str,
        model: Optional[str] = None
    ) -> str:
        """Add a message to chat history"""
        try:
            with self.db_manager.get_session() as conn:
                cursor = conn.cursor()
                
                # First get the internal session id from uuid
                cursor.execute("SELECT id FROM chat_sessions WHERE uuid = ?", (session_id,))
                row = cursor.fetchone()
                if not row:
                    logger.error(f"Session with UUID {session_id} not found")
                    return None
                    
                internal_session_id = row['id']
                
                message_id = str(uuid.uuid4())
                now = int(datetime.now().timestamp())
                
                metadata = {}
                if model:
                    metadata["model"] = model
                
                cursor.execute("""
                    INSERT INTO chat_messages 
                    (id, session_id, user_id, role, content, created_at, model)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                """, (
                    message_id,
                    internal_session_id,  # Use internal ID for messages table
                    user_id,
                    role,
                    content,
                    now,
                    model
                ))
                
                conn.commit()  # Add explicit commit
                logger.info(f"Added message {message_id} to session {session_id}")
                return message_id
            
        except Exception as e:
            logger.error(f"Error adding message: {e}")
            return None
    
    def get_session_messages(self, session_id: str, limit: int = 50) -> List[Dict[str, Any]]:
        """Get messages for a session"""
        try:
            with self.db_manager.get_session() as conn:
                cursor = conn.cursor()
                
                # First get the internal session id from uuid
                cursor.execute("SELECT id FROM chat_sessions WHERE uuid = ?", (session_id,))
                row = cursor.fetchone()
                if not row:
                    logger.error(f"Session with UUID {session_id} not found")
                    return []
                    
                internal_session_id = row['id']
                
                cursor.execute("""
                    SELECT id, role, content, created_at, model, user_id
                    FROM chat_messages
                    WHERE session_id = ?
                    ORDER BY created_at DESC
                    LIMIT ?
                """, (internal_session_id, limit))
                
                messages = []
                for row in cursor.fetchall():
                    message = {
                        "id": row["id"],
                        "role": row["role"],
                        "content": row["content"],
                        "created_at": row["created_at"],
                        "model": row["model"],
                        "user_id": row["user_id"]
                    }
                    messages.append(message)
                
                # Reverse to get chronological order
                messages.reverse()
                
                return messages
            
        except Exception as e:
            logger.error(f"Error getting session messages: {e}")
            return []
    
    def add_feedback(
        self,
        message_id: str,
        user_id: str,
        is_positive: bool,
        comment: Optional[str] = None
    ) -> Optional[str]:
        """Add feedback for a message"""
        try:
            with self.db_manager.get_session() as conn:
                cursor = conn.cursor()
                
                # Get message details
                cursor.execute("""
                    SELECT m.session_id, m.content as answer, s.user_id, s.uuid
                    FROM chat_messages m
                    JOIN chat_sessions s ON m.session_id = s.id
                    WHERE m.id = ? AND m.role = 'assistant'
                """, (message_id,))
                
                message_data = cursor.fetchone()
                if not message_data:
                    logger.error(f"Message {message_id} not found or not an assistant message")
                    # Check if message exists at all
                    cursor.execute("SELECT COUNT(*) as count FROM chat_messages WHERE id = ?", (message_id,))
                    count_result = cursor.fetchone()
                    if count_result and count_result['count'] == 0:
                        logger.error(f"Message {message_id} does not exist in database")
                    else:
                        cursor.execute("SELECT role FROM chat_messages WHERE id = ?", (message_id,))
                        role_result = cursor.fetchone()
                        if role_result:
                            logger.error(f"Message {message_id} has role '{role_result['role']}', expected 'assistant'")
                    return None
                
                # Verify user owns the session (convert to string for comparison)
                if str(message_data["user_id"]) != str(user_id):
                    logger.error(f"User {user_id} doesn't own the session (session user: {message_data['user_id']})")
                    return None
                
                # Get the previous user message as the question
                cursor.execute("""
                    SELECT content
                    FROM chat_messages
                    WHERE session_id = ? AND role = 'user' AND created_at < (
                        SELECT created_at FROM chat_messages WHERE id = ?
                    )
                    ORDER BY created_at DESC
                    LIMIT 1
                """, (message_data["session_id"], message_id))
                
                question_row = cursor.fetchone()
                question = question_row["content"] if question_row else "Unknown question"
                
                # Insert feedback
                feedback_id = str(uuid.uuid4())
                now = int(datetime.now().timestamp())
                
                cursor.execute("""
                    INSERT INTO feedback 
                    (id, user_id, session_id, message_id, question, answer, is_positive, comment, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    feedback_id,
                    user_id,
                    message_data["session_id"],
                    message_id,
                    question,
                    message_data["answer"],
                    1 if is_positive else 0,
                    comment,
                    now
                ))
                
                logger.info(f"Feedback {feedback_id} added for message {message_id}")
                return feedback_id
            
        except Exception as e:
            logger.error(f"Error adding feedback: {e}")
            return None
    
    def get_message_feedback(self, message_id: str) -> Optional[Dict[str, Any]]:
        """Get feedback for a specific message"""
        try:
            with self.db_manager.get_session() as conn:
                cursor = conn.cursor()
                
                cursor.execute("""
                    SELECT id, is_positive, comment, created_at
                    FROM feedback
                    WHERE message_id = ?
                """, (message_id,))
                
                row = cursor.fetchone()
                if row:
                    return dict(row)
                return None
            
        except Exception as e:
            logger.error(f"Error getting message feedback: {e}")
            return None