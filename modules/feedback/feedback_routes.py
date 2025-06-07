"""
Feedback Routes - Endpoints for message feedback
"""

from fastapi import APIRouter, HTTPException, Depends
from typing import Dict, Any, List, Optional
from datetime import datetime
import uuid
import logging

from modules.core.auth_dependency import get_current_user
from modules.core.db import DBManager

logger = logging.getLogger(__name__)
router = APIRouter()

# Initialize database manager
db_manager = DBManager()

# Create feedback table if it doesn't exist
def init_feedback_table():
    """Initialize feedback table in database"""
    try:
        with db_manager.get_session() as session:
            # First check if table exists
            table_exists = session.execute(
                "SELECT name FROM sqlite_master WHERE type='table' AND name='message_feedback'"
            ).fetchone()
            
            if table_exists:
                # Check if we need to recreate it without the message_id foreign key
                # Get table info
                table_info = session.execute("PRAGMA table_info(message_feedback)").fetchall()
                
                # Check if foreign_keys are enabled
                fk_info = session.execute("PRAGMA foreign_key_list(message_feedback)").fetchall()
                has_message_fk = any(fk[2] == 'chat_messages' for fk in fk_info)
                
                if has_message_fk:
                    # Need to recreate table without message_id foreign key
                    logger.info("Recreating feedback table without message_id foreign key")
                    
                    # Backup existing data
                    session.execute("""
                        CREATE TABLE message_feedback_backup AS 
                        SELECT * FROM message_feedback
                    """)
                    
                    # Drop old table
                    session.execute("DROP TABLE message_feedback")
            
            # Create table without message_id foreign key to allow temporary message IDs
            session.execute("""
                CREATE TABLE IF NOT EXISTS message_feedback (
                    id TEXT PRIMARY KEY,
                    message_id TEXT NOT NULL,
                    session_id TEXT NOT NULL,
                    user_id TEXT NOT NULL,
                    type TEXT NOT NULL,
                    comment TEXT,
                    timestamp TEXT NOT NULL,
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (session_id) REFERENCES chat_sessions(id),
                    FOREIGN KEY (user_id) REFERENCES users(id)
                )
            """)
            
            # Restore data if we had a backup
            backup_exists = session.execute(
                "SELECT name FROM sqlite_master WHERE type='table' AND name='message_feedback_backup'"
            ).fetchone()
            
            if backup_exists:
                session.execute("""
                    INSERT INTO message_feedback 
                    SELECT * FROM message_feedback_backup
                """)
                session.execute("DROP TABLE message_feedback_backup")
            
            # Create index for better performance
            session.execute("""
                CREATE INDEX IF NOT EXISTS idx_message_feedback_message_user 
                ON message_feedback(message_id, user_id)
            """)
            
            session.execute("""
                CREATE INDEX IF NOT EXISTS idx_message_feedback_session 
                ON message_feedback(session_id)
            """)
            
            session.commit()
            logger.info("Feedback table initialized successfully")
    except Exception as e:
        logger.error(f"Error initializing feedback table: {e}")

# Initialize table on module load
init_feedback_table()

