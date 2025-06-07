"""
Feedback Manager - Handles user feedback storage and retrieval
"""

from typing import Dict, Any, List, Optional
from datetime import datetime
import logging
import uuid

from modules.core.db import DBManager

logger = logging.getLogger(__name__)

class FeedbackManager:
    def __init__(self):
        self.db_manager = DBManager()
        self._ensure_tables()
    
    def _ensure_tables(self):
        """Ensure feedback table exists"""
        try:
            with self.db_manager.get_session() as session:
                session.execute("""
                    CREATE TABLE IF NOT EXISTS feedback (
                        id TEXT PRIMARY KEY,
                        message_id TEXT NOT NULL,
                        session_id TEXT NOT NULL,
                        user_id TEXT NOT NULL,
                        rating INTEGER DEFAULT 0,
                        question TEXT,
                        answer TEXT,
                        comment TEXT,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        status TEXT DEFAULT 'pending'
                    )
                """)
                session.commit()
        except Exception as e:
            logger.error(f"Error creating feedback table: {e}")
    
    def add_feedback(
        self,
        message_id: str,
        session_id: str,
        user_id: str,
        rating: int,
        question: str = "",
        answer: str = "",
        comment: str = ""
    ) -> str:
        """Add feedback for a message"""
        try:
            feedback_id = str(uuid.uuid4())
            
            with self.db_manager.get_session() as session:
                session.execute("""
                    INSERT INTO feedback 
                    (id, message_id, session_id, user_id, rating, question, answer, comment)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    feedback_id,
                    message_id,
                    session_id,
                    user_id,
                    rating,
                    question,
                    answer,
                    comment
                ))
                session.commit()
            
            logger.info(f"Feedback added: {feedback_id}")
            return feedback_id
            
        except Exception as e:
            logger.error(f"Error adding feedback: {e}")
            return None
    
    def get_feedback_stats(self) -> Dict[str, Any]:
        """Get feedback statistics"""
        try:
            with self.db_manager.get_session() as session:
                total = session.execute("SELECT COUNT(*) FROM feedback").fetchone()[0]
                positive = session.execute(
                    "SELECT COUNT(*) FROM feedback WHERE rating > 0"
                ).fetchone()[0]
                negative = session.execute(
                    "SELECT COUNT(*) FROM feedback WHERE rating < 0"
                ).fetchone()[0]
                
                avg_rating = session.execute(
                    "SELECT AVG(rating) FROM feedback WHERE rating != 0"
                ).fetchone()[0] or 0
            
            return {
                "total": total,
                "positive": positive,
                "negative": negative,
                "average_rating": round(avg_rating, 2)
            }
            
        except Exception as e:
            logger.error(f"Error getting feedback stats: {e}")
            return {"total": 0, "positive": 0, "negative": 0, "average_rating": 0}