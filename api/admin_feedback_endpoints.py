import sqlite3
"""
Admin Feedback API Endpoints
Provides comprehensive feedback management functionality for admin panel
"""

from fastapi import APIRouter, HTTPException, Depends, Query, Response
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
import json
import csv
import io

from modules.core.logging import LogManager
from modules.core.auth_dependency import get_admin_user as require_admin, get_current_user
from modules.core.db import DBManager
from modules.feedback.feedback_manager import FeedbackManager

# Initialize components
logger = LogManager.setup_logging(__name__)
db_manager = DBManager()
feedback_manager = FeedbackManager()

router = APIRouter()

# Pydantic models
class FeedbackEntry(BaseModel):
    id: str
    message_id: str
    session_id: str
    user_id: str
    user_email: str
    is_positive: bool
    comment: Optional[str] = None
    question: str
    answer: str
    created_at: int
    status: str = "unresolved"

class FeedbackStats(BaseModel):
    total: int
    positive: int
    negative: int
    positive_percent: float
    with_comments: int
    unresolved: int
    feedback_by_day: List[Dict[str, Any]]

class FeedbackFilter(BaseModel):
    date_from: Optional[int] = None
    date_to: Optional[int] = None
    has_comment: Optional[bool] = None
    search_term: Optional[str] = None
    is_positive: Optional[bool] = None
    status: Optional[str] = None

class StatusUpdate(BaseModel):
    status: str = Field(pattern="^(resolved|unresolved|in_progress|ignored)$")

class ExportFormat(BaseModel):
    format: str = Field(pattern="^(csv|json)$")
    fields: List[str] = Field(default_factory=lambda: ["created_at", "user_email", "is_positive", "question", "answer", "comment"])

# Helper functions
def get_feedback_entries(limit: int = 100, filter_params: Optional[FeedbackFilter] = None) -> List[FeedbackEntry]:
    """Get feedback entries from database with optional filtering"""
    conn = db_manager.get_connection()
    cursor = conn.cursor()
        
    # Build query with filters
    query = """
    SELECT f.*, u.email as user_email
    FROM feedback f
    LEFT JOIN users u ON f.user_id = u.id
    WHERE 1=1
    """
    params = []
    
    if filter_params:
        if filter_params.date_from:
            query += " AND f.created_at >= ?"
            params.append(filter_params.date_from)
        
        if filter_params.date_to:
            query += " AND f.created_at <= ?"
            params.append(filter_params.date_to)
        
        if filter_params.is_positive is not None:
            query += " AND f.is_positive = ?"
            params.append(1 if filter_params.is_positive else 0)
        
        if filter_params.has_comment is not None:
            if filter_params.has_comment:
                query += " AND f.comment IS NOT NULL AND f.comment != ''"
            else:
                query += " AND (f.comment IS NULL OR f.comment = '')"
        
        if filter_params.search_term:
            query += " AND (f.question LIKE ? OR f.answer LIKE ? OR f.comment LIKE ? OR u.email LIKE ?)"
            search_pattern = f"%{filter_params.search_term}%"
            params.extend([search_pattern, search_pattern, search_pattern, search_pattern])
        
        if filter_params.status:
            query += " AND f.status = ?"
            params.append(filter_params.status)
    
    query += " ORDER BY f.created_at DESC LIMIT ?"
    params.append(limit)
    
    cursor.execute(query, params)
    rows = cursor.fetchall()
    
    entries = []
    for row in rows:
        entries.append(FeedbackEntry(
            id=row['id'],
            message_id=row['message_id'],
            session_id=row['session_id'],
            user_id=row['user_id'],
            user_email=row['user_email'] or 'unknown@example.com',
            is_positive=bool(row['is_positive']),
            comment=row.get('comment'),
            question=row['question'],
            answer=row['answer'],
            created_at=row['created_at'],
            status=row.get('status', 'unresolved')
        ))
    
    return entries