@router.post("/message")
async def submit_message_feedback(
    feedback_data: Dict[str, Any],
    user_data: Dict[str, Any] = Depends(get_current_user)
):
    """Submit feedback for a message"""
    try:
        message_id = feedback_data.get("messageId")
        session_id = feedback_data.get("sessionId")
        feedback_type = feedback_data.get("type")
        comment = feedback_data.get("comment", "")
        
        if not all([message_id, session_id, feedback_type]):
            raise HTTPException(
                status_code=400, 
                detail="Missing required fields: messageId, sessionId, type"
            )
        
        if feedback_type not in ["positive", "negative"]:
            raise HTTPException(
                status_code=400,
                detail="Invalid feedback type. Must be 'positive' or 'negative'"
            )
        
        feedback_id = str(uuid.uuid4())
        user_id = user_data["user_id"]
        timestamp = feedback_data.get("timestamp", datetime.now().isoformat())
        
        with db_manager.get_session() as session:
            # For temporary message IDs (like temp-response-*), we need to handle them differently
            # These are messages that haven't been saved to the database yet
            
            # First, check if this is a temporary message ID
            is_temp_id = message_id.startswith('temp-')
            
            # Also check if session exists (unless it's also temporary)
            is_temp_session = session_id.startswith('temp-')
            
            if not is_temp_session:
                # Verify the session exists
                session_exists = session.execute(
                    "SELECT id FROM chat_sessions WHERE id = ?",
                    (session_id,)
                ).fetchone()
                
                if not session_exists:
                    logger.error(f"Session {session_id} does not exist")
                    raise HTTPException(status_code=400, detail="Invalid session ID")
            
            if not is_temp_id:
                # Verify the message exists in the database
                message_exists = session.execute(
                    "SELECT id FROM chat_messages WHERE id = ?",
                    (message_id,)
                ).fetchone()
                
                if not message_exists:
                    logger.warning(f"Message {message_id} does not exist in database")
                    # Don't throw error, just log and continue
                    # This allows feedback to be saved even if message isn't in DB yet
            
            # Check if feedback already exists for this message from this user
            existing = session.execute(
                """SELECT id FROM message_feedback 
                   WHERE message_id = ? AND user_id = ?""",
                (message_id, user_id)
            ).fetchone()
            
            if existing:
                # Update existing feedback
                session.execute(
                    """UPDATE message_feedback 
                       SET type = ?, comment = ?, timestamp = ?, updated_at = CURRENT_TIMESTAMP
                       WHERE id = ?""",
                    (feedback_type, comment, timestamp, existing[0])
                )
                feedback_id = existing[0]
            else:
                # Insert new feedback
                session.execute(
                    """INSERT INTO message_feedback 
                       (id, message_id, session_id, user_id, type, comment, timestamp)
                       VALUES (?, ?, ?, ?, ?, ?, ?)""",
                    (feedback_id, message_id, session_id, user_id, 
                     feedback_type, comment, timestamp)
                )
            
            session.commit()
        
        logger.info(f"Feedback submitted: {feedback_id} for message {message_id}")
        
        return {
            "success": True,
            "feedbackId": feedback_id,
            "message": "Feedback submitted successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error submitting feedback: {e}")
        # Don't expose internal error details
        raise HTTPException(status_code=500, detail="Internal server error while submitting feedback")

@router.get("/message/{message_id}")
async def get_message_feedback(
    message_id: str,
    user_data: Dict[str, Any] = Depends(get_current_user)
):
    """Get feedback for a specific message from current user"""
    try:
        user_id = user_data["user_id"]
        
        with db_manager.get_session() as session:
            feedback = session.execute(
                """SELECT id, message_id, session_id, user_id, type, comment, timestamp
                   FROM message_feedback
                   WHERE message_id = ? AND user_id = ?""",
                (message_id, user_id)
            ).fetchone()
            
            if not feedback:
                raise HTTPException(status_code=404, detail="No feedback found")
            
            return {
                "id": feedback[0],
                "messageId": feedback[1],
                "sessionId": feedback[2],
                "userId": feedback[3],
                "type": feedback[4],
                "comment": feedback[5],
                "timestamp": feedback[6]
            }
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting feedback: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{feedback_id}")
async def update_feedback(
    feedback_id: str,
    updates: Dict[str, Any],
    user_data: Dict[str, Any] = Depends(get_current_user)
):
    """Update existing feedback"""
    try:
        user_id = user_data["user_id"]
        
        with db_manager.get_session() as session:
            # Verify ownership
            owner = session.execute(
                "SELECT user_id FROM message_feedback WHERE id = ?",
                (feedback_id,)
            ).fetchone()
            
            if not owner:
                raise HTTPException(status_code=404, detail="Feedback not found")
            
            if owner[0] != user_id:
                raise HTTPException(status_code=403, detail="Not authorized to update this feedback")
            
            # Update allowed fields
            update_fields = []
            update_values = []
            
            if "type" in updates:
                update_fields.append("type = ?")
                update_values.append(updates["type"])
            
            if "comment" in updates:
                update_fields.append("comment = ?")
                update_values.append(updates["comment"])
            
            if update_fields:
                update_fields.append("updated_at = CURRENT_TIMESTAMP")
                update_values.append(feedback_id)
                
                query = f"UPDATE message_feedback SET {', '.join(update_fields)} WHERE id = ?"
                session.execute(query, update_values)
                session.commit()
        
        return {
            "success": True,
            "message": "Feedback updated successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating feedback: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{feedback_id}")
