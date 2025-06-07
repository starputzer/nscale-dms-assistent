"""
Session Manager - Handles session-related database operations
"""

import sqlite3
from typing import Dict, Any, List, Optional
from datetime import datetime
import logging

from modules.core.db import DBManager

logger = logging.getLogger(__name__)

class SessionManager:
    """Manages chat sessions"""
    
    def __init__(self):
        self.db_manager = DBManager()
    
    def create_session(self, session_id: str, user_id: str, title: str = "New Session") -> Optional[Dict[str, Any]]:
        """Create a new session"""
        try:
            with self.db_manager.get_session() as conn:
                cursor = conn.cursor()
                
                now = int(datetime.now().timestamp())
                
                cursor.execute("""
                    INSERT INTO chat_sessions (uuid, user_id, title, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?)
                """, (session_id, int(user_id), title, now, now))
                
                return {
                    "id": session_id,
                    "user_id": user_id,
                    "title": title,
                    "created_at": now,
                    "updated_at": now
                }
            
        except Exception as e:
            logger.error(f"Error creating session: {e}")
            return None
    
    def get_session(self, session_id: str, user_id: str) -> Optional[Dict[str, Any]]:
        """Get a session by ID, ensuring it belongs to the user"""
        try:
            with self.db_manager.get_session() as conn:
                cursor = conn.cursor()
                
                # First try to find by uuid
                cursor.execute("""
                    SELECT id, uuid, user_id, title, created_at, updated_at
                    FROM chat_sessions
                    WHERE uuid = ? AND user_id = ?
                """, (session_id, int(user_id)))
                
                row = cursor.fetchone()
                if row:
                    result = dict(row)
                    # Use uuid as the main id for the API
                    result['id'] = result.get('uuid', result.get('id'))
                    return result
                return None
            
        except Exception as e:
            logger.error(f"Error getting session: {e}")
            return None
    
    def get_user_sessions(self, user_id: str, since: Optional[int] = None) -> List[Dict[str, Any]]:
        """Get all sessions for a user"""
        try:
            with self.db_manager.get_session() as conn:
                cursor = conn.cursor()
                
                query = """
                    SELECT s.*, COUNT(m.id) as message_count
                    FROM chat_sessions s
                    LEFT JOIN chat_messages m ON s.id = m.session_id
                    WHERE s.user_id = ?
                """
                
                params = [int(user_id)]
                
                if since:
                    query += " AND s.updated_at > ?"
                    params.append(since)
                
                query += " GROUP BY s.id ORDER BY s.updated_at DESC"
                
                cursor.execute(query, params)
                
                sessions = []
                for row in cursor.fetchall():
                    session = dict(row)
                    # Use uuid as the main id for the API
                    if 'uuid' in session:
                        session['id'] = session['uuid']
                    sessions.append(session)
                
                return sessions
            
        except Exception as e:
            logger.error(f"Error getting user sessions: {e}")
            return []
    
    def update_session_title(self, session_id: str, user_id: str, title: str) -> bool:
        """Update session title"""
        try:
            with self.db_manager.get_session() as conn:
                cursor = conn.cursor()
                
                cursor.execute("""
                    UPDATE chat_sessions
                    SET title = ?, updated_at = ?
                    WHERE uuid = ? AND user_id = ?
                """, (title, int(datetime.now().timestamp()), session_id, int(user_id)))
                
                return cursor.rowcount > 0
            
        except Exception as e:
            logger.error(f"Error updating session title: {e}")
            return False
    
    def update_session_activity(self, session_id: str) -> bool:
        """Update session's last activity timestamp"""
        try:
            with self.db_manager.get_session() as conn:
                cursor = conn.cursor()
                
                cursor.execute("""
                    UPDATE chat_sessions
                    SET updated_at = ?
                    WHERE uuid = ?
                """, (int(datetime.now().timestamp()), session_id))
                
                return cursor.rowcount > 0
            
        except Exception as e:
            logger.error(f"Error updating session activity: {e}")
            return False
    
    def delete_session(self, session_id: str, user_id: str) -> bool:
        """Delete a session and all its messages"""
        try:
            with self.db_manager.get_session() as conn:
                cursor = conn.cursor()
                
                # First get the internal id for this uuid
                cursor.execute("SELECT id FROM chat_sessions WHERE uuid = ? AND user_id = ?", 
                             (session_id, int(user_id)))
                row = cursor.fetchone()
                if not row:
                    return False
                    
                internal_id = row['id']
                
                # Delete messages using internal id
                cursor.execute("DELETE FROM chat_messages WHERE session_id = ?", (internal_id,))
                
                # Delete session
                cursor.execute("""
                    DELETE FROM chat_sessions
                    WHERE uuid = ? AND user_id = ?
                """, (session_id, int(user_id)))
                
                return cursor.rowcount > 0
            
        except Exception as e:
            logger.error(f"Error deleting session: {e}")
            return False