# Endpoints
@router.get("/stats", response_model=FeedbackStats)
async def get_feedback_stats(user: Dict[str, Any] = Depends(require_admin)):
    """Get comprehensive feedback statistics"""
    try:
        conn = db_manager.get_connection()
        cursor = conn.cursor()
            
        # Get total feedback count
        cursor.execute("SELECT COUNT(*) FROM feedback")
        total = cursor.fetchone()[0]
            
        # Get positive/negative counts
        cursor.execute("SELECT COUNT(*) FROM feedback WHERE is_positive = 1")
        positive = cursor.fetchone()[0]
        negative = total - positive
            
        # Get feedback with comments
        cursor.execute("SELECT COUNT(*) FROM feedback WHERE comment IS NOT NULL AND comment != ''")
        with_comments = cursor.fetchone()[0]
            
        # Get unresolved feedback
        cursor.execute("SELECT COUNT(*) FROM feedback WHERE status = 'unresolved' OR status IS NULL")
        unresolved = cursor.fetchone()[0]
            
        # Calculate positive percentage
        positive_percent = round((positive / total * 100) if total > 0 else 0, 1)
            
        # Get feedback by day for last 7 days
        feedback_by_day = []
        now = datetime.now()
        for i in range(7):
            date = now - timedelta(days=i)
            start_ts = int(date.replace(hour=0, minute=0, second=0).timestamp())
            end_ts = int(date.replace(hour=23, minute=59, second=59).timestamp())
            
            cursor.execute("""
                SELECT 
                    COUNT(*) as total,
                    SUM(CASE WHEN is_positive = 1 THEN 1 ELSE 0 END) as positive
                FROM feedback
                WHERE created_at >= ? AND created_at <= ?
            """, (start_ts, end_ts))
            
            row = cursor.fetchone()
            feedback_by_day.append({
                "date": date.strftime("%d.%m"),
                "count": row['total'],
                "positive": row['positive'],
                "negative": row['total'] - row['positive']
            })
            
        # Reverse to show oldest first
        feedback_by_day.reverse()
        
        return FeedbackStats(
            total=total,
            positive=positive,
            negative=negative,
            positive_percent=positive_percent,
            with_comments=with_comments,
            unresolved=unresolved,
            feedback_by_day=feedback_by_day
        )
    except Exception as e:
        logger.error(f"Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    

@router.post("/export")
async def export_feedback(
    export_params: ExportFormat,
    filter_params: Optional[FeedbackFilter] = None,
    user: Dict[str, Any] = Depends(require_admin)
):
    """Export feedback data in specified format"""
    try:
        # Get filtered feedback
        entries = get_feedback_entries(10000, filter_params)
        
        if export_params.format == "csv":
            # Create CSV
            output = io.StringIO()
            writer = csv.DictWriter(output, fieldnames=export_params.fields)
            writer.writeheader()
            
            for entry in entries:
                row = {}
                for field in export_params.fields:
                    if field == "created_at":
                        row[field] = datetime.fromtimestamp(entry.created_at).strftime("%Y-%m-%d %H:%M:%S")
                    elif field == "is_positive":
                        row[field] = "Positiv" if entry.is_positive else "Negativ"
                    else:
                        row[field] = getattr(entry, field, "")
                writer.writerow(row)
            
            output.seek(0)
            return Response(
                content=output.getvalue(),
                media_type="text/csv",
                headers={
                    "Content-Disposition": f"attachment; filename=feedback_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
                }
            )
        
        else:  # json
            # Create JSON
            data = []
            for entry in entries:
                item = {}
                for field in export_params.fields:
                    if field == "created_at":
                        item[field] = datetime.fromtimestamp(entry.created_at).isoformat()
                    else:
                        item[field] = getattr(entry, field, None)
                data.append(item)
            
            return Response(
                content=json.dumps(data, ensure_ascii=False, indent=2),
                media_type="application/json",
                headers={
                    "Content-Disposition": f"attachment; filename=feedback_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
                }
            )
    except Exception as e:
        logger.error(f"Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    
