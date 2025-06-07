"""
Admin Feedback Handler
Manages user feedback and ratings
"""

from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from enum import Enum

from ..core.base_routes import BaseRouteHandler
from fastapi import HTTPException, Depends
from ..core.auth_dependency import get_current_user


class FeedbackRating(Enum):
    """Feedback rating values"""
    POSITIVE = 1
    NEUTRAL = 0
    NEGATIVE = -1


class AdminFeedbackHandler(BaseRouteHandler):
    """Handler for admin feedback management"""
    
    def __init__(self):
        """Initialize the handler and ensure table exists"""
        super().__init__()
        self._ensure_table_exists()
    
    def _ensure_table_exists(self):
        """Ensure the message_feedback table exists"""
        try:
            with self.get_db_session() as session:
                session.execute("""
                    CREATE TABLE IF NOT EXISTS message_feedback (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        message_id INTEGER NOT NULL,
                        rating INTEGER NOT NULL,
                        comment TEXT,
                        created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
                        status TEXT DEFAULT 'pending',
                        admin_response TEXT,
                        response_by INTEGER,
                        response_at INTEGER,
                        FOREIGN KEY (message_id) REFERENCES chat_messages (id)
                    )
                """)
                session.commit()
                self.logger.info("✓ Ensured message_feedback table exists")
        except Exception as e:
            self.logger.error(f"Error ensuring feedback table exists: {e}")
    
    def _setup_routes(self):
        """Setup feedback routes"""
        self.router.get("")(self.get_feedback)
        self.router.get("/negative")(self.get_negative_feedback)
        self.router.get("/positive")(self.get_positive_feedback) 
        self.router.get("/stats")(self.get_feedback_stats)
        self.router.get("/trends")(self.get_feedback_trends)
        self.router.get("/{feedback_id}")(self.get_feedback_item)
        self.router.put("/{feedback_id}/status")(self.update_feedback_status)
        self.router.delete("/{feedback_id}")(self.delete_feedback)
        self.router.post("/{feedback_id}/respond")(self.respond_to_feedback)
    
    async def get_feedback(self,
                          limit: int = 100,
                          offset: int = 0,
                          rating: Optional[int] = None,
                          status: Optional[str] = None,
                          admin_user: Dict[str, Any] = Depends(get_current_user)):
        """Get all feedback with optional filtering"""
        if admin_user.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
            
        try:
            with self.get_db_session() as session:
                # Build query
                query = """
                    SELECT 
                        f.id,
                        f.message_id,
                        f.is_positive,
                        f.comment,
                        f.created_at,
                        f.answer as message_content,
                        f.user_id,
                        u.email
                    FROM message_feedback f
                    JOIN users u ON f.user_id = u.id
                """
                
                conditions = []
                params = []
                
                if rating is not None:
                    # Convert rating to is_positive
                    if rating == 1:
                        conditions.append("f.is_positive = 1")
                    elif rating == -1:
                        conditions.append("f.is_positive = 0")
                    # Ignore neutral rating as we only have positive/negative
                
                if status:
                    conditions.append("f.status = ?")
                    params.append(status)
                
                if conditions:
                    query += " WHERE " + " AND ".join(conditions)
                
                query += " ORDER BY f.created_at DESC LIMIT ? OFFSET ?"
                params.extend([limit, offset])
                
                feedback_items = session.execute(query, params).fetchall()
                
                # Get total count
                count_query = "SELECT COUNT(*) FROM message_feedback"
                if conditions:
                    count_query += " f WHERE " + " AND ".join(conditions)
                    total = session.execute(count_query, params[:-2]).fetchone()[0]
                else:
                    total = session.execute(count_query).fetchone()[0]
            
            return self.build_response(
                data={
                    "feedback": [
                        {
                            "id": item[0],
                            "message_id": item[1],
                            "rating": 1 if item[2] else -1,  # Convert is_positive to rating
                            "comment": item[3],
                            "created_at": item[4],
                            "message_content": item[5][:200] + "..." if item[5] and len(item[5]) > 200 else (item[5] or ""),
                            "user_id": item[6],
                            "user_email": item[7]
                        }
                        for item in feedback_items
                    ],
                    "total": total,
                    "limit": limit,
                    "offset": offset
                }
            )
            
        except Exception as e:
            self.handle_error(e, "Error fetching feedback")
    
    async def get_negative_feedback(self,
                                  limit: int = 100,
                                  admin_user: Dict[str, Any] = Depends(get_current_user)):
        """Get negative feedback specifically"""
        if admin_user.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
        return await self.get_feedback(
            limit=limit,
            rating=-1,  # Negative feedback
            admin_user=admin_user
        )
    
    async def get_positive_feedback(self,
                                  limit: int = 100,
                                  admin_user: Dict[str, Any] = Depends(get_current_user)):
        """Get positive feedback specifically"""
        if admin_user.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
        return await self.get_feedback(
            limit=limit,
            rating=1,  # Positive feedback
            admin_user=admin_user
        )
    
    async def get_feedback_stats(self, admin_user: Dict[str, Any] = Depends(get_current_user)):
        """Get feedback statistics"""
        if admin_user.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
            
        try:
            with self.get_db_session() as session:
                # Get overall stats
                stats = session.execute("""
                    SELECT 
                        COUNT(*) as total,
                        SUM(CASE WHEN is_positive = 1 THEN 1 ELSE 0 END) as positive,
                        SUM(CASE WHEN is_positive = 0 THEN 1 ELSE 0 END) as negative,
                        0 as neutral,
                        AVG(CASE WHEN is_positive = 1 THEN 1.0 ELSE -1.0 END) as average_rating
                    FROM message_feedback
                """).fetchone()
                
                # Get stats by time period
                daily_stats = session.execute("""
                    SELECT 
                        date(datetime(created_at, 'unixepoch')) as date,
                        COUNT(*) as count,
                        AVG(CASE WHEN is_positive = 1 THEN 1.0 ELSE -1.0 END) as avg_rating
                    FROM message_feedback
                    WHERE created_at > strftime('%s', 'now', '-30 days')
                    GROUP BY date(datetime(created_at, 'unixepoch'))
                    ORDER BY date DESC
                """).fetchall()
                
                # Get most common feedback topics (from comments)
                # This is a simplified version - in production you'd use NLP
                common_words = self._extract_common_feedback_topics(session)
            
            return self.build_response(
                data={
                    "overall": {
                        "total": stats[0] or 0,
                        "positive": stats[1] or 0,
                        "negative": stats[2] or 0,
                        "neutral": stats[3] or 0,
                        "average_rating": round(stats[4] or 0, 2),
                        "satisfaction_rate": round((stats[1] or 0) / (stats[0] or 1) * 100, 1)
                    },
                    "daily_trends": [
                        {
                            "date": day[0],
                            "count": day[1],
                            "average_rating": round(day[2] or 0, 2)
                        }
                        for day in daily_stats
                    ],
                    "common_topics": common_words
                }
            )
            
        except Exception as e:
            self.handle_error(e, "Error getting feedback statistics")
    
    async def get_feedback_trends(self,
                                days: int = 30,
                                admin_user: Dict[str, Any] = Depends(get_current_user)):
        """Get feedback trends over time"""
        if admin_user.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
            
        try:
            with self.get_db_session() as session:
                trends = session.execute("""
                    SELECT 
                        date(datetime(created_at, 'unixepoch')) as date,
                        COUNT(*) as total,
                        SUM(CASE WHEN is_positive = 1 THEN 1 ELSE 0 END) as positive,
                        SUM(CASE WHEN is_positive = 0 THEN 1 ELSE 0 END) as negative
                    FROM message_feedback
                    WHERE created_at > strftime('%s', 'now', '-' || ? || ' days')
                    GROUP BY date(datetime(created_at, 'unixepoch'))
                    ORDER BY date ASC
                """, (days,)).fetchall()
            
            return self.build_response(
                data={
                    "trends": [
                        {
                            "date": trend[0],
                            "total": trend[1],
                            "positive": trend[2],
                            "negative": trend[3],
                            "sentiment_score": (trend[2] - trend[3]) / trend[1] if trend[1] > 0 else 0
                        }
                        for trend in trends
                    ],
                    "period_days": days
                }
            )
            
        except Exception as e:
            self.handle_error(e, "Error getting feedback trends")
    
    async def get_feedback_item(self,
                               feedback_id: int,
                               admin_user: Dict[str, Any] = Depends(get_current_user)):
        """Get specific feedback item details"""
        if admin_user.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
            
        try:
            with self.get_db_session() as session:
                feedback = session.execute("""
                    SELECT 
                        f.id,
                        f.message_id,
                        f.is_positive,
                        f.comment,
                        f.created_at,
                        f.answer as message_content,
                        0 as is_user,
                        f.session_id,
                        s.title as session_title,
                        f.user_id,
                        u.email
                    FROM message_feedback f
                    LEFT JOIN chat_sessions s ON f.session_id = s.id
                    JOIN users u ON f.user_id = u.id
                    WHERE f.id = ?
                """, (feedback_id,)).fetchone()
                
                if not feedback:
                    raise HTTPException(status_code=404, detail="Feedback not found")
            
            return self.build_response(
                data={
                    "id": feedback[0],
                    "message_id": feedback[1],
                    "rating": 1 if feedback[2] else -1,  # Convert is_positive to rating
                    "comment": feedback[3],
                    "created_at": feedback[4],
                    "message": {
                        "content": feedback[5],
                        "is_user": bool(feedback[6])
                    },
                    "session": {
                        "id": feedback[7],
                        "title": feedback[8]
                    },
                    "user": {
                        "id": feedback[9],
                        "email": feedback[10]
                    }
                }
            )
            
        except HTTPException:
            raise
        except Exception as e:
            self.handle_error(e, f"Error fetching feedback {feedback_id}")
    
    async def update_feedback_status(self,
                                   feedback_id: int,
                                   status_data: Dict[str, Any],
                                   admin_user: Dict[str, Any] = Depends(get_current_user)):
        """Update feedback status (e.g., reviewed, addressed)"""
        if admin_user.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
            
        self.validate_request(status_data, ["status"])
        
        try:
            with self.get_db_session() as session:
                # Add status column if it doesn't exist
                session.execute("""
                    ALTER TABLE message_feedback 
                    ADD COLUMN status TEXT DEFAULT 'pending'
                """)
                session.commit()
        except:
            pass  # Column might already exist
        
        try:
            with self.get_db_session() as session:
                result = session.execute(
                    "UPDATE message_feedback SET status = ? WHERE id = ?",
                    (status_data["status"], feedback_id)
                )
                session.commit()
                
                if result.rowcount == 0:
                    raise HTTPException(status_code=404, detail="Feedback not found")
            
            return self.build_response(
                message=f"Feedback status updated to {status_data['status']}"
            )
            
        except HTTPException:
            raise
        except Exception as e:
            self.handle_error(e, f"Error updating feedback {feedback_id}")
    
    async def delete_feedback(self,
                            feedback_id: int,
                            admin_user: Dict[str, Any] = Depends(get_current_user)):
        """Delete feedback item"""
        if admin_user.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
            
        try:
            with self.get_db_session() as session:
                result = session.execute(
                    "DELETE FROM message_feedback WHERE id = ?",
                    (feedback_id,)
                )
                session.commit()
                
                if result.rowcount == 0:
                    raise HTTPException(status_code=404, detail="Feedback not found")
            
            return self.build_response(message="Feedback deleted successfully")
            
        except HTTPException:
            raise
        except Exception as e:
            self.handle_error(e, f"Error deleting feedback {feedback_id}")
    
    async def respond_to_feedback(self,
                                feedback_id: int,
                                response_data: Dict[str, Any],
                                admin_user: Dict[str, Any] = Depends(get_current_user)):
        """Add admin response to feedback"""
        if admin_user.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
            
        self.validate_request(response_data, ["response"])
        
        try:
            # Add response columns if they don't exist
            with self.get_db_session() as session:
                session.execute("""
                    ALTER TABLE message_feedback 
                    ADD COLUMN admin_response TEXT
                """)
                session.execute("""
                    ALTER TABLE message_feedback 
                    ADD COLUMN response_by INTEGER
                """)
                session.execute("""
                    ALTER TABLE message_feedback 
                    ADD COLUMN response_at INTEGER
                """)
                session.commit()
        except:
            pass  # Columns might already exist
        
        try:
            with self.get_db_session() as session:
                result = session.execute("""
                    UPDATE message_feedback 
                    SET admin_response = ?, response_by = ?, response_at = ?
                    WHERE id = ?
                """, (
                    response_data["response"],
                    admin_user["user_id"],
                    int(datetime.now().timestamp()),
                    feedback_id
                ))
                session.commit()
                
                if result.rowcount == 0:
                    raise HTTPException(status_code=404, detail="Feedback not found")
            
            return self.build_response(message="Response added to feedback")
            
        except HTTPException:
            raise
        except Exception as e:
            self.handle_error(e, f"Error responding to feedback {feedback_id}")
    
    def _extract_common_feedback_topics(self, session, limit: int = 10) -> List[Dict[str, Any]]:
        """Extract common topics from feedback comments"""
        try:
            # Get all comments
            comments = session.execute(
                "SELECT comment FROM message_feedback WHERE comment IS NOT NULL AND comment != ''"
            ).fetchall()
            
            # Simple word frequency analysis
            word_count = {}
            stop_words = {'the', 'is', 'at', 'which', 'on', 'and', 'a', 'an', 'as', 'are',
                         'was', 'were', 'been', 'be', 'have', 'has', 'had', 'do', 'does',
                         'did', 'will', 'would', 'should', 'could', 'may', 'might', 'must',
                         'shall', 'can', 'need', 'to', 'of', 'in', 'for', 'with', 'it'}
            
            for comment in comments:
                words = comment[0].lower().split()
                for word in words:
                    # Clean word
                    word = word.strip('.,!?;:"')
                    if len(word) > 3 and word not in stop_words:
                        word_count[word] = word_count.get(word, 0) + 1
            
            # Get top words
            top_words = sorted(word_count.items(), key=lambda x: x[1], reverse=True)[:limit]
            
            return [
                {"word": word, "count": count}
                for word, count in top_words
            ]
            
        except Exception:
            return []


# Create handler instance
feedback_handler = AdminFeedbackHandler()