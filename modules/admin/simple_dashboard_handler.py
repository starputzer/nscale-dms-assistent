"""
Simple Admin Dashboard Handler for Testing
"""

from fastapi import APIRouter, Depends, HTTPException
from typing import Dict, Any
import logging

from ..core.auth_dependency import require_admin
from ..core.db import DBManager

logger = logging.getLogger(__name__)

# Create router directly
router = APIRouter()

@router.get("/summary")
async def get_dashboard_summary(admin_user: Dict[str, Any] = Depends(require_admin)):
    """Get dashboard summary statistics"""
    try:
        db_manager = DBManager()
        
        # Get user statistics
        with db_manager.get_session() as session:
            total_users = session.execute("SELECT COUNT(*) FROM users").fetchone()[0]
            active_users = session.execute(
                "SELECT COUNT(*) FROM users WHERE last_login > strftime('%s', 'now', '-30 days')"
            ).fetchone()[0]
            
            # Get session statistics
            total_sessions = session.execute("SELECT COUNT(*) FROM chat_sessions").fetchone()[0]
            today_sessions = session.execute(
                "SELECT COUNT(*) FROM chat_sessions WHERE DATE(datetime(created_at, 'unixepoch')) = DATE('now')"
            ).fetchone()[0]
            
            # Get message statistics
            total_messages = session.execute("SELECT COUNT(*) FROM chat_messages").fetchone()[0]
            today_messages = session.execute(
                "SELECT COUNT(*) FROM chat_messages WHERE DATE(datetime(created_at, 'unixepoch')) = DATE('now')"
            ).fetchone()[0]
        
        return {
            "users": {
                "total": total_users,
                "active": active_users,
                "inactive": total_users - active_users
            },
            "sessions": {
                "total": total_sessions,
                "today": today_sessions,
                "active": 0
            },
            "messages": {
                "total": total_messages,
                "today": today_messages
            },
            "system": {
                "status": "healthy",
                "uptime": "2 days",
                "version": "2.0.0"
            }
        }
    except Exception as e:
        logger.error(f"Error getting dashboard summary: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/activity")
async def get_recent_activity(admin_user: Dict[str, Any] = Depends(require_admin)):
    """Get recent activity for dashboard"""
    try:
        db_manager = DBManager()
        
        with db_manager.get_session() as session:
            # Get recent user logins
            recent_logins = session.execute("""
                SELECT email, last_login 
                FROM users 
                WHERE last_login IS NOT NULL 
                ORDER BY last_login DESC 
                LIMIT 5
            """).fetchall()
            
            # Get recent chat sessions
            recent_sessions = session.execute("""
                SELECT s.title, s.created_at, u.email 
                FROM chat_sessions s 
                JOIN users u ON s.user_id = u.id 
                ORDER BY s.created_at DESC 
                LIMIT 5
            """).fetchall()
            
            # Combine activities
            activities = []
            
            for email, last_login in recent_logins:
                activities.append({
                    "type": "login",
                    "user": email,
                    "text": "hat sich angemeldet",
                    "timestamp": last_login
                })
            
            for title, created_at, email in recent_sessions:
                activities.append({
                    "type": "chat",
                    "user": email,
                    "text": f"hat eine neue Chat-Sitzung gestartet: {title or 'Unbenannt'}",
                    "timestamp": created_at
                })
            
            # Sort by timestamp and limit to 10
            activities.sort(key=lambda x: x['timestamp'], reverse=True)
            activities = activities[:10]
            
        return {
            "activities": activities
        }
    except Exception as e:
        logger.error(f"Error getting recent activity: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))