async def delete_feedback(
    feedback_id: str,
    user_data: Dict[str, Any] = Depends(get_current_user)
):
    """Delete feedback"""
    try:
        user_id = user_data["user_id"]
        
        with db_manager.get_session() as session:
            # Verify ownership
            owner = session.execute(
                "SELECT user_id FROM message_feedback WHERE id = ?",
                (feedback_id,)
            ).fetchone()
            
            if not owner:
                raise HTTPException(status_code=404, detail="Feedback not found")
            
            if owner[0] != user_id and user_data.get("role") != "admin":
                raise HTTPException(status_code=403, detail="Not authorized to delete this feedback")
            
            session.execute("DELETE FROM message_feedback WHERE id = ?", (feedback_id,))
            session.commit()
        
        return {
            "success": True,
            "message": "Feedback deleted successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting feedback: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/session/{session_id}")
async def get_session_feedbacks(
    session_id: str,
    user_data: Dict[str, Any] = Depends(get_current_user)
):
    """Get all feedbacks for a session"""
    try:
        user_id = user_data["user_id"]
        
        with db_manager.get_session() as session:
            # Verify session ownership
            owner = session.execute(
                "SELECT user_id FROM chat_sessions WHERE id = ?",
                (session_id,)
            ).fetchone()
            
            if not owner or (owner[0] != user_id and user_data.get("role") != "admin"):
                raise HTTPException(status_code=403, detail="Not authorized to view this session's feedback")
            
            feedbacks = session.execute(
                """SELECT id, message_id, session_id, user_id, type, comment, timestamp
                   FROM message_feedback
                   WHERE session_id = ?
                   ORDER BY timestamp DESC""",
                (session_id,)
            ).fetchall()
            
            return [
                {
                    "id": f[0],
                    "messageId": f[1],
                    "sessionId": f[2],
                    "userId": f[3],
                    "type": f[4],
                    "comment": f[5],
                    "timestamp": f[6]
                }
                for f in feedbacks
            ]
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting session feedbacks: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/stats/session/{session_id}")
async def get_session_feedback_stats(
    session_id: str,
    user_data: Dict[str, Any] = Depends(get_current_user)
):
    """Get feedback statistics for a session"""
    try:
        user_id = user_data["user_id"]
        
        with db_manager.get_session() as session:
            # Verify session ownership
            owner = session.execute(
                "SELECT user_id FROM chat_sessions WHERE id = ?",
                (session_id,)
            ).fetchone()
            
            if not owner or (owner[0] != user_id and user_data.get("role") != "admin"):
                raise HTTPException(status_code=403, detail="Not authorized to view this session's stats")
            
            # Get statistics
            stats = session.execute(
                """SELECT 
                    COUNT(*) as total,
                    SUM(CASE WHEN type = 'positive' THEN 1 ELSE 0 END) as positive,
                    SUM(CASE WHEN type = 'negative' THEN 1 ELSE 0 END) as negative,
                    SUM(CASE WHEN comment != '' THEN 1 ELSE 0 END) as with_comments
                   FROM message_feedback
                   WHERE session_id = ?""",
                (session_id,)
            ).fetchone()
            
            return {
                "total": stats[0] or 0,
                "positive": stats[1] or 0,
                "negative": stats[2] or 0,
                "withComments": stats[3] or 0
            }
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting feedback stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))