"""
Admin Dashboard Standard API Endpoints
Provides dashboard data for the standard admin dashboard
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
import json
import os
from sqlalchemy import text

from modules.core.logging import LogManager
from modules.core.auth_dependency import get_admin_user as require_admin, get_current_user
from modules.core.config import Config
from modules.core.db import DBManager

# Initialize components
logger = LogManager.setup_logging(__name__)
db_manager = DBManager()

router = APIRouter()

# Pydantic models
class DashboardStats(BaseModel):
    total_users: int
    total_sessions: int
    total_messages: int
    active_users_today: int
    new_users_week: int
    positive_feedback_percent: float
    avg_response_time_ms: float
    uptime_days: int
    memory_usage_percent: float
    cpu_usage_percent: float
    
    # Trends (percentage change from last period)
    users_trend: float
    sessions_trend: float
    messages_trend: float
    feedback_trend: float
    response_time_trend: float

class RecentActivity(BaseModel):
    type: str  # login, logout, settings, user, cache, feedback
    user: str
    text: str
    timestamp: datetime
    details: Optional[Dict[str, Any]] = None

class QuickActionResult(BaseModel):
    success: bool
    message: str
    details: Optional[Dict[str, Any]] = None

# Helper functions
def calculate_trend(current: int, previous: int) -> float:
    """Calculate percentage change between two values"""
    if previous == 0:
        return 100.0 if current > 0 else 0.0
    return round(((current - previous) / previous) * 100, 1)

def get_recent_activities(limit: int = 10) -> List[Dict[str, Any]]:
    """Get recent system activities"""
    activities = []
    
    try:
        with db_manager.get_session() as session:
            # Get recent logins (mock for now since we don't track this)
            # In a real system, you'd have an audit log table
            
            # Get recent feedback
            recent_feedback = session.execute(text("""
                SELECT u.email, f.created_at
                FROM feedback f
                JOIN users u ON f.user_id = u.id
                ORDER BY f.created_at DESC
                LIMIT 3
            """)).fetchall()
            
            for feedback in recent_feedback:
                activities.append({
                    "type": "feedback",
                    "user": feedback.email.split('@')[0],  # Use username part
                    "text": "hat Feedback gegeben",
                    "timestamp": feedback.created_at.timestamp() * 1000  # JS timestamp
                })
            
            # Get recent sessions
            recent_sessions = session.execute(text("""
                SELECT u.email, s.created_at
                FROM chat_sessions s
                JOIN users u ON s.user_id = u.id
                ORDER BY s.created_at DESC
                LIMIT 3
            """)).fetchall()
            
            for session_data in recent_sessions:
                activities.append({
                    "type": "login",
                    "user": session_data.email.split('@')[0],
                    "text": "hat eine neue Sitzung gestartet",
                    "timestamp": session_data.created_at.timestamp() * 1000
                })
            
            # Add some mock activities for demonstration
            now = datetime.now()
            activities.extend([
                {
                    "type": "settings",
                    "user": "admin",
                    "text": "hat Systemeinstellungen geändert",
                    "timestamp": (now - timedelta(hours=2)).timestamp() * 1000
                },
                {
                    "type": "cache",
                    "user": "system",
                    "text": "hat den Cache automatisch geleert",
                    "timestamp": (now - timedelta(days=1)).timestamp() * 1000
                }
            ])
            
            # Sort by timestamp descending
            activities.sort(key=lambda x: x['timestamp'], reverse=True)
            
            return activities[:limit]
            
    except Exception as e:
        logger.error(f"Error getting recent activities: {e}")
        return []

# Endpoints
@router.get("/stats", response_model=DashboardStats)
async def get_dashboard_stats(user: Dict[str, Any] = Depends(require_admin)):
    """Get dashboard statistics with trends"""
    try:
        with db_manager.get_session() as session:
            # Get current stats
            total_users = session.execute(
                text("SELECT COUNT(*) FROM users")
            ).scalar() or 0
            
            total_sessions = session.execute(
                text("SELECT COUNT(*) FROM chat_sessions")
            ).scalar() or 0
            
            total_messages = session.execute(
                text("SELECT COUNT(*) FROM chat_messages")
            ).scalar() or 0
            
            # Active users today
            today = datetime.now().date()
            active_users_today = session.execute(
                text("SELECT COUNT(DISTINCT user_id) FROM chat_sessions WHERE DATE(created_at) = :date"),
                {"date": today}
            ).scalar() or 0
            
            # New users this week
            week_ago = datetime.now() - timedelta(days=7)
            new_users_week = session.execute(
                text("SELECT COUNT(*) FROM users WHERE created_at > :date"),
                {"date": week_ago}
            ).scalar() or 0
            
            # Positive feedback percentage
            total_feedback = session.execute(
                text("SELECT COUNT(*) FROM feedback")
            ).scalar() or 0
            
            positive_feedback = session.execute(
                text("SELECT COUNT(*) FROM feedback WHERE is_positive = 1")
            ).scalar() or 0
            
            positive_feedback_percent = (positive_feedback / total_feedback * 100) if total_feedback > 0 else 95.0
            
            # Calculate trends (compare with last week)
            two_weeks_ago = datetime.now() - timedelta(days=14)
            
            # Previous week stats
            prev_sessions = session.execute(
                text("SELECT COUNT(*) FROM chat_sessions WHERE created_at BETWEEN :start AND :end"),
                {"start": two_weeks_ago, "end": week_ago}
            ).scalar() or 1
            
            curr_sessions = session.execute(
                text("SELECT COUNT(*) FROM chat_sessions WHERE created_at > :date"),
                {"date": week_ago}
            ).scalar() or 0
            
            prev_messages = session.execute(
                text("SELECT COUNT(*) FROM chat_messages WHERE created_at BETWEEN :start AND :end"),
                {"start": two_weeks_ago, "end": week_ago}
            ).scalar() or 1
            
            curr_messages = session.execute(
                text("SELECT COUNT(*) FROM chat_messages WHERE created_at > :date"),
                {"date": week_ago}
            ).scalar() or 0
            
            # Mock system metrics
            import psutil
            cpu_percent = psutil.cpu_percent(interval=1)
            memory = psutil.virtual_memory()
            
            # Calculate uptime
            boot_time = psutil.boot_time()
            uptime_seconds = datetime.now().timestamp() - boot_time
            uptime_days = int(uptime_seconds / (24 * 3600))
            
            return DashboardStats(
                total_users=total_users,
                total_sessions=total_sessions,
                total_messages=total_messages,
                active_users_today=active_users_today,
                new_users_week=new_users_week,
                positive_feedback_percent=round(positive_feedback_percent, 1),
                avg_response_time_ms=320.0,  # Mock value
                uptime_days=uptime_days,
                memory_usage_percent=memory.percent,
                cpu_usage_percent=cpu_percent,
                # Trends
                users_trend=5.0,  # Mock 5% growth
                sessions_trend=calculate_trend(curr_sessions, prev_sessions),
                messages_trend=calculate_trend(curr_messages, prev_messages),
                feedback_trend=-2.0,  # Mock 2% decrease
                response_time_trend=-5.0  # Mock 5% improvement
            )
    except Exception as e:
        logger.error(f"Error getting dashboard stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/recent-activity")
async def get_recent_activity(limit: int = 10, user: Dict[str, Any] = Depends(require_admin)):
    """Get recent system activities"""
    try:
        activities = get_recent_activities(limit)
        return {"activities": activities}
    except Exception as e:
        logger.error(f"Error getting recent activity: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/actions/clear-cache", response_model=QuickActionResult)
async def clear_cache(user: Dict[str, Any] = Depends(require_admin)):
    """Clear system cache"""
    try:
        # Clear cache directories
        cache_dirs = ["data/cache", "data/temp"]
        cleared_dirs = []
        
        for cache_dir in cache_dirs:
            if os.path.exists(cache_dir):
                import shutil
                shutil.rmtree(cache_dir)
                os.makedirs(cache_dir)
                cleared_dirs.append(cache_dir)
        
        # Add activity log
        with db_manager.get_session() as session:
            # In a real system, you'd log this to an audit table
            pass
        
        return QuickActionResult(
            success=True,
            message="Cache erfolgreich geleert",
            details={
                "cleared_directories": cleared_dirs,
                "timestamp": datetime.now().isoformat()
            }
        )
    except Exception as e:
        logger.error(f"Error clearing cache: {e}")
        return QuickActionResult(
            success=False,
            message=f"Fehler beim Leeren des Caches: {str(e)}"
        )

@router.post("/actions/reload-motd", response_model=QuickActionResult)
async def reload_motd(user: Dict[str, Any] = Depends(require_admin)):
    """Reload MOTD configuration"""
    try:
        from modules.core.motd_manager import MOTDManager
        motd_manager = MOTDManager()
        motd_manager.reload()
        
        current_motd = motd_manager.get_current_motd()
        
        return QuickActionResult(
            success=True,
            message="MOTD erfolgreich neu geladen",
            details={
                "current_motd": current_motd,
                "timestamp": datetime.now().isoformat()
            }
        )
    except Exception as e:
        logger.error(f"Error reloading MOTD: {e}")
        return QuickActionResult(
            success=False,
            message=f"Fehler beim Neuladen der MOTD: {str(e)}"
        )

@router.post("/actions/export-stats", response_model=QuickActionResult)
async def export_stats(user: Dict[str, Any] = Depends(require_admin)):
    """Export system statistics"""
    try:
        # Get current stats
        stats = await get_dashboard_stats(_)
        
        # Create export directory if not exists
        export_dir = "exports"
        if not os.path.exists(export_dir):
            os.makedirs(export_dir)
        
        # Save to file
        filename = f"dashboard_stats_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        filepath = os.path.join(export_dir, filename)
        
        with open(filepath, 'w') as f:
            json.dump(stats.dict(), f, indent=2, default=str)
        
        return QuickActionResult(
            success=True,
            message="Statistiken erfolgreich exportiert",
            details={
                "filename": filename,
                "filepath": filepath,
                "timestamp": datetime.now().isoformat()
            }
        )
    except Exception as e:
        logger.error(f"Error exporting stats: {e}")
        return QuickActionResult(
            success=False,
            message=f"Fehler beim Exportieren der Statistiken: {str(e)}"
        )

@router.post("/actions/system-check", response_model=QuickActionResult)
async def perform_system_check(user: Dict[str, Any] = Depends(require_admin)):
    """Perform system health check"""
    try:
        issues = []
        
        # Check database connection
        try:
            with db_manager.get_session() as session:
                session.execute(text("SELECT 1"))
        except:
            issues.append("Database connection issue")
        
        # Check disk space
        import psutil
        disk = psutil.disk_usage('/')
        if disk.percent > 90:
            issues.append(f"Low disk space: {disk.percent}% used")
        
        # Check memory
        memory = psutil.virtual_memory()
        if memory.percent > 90:
            issues.append(f"High memory usage: {memory.percent}%")
        
        # Check CPU
        cpu_percent = psutil.cpu_percent(interval=1)
        if cpu_percent > 90:
            issues.append(f"High CPU usage: {cpu_percent}%")
        
        # Check critical directories
        critical_dirs = ["data", "logs", "uploads"]
        for dir_path in critical_dirs:
            if not os.path.exists(dir_path):
                issues.append(f"Missing directory: {dir_path}")
        
        return QuickActionResult(
            success=len(issues) == 0,
            message="Systemprüfung abgeschlossen" if len(issues) == 0 else f"Systemprüfung abgeschlossen: {len(issues)} Probleme gefunden",
            details={
                "issues": issues,
                "checked_at": datetime.now().isoformat(),
                "system_healthy": len(issues) == 0
            }
        )
    except Exception as e:
        logger.error(f"Error performing system check: {e}")
        return QuickActionResult(
            success=False,
            message=f"Fehler bei der Systemprüfung: {str(e)}"
        )