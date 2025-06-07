"""
Main Admin Routes - Dashboard, Users, Statistics
"""

from fastapi import APIRouter, HTTPException, Depends, Request
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
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

@router.get("/dashboard/summary")
async def get_dashboard_summary(
    admin_user: Dict[str, Any] = Depends(require_admin)
):
    """Get dashboard summary statistics"""
    try:
        db_manager = DBManager()
        
        # Get user statistics
        with db_manager.get_session() as session:
            total_users = session.execute("SELECT COUNT(*) FROM users").fetchone()[0]
            # Since is_active doesn't exist, count users who logged in recently
            active_users = session.execute(
                "SELECT COUNT(*) FROM users WHERE last_login > strftime('%s', 'now', '-30 days')"
            ).fetchone()[0]
            
            # Get session statistics
            total_sessions = session.execute("SELECT COUNT(*) FROM chat_sessions").fetchone()[0]
            today_sessions = session.execute(
                "SELECT COUNT(*) FROM chat_sessions WHERE DATE(created_at) = DATE('now')"
            ).fetchone()[0]
            
            # Get message statistics
            total_messages = session.execute("SELECT COUNT(*) FROM chat_messages").fetchone()[0]
            today_messages = session.execute(
                "SELECT COUNT(*) FROM chat_messages WHERE DATE(created_at) = DATE('now')"
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
                "active": 0  # TODO: Implement active session tracking
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
        logger.error(f"Error getting dashboard summary: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/users")
async def get_users(
    limit: int = 100,
    offset: int = 0,
    admin_user: Dict[str, Any] = Depends(require_admin)
):
    """Get all users"""
    try:
        db_manager = DBManager()
        
        with db_manager.get_session() as session:
            users = session.execute(
                """SELECT id, email, displayName, role, created_at, is_active 
                   FROM users 
                   ORDER BY created_at DESC 
                   LIMIT ? OFFSET ?""",
                (limit, offset)
            ).fetchall()
            
            total = session.execute("SELECT COUNT(*) FROM users").fetchone()[0]
        
        return {
            "users": [
                {
                    "id": str(user[0]),
                    "email": user[1],
                    "displayName": user[2],
                    "role": user[3],
                    "created_at": user[4],
                    "is_active": bool(user[5])
                }
                for user in users
            ],
            "total": total,
            "limit": limit,
            "offset": offset
        }
    except Exception as e:
        logger.error(f"Error getting users: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.put("/users/{user_id}")
async def update_user(
    user_id: str,
    user_data: Dict[str, Any],
    admin_user: Dict[str, Any] = Depends(require_admin)
):
    """Update user information"""
    try:
        db_manager = DBManager()
        
        with db_manager.get_session() as session:
            # Update user
            session.execute(
                """UPDATE users 
                   SET displayName = ?, role = ?, is_active = ?
                   WHERE id = ?""",
                (
                    user_data.get("displayName"),
                    user_data.get("role"),
                    1 if user_data.get("is_active") else 0,
                    user_id
                )
            )
            session.commit()
        
        return {"success": True, "message": "User updated successfully"}
    except Exception as e:
        logger.error(f"Error updating user: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.delete("/users/{user_id}")
async def delete_user(
    user_id: str,
    admin_user: Dict[str, Any] = Depends(require_admin)
):
    """Delete a user"""
    try:
        if user_id == str(admin_user.get("user_id")):
            raise HTTPException(status_code=400, detail="Cannot delete yourself")
        
        db_manager = DBManager()
        
        with db_manager.get_session() as session:
            # Soft delete - just deactivate
            session.execute(
                "UPDATE users SET is_active = 0 WHERE id = ?",
                (user_id,)
            )
            session.commit()
        
        return {"success": True, "message": "User deactivated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting user: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/statistics")
async def get_statistics(
    days: int = 7,
    admin_user: Dict[str, Any] = Depends(require_admin)
):
    """Get system statistics for the specified time period"""
    try:
        db_manager = DBManager()
        
        with db_manager.get_session() as session:
            # Get daily message counts
            daily_messages = session.execute(
                """SELECT DATE(created_at) as date, COUNT(*) as count
                   FROM chat_messages
                   WHERE created_at >= DATE('now', ?) 
                   GROUP BY DATE(created_at)
                   ORDER BY date""",
                (f'-{days} days',)
            ).fetchall()
            
            # Get daily session counts
            daily_sessions = session.execute(
                """SELECT DATE(created_at) as date, COUNT(*) as count
                   FROM chat_sessions
                   WHERE created_at >= DATE('now', ?)
                   GROUP BY DATE(created_at)
                   ORDER BY date""",
                (f'-{days} days',)
            ).fetchall()
            
            # Get user activity
            active_users = session.execute(
                """SELECT COUNT(DISTINCT user_id)
                   FROM chat_messages
                   WHERE created_at >= DATE('now', ?)""",
                (f'-{days} days',)
            ).fetchone()[0]
        
        return {
            "period": f"Last {days} days",
            "messages_per_day": [
                {"date": row[0], "count": row[1]} for row in daily_messages
            ],
            "sessions_per_day": [
                {"date": row[0], "count": row[1]} for row in daily_sessions
            ],
            "active_users": active_users,
            "average_messages_per_day": sum(row[1] for row in daily_messages) / max(len(daily_messages), 1),
            "average_sessions_per_day": sum(row[1] for row in daily_sessions) / max(len(daily_sessions), 1)
        }
    except Exception as e:
        logger.error(f"Error getting statistics: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/activity")
async def get_recent_activity(
    limit: int = 50,
    admin_user: Dict[str, Any] = Depends(require_admin)
):
    """Get recent system activity"""
    try:
        db_manager = DBManager()
        
        with db_manager.get_session() as session:
            # Get recent messages
            recent_messages = session.execute(
                """SELECT m.id, m.created_at, m.role, m.content, 
                          s.title as session_title, u.email as user_email
                   FROM chat_messages m
                   JOIN chat_sessions s ON m.session_id = s.id
                   JOIN users u ON m.user_id = u.id
                   ORDER BY m.created_at DESC
                   LIMIT ?""",
                (limit,)
            ).fetchall()
        
        return {
            "activities": [
                {
                    "id": msg[0],
                    "timestamp": msg[1],
                    "type": "message",
                    "role": msg[2],
                    "content": msg[3][:100] + "..." if len(msg[3]) > 100 else msg[3],
                    "session_title": msg[4],
                    "user_email": msg[5]
                }
                for msg in recent_messages
            ],
            "total": len(recent_messages)
        }
    except Exception as e:
        logger.error(f"Error getting recent activity: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")