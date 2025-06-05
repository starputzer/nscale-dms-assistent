import sqlite3
"""
Admin Statistics API Endpoints
Provides comprehensive statistical data for the admin panel
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
import json
import random
from collections import defaultdict

from modules.core.logging import LogManager
from modules.core.auth_dependency import get_admin_user as require_admin, get_current_user
from modules.core.db import DBManager

# Initialize components
logger = LogManager.setup_logging(__name__)
db_manager = DBManager()

router = APIRouter()

# Pydantic models
class StatisticsSummary(BaseModel):
    total_users: int
    active_users_today: int
    new_users_this_week: int
    total_sessions: int
    total_messages: int
    avg_messages_per_session: float
    total_feedback: int
    positive_feedback_percentage: float

class TimeRangeData(BaseModel):
    labels: List[str]
    datasets: List[Dict[str, Any]]

class UserSegmentation(BaseModel):
    label: str
    count: int
    percentage: float
    color: str

class FeedbackRating(BaseModel):
    rating: int
    count: int
    percentage: float

class PerformanceMetric(BaseModel):
    metric_name: str
    current_value: float
    average_value: float
    trend: str  # up, down, stable
    change_percentage: float

class SessionDistribution(BaseModel):
    by_time: Dict[str, int]  # hour -> count
    by_duration: Dict[str, int]  # duration range -> count
    by_messages: Dict[str, int]  # message range -> count
    by_device: Dict[str, int]  # device type -> count

# Helper functions
def get_time_range_filter(range_type: str) -> tuple:
    """Get start and end datetime based on range type"""
    now = datetime.now()
    
    if range_type == "day":
        start = now - timedelta(days=1)
    elif range_type == "week":
        start = now - timedelta(weeks=1)
    elif range_type == "month":
        start = now - timedelta(days=30)
    elif range_type == "year":
        start = now - timedelta(days=365)
    else:
        start = now - timedelta(weeks=1)  # default to week
    
    return start, now

def generate_time_labels(range_type: str) -> List[str]:
    """Generate time labels based on range type"""
    if range_type == "day":
        return [f"{i:02d}:00" for i in range(0, 24, 3)]  # Every 3 hours
    elif range_type == "week":
        return ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"]
    elif range_type == "month":
        return [f"Woche {i}" for i in range(1, 5)]
    elif range_type == "year":
        return ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"]
    else:
        return ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"]

# Endpoints
@router.get("/summary", response_model=StatisticsSummary)
async def get_statistics_summary(user: Dict[str, Any] = Depends(require_admin)):
    """Get overall statistics summary"""
    try:
        # Get real data from database
        conn = db_manager.get_connection()
        cursor = conn.cursor()
            
        # Total users
        cursor.execute("SELECT COUNT(*) FROM users")
        total_users = cursor.fetchone()[0]
            
        # Active users today
        today_start = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
        cursor.execute("""
                SELECT COUNT(DISTINCT user_id)
                FROM chat_sessions
                WHERE updated_at >= ?
            """, (today_start.timestamp(),))
        active_users_today = cursor.fetchone()[0]
            
        # New users this week
        week_ago = datetime.now() - timedelta(weeks=1)
        cursor.execute("""
                SELECT COUNT(*)
                FROM users
                WHERE created_at >= ?
            """, (week_ago.timestamp(),))
        new_users_this_week = cursor.fetchone()[0]
            
        # Total sessions
        cursor.execute("SELECT COUNT(*) FROM chat_sessions")
        total_sessions = cursor.fetchone()[0]
            
        # Total messages
        cursor.execute("SELECT COUNT(*) FROM chat_messages")
        total_messages = cursor.fetchone()[0]
            
        # Average messages per session
        avg_messages_per_session = total_messages / total_sessions if total_sessions > 0 else 0
            
        # Total feedback
        cursor.execute("SELECT COUNT(*) FROM feedback")
        total_feedback = cursor.fetchone()[0]
            
        # Positive feedback percentage
        cursor.execute("SELECT COUNT(*) FROM feedback WHERE is_positive = 1")
        positive_feedback = cursor.fetchone()[0]
        positive_feedback_percentage = (positive_feedback / total_feedback * 100) if total_feedback > 0 else 0
        
        return StatisticsSummary(
            total_users=total_users,
            active_users_today=active_users_today,
            new_users_this_week=new_users_this_week,
            total_sessions=total_sessions,
            total_messages=total_messages,
            avg_messages_per_session=round(avg_messages_per_session, 1),
            total_feedback=total_feedback,
            positive_feedback_percentage=round(positive_feedback_percentage, 1)
        )
    except Exception as e:
        logger.error(f"Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    
