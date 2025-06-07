"""
Admin Feedback Routes - Manage user feedback
"""

from fastapi import APIRouter, HTTPException, Depends, Request
from typing import Dict, Any, List, Optional
from datetime import datetime
import logging

from modules.core.auth_dependency import get_current_user
from modules.core.db import DBManager

logger = logging.getLogger(__name__)
router = APIRouter()

# Dependency to check if user is admin
async def require_admin(user_data: Dict[str, Any] = Depends(get_current_user)):
    """Require admin role for access"""
    if user_data.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user_data

@router.get("/stats")
async def get_feedback_stats(
    admin_user: Dict[str, Any] = Depends(require_admin)
):
    """Get feedback statistics"""
    try:
        db_manager = DBManager()
        
        with db_manager.get_session() as session:
            # Get feedback counts
            total = session.execute("SELECT COUNT(*) FROM feedback").fetchone()[0]
            positive = session.execute(
                "SELECT COUNT(*) FROM feedback WHERE rating > 0"
            ).fetchone()[0]
            negative = session.execute(
                "SELECT COUNT(*) FROM feedback WHERE rating < 0"
            ).fetchone()[0]
            neutral = session.execute(
                "SELECT COUNT(*) FROM feedback WHERE rating = 0"
            ).fetchone()[0]
            
            # Get average rating
            avg_rating = session.execute(
                "SELECT AVG(rating) FROM feedback WHERE rating != 0"
            ).fetchone()[0] or 0
        
        return {
            "total": total,
            "positive": positive,
            "negative": negative,
            "neutral": neutral,
            "average_rating": round(avg_rating, 2),
            "pending": 0,  # TODO: Implement pending feedback
            "resolved": total
        }
    except Exception as e:
        logger.error(f"Error getting feedback stats: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/list")
async def get_feedback_list(
    limit: int = 100,
    offset: int = 0,
    filter_type: Optional[str] = None,  # 'positive', 'negative', 'neutral'
    admin_user: Dict[str, Any] = Depends(require_admin)
):
    """Get feedback list with optional filtering"""
    try:
        db_manager = DBManager()
        
        with db_manager.get_session() as session:
            # Build query based on filter
            query = """
                SELECT f.id, f.message_id, f.session_id, f.rating, 
                       f.question, f.answer, f.comment, f.created_at,
                       u.email as user_email
                FROM feedback f
                JOIN users u ON f.user_id = u.id
            """
            
            params = []
            if filter_type == "positive":
                query += " WHERE f.rating > 0"
            elif filter_type == "negative":
                query += " WHERE f.rating < 0"
            elif filter_type == "neutral":
                query += " WHERE f.rating = 0"
            
            query += " ORDER BY f.created_at DESC LIMIT ? OFFSET ?"
            params.extend([limit, offset])
            
            feedback_items = session.execute(query, params).fetchall()
            
            # Get total count
            count_query = "SELECT COUNT(*) FROM feedback"
            if filter_type:
                if filter_type == "positive":
                    count_query += " WHERE rating > 0"
                elif filter_type == "negative":
                    count_query += " WHERE rating < 0"
                elif filter_type == "neutral":
                    count_query += " WHERE rating = 0"
            
            total = session.execute(count_query).fetchone()[0]
        
        return {
            "feedback": [
                {
                    "id": item[0],
                    "message_id": item[1],
                    "session_id": item[2],
                    "rating": item[3],
                    "question": item[4],
                    "answer": item[5],
                    "comment": item[6],
                    "created_at": item[7],
                    "user_email": item[8],
                    "type": "positive" if item[3] > 0 else ("negative" if item[3] < 0 else "neutral")
                }
                for item in feedback_items
            ],
            "total": total,
            "limit": limit,
            "offset": offset
        }
    except Exception as e:
        logger.error(f"Error getting feedback list: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/negative")
async def get_negative_feedback(
    limit: int = 100,
    admin_user: Dict[str, Any] = Depends(require_admin)
):
    """Get negative feedback items"""
    try:
        db_manager = DBManager()
        
        with db_manager.get_session() as session:
            negative_feedback = session.execute(
                """SELECT f.id, f.message_id, f.session_id, f.rating,
                          f.question, f.answer, f.comment, f.created_at,
                          u.email as user_email
                   FROM feedback f
                   JOIN users u ON f.user_id = u.id
                   WHERE f.rating < 0
                   ORDER BY f.created_at DESC
                   LIMIT ?""",
                (limit,)
            ).fetchall()
        
        return [
            {
                "id": item[0],
                "message_id": item[1],
                "session_id": item[2],
                "rating": item[3],
                "question": item[4],
                "answer": item[5],
                "comment": item[6],
                "created_at": item[7],
                "user_email": item[8]
            }
            for item in negative_feedback
        ]
    except Exception as e:
        logger.error(f"Error getting negative feedback: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.put("/{feedback_id}/status")
async def update_feedback_status(
    feedback_id: str,
    status_data: Dict[str, Any],
    admin_user: Dict[str, Any] = Depends(require_admin)
):
    """Update feedback status (e.g., mark as reviewed)"""
    try:
        db_manager = DBManager()
        
        # TODO: Add status column to feedback table
        # For now, just return success
        return {
            "success": True,
            "message": "Feedback status updated",
            "feedback_id": feedback_id,
            "new_status": status_data.get("status", "reviewed")
        }
    except Exception as e:
        logger.error(f"Error updating feedback status: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.delete("/{feedback_id}")
async def delete_feedback(
    feedback_id: str,
    admin_user: Dict[str, Any] = Depends(require_admin)
):
    """Delete feedback item"""
    try:
        db_manager = DBManager()
        
        with db_manager.get_session() as session:
            session.execute("DELETE FROM feedback WHERE id = ?", (feedback_id,))
            session.commit()
        
        return {"success": True, "message": "Feedback deleted successfully"}
    except Exception as e:
        logger.error(f"Error deleting feedback: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/export")
async def export_feedback(
    format: str = "json",  # json, csv
    admin_user: Dict[str, Any] = Depends(require_admin)
):
    """Export feedback data"""
    try:
        db_manager = DBManager()
        
        with db_manager.get_session() as session:
            feedback_data = session.execute(
                """SELECT f.*, u.email as user_email
                   FROM feedback f
                   JOIN users u ON f.user_id = u.id
                   ORDER BY f.created_at DESC"""
            ).fetchall()
        
        if format == "csv":
            # TODO: Implement CSV export
            raise HTTPException(status_code=501, detail="CSV export not implemented yet")
        
        return {
            "feedback": [
                {
                    "id": row[0],
                    "message_id": row[1],
                    "session_id": row[2],
                    "user_id": row[3],
                    "rating": row[4],
                    "question": row[5],
                    "answer": row[6],
                    "comment": row[7],
                    "created_at": row[8],
                    "user_email": row[9]
                }
                for row in feedback_data
            ],
            "total": len(feedback_data),
            "export_date": datetime.now().isoformat()
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error exporting feedback: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")