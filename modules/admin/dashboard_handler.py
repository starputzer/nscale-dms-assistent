"""
Admin Dashboard Handler
Provides dashboard statistics and overview data
"""

from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from fastapi import Depends

from ..core.base_routes import BaseRouteHandler
from ..core.performance import PerformanceMonitor


class AdminDashboardHandler(BaseRouteHandler):
    """Handler for admin dashboard endpoints"""
    
    def __init__(self):
        """Initialize dashboard handler"""
        super().__init__()
        self.performance_monitor = PerformanceMonitor()
    
    def _setup_routes(self):
        """Setup dashboard routes"""
        # Register routes with admin dependency
        from ..core.auth_dependency import require_admin
        
        @self.router.get("/summary")
        async def get_dashboard_summary(admin_user: Dict[str, Any] = Depends(require_admin)):
            return await self.get_dashboard_summary(admin_user)
        
        @self.router.get("/activity")
        async def get_recent_activity(admin_user: Dict[str, Any] = Depends(require_admin), limit: int = 50):
            return await self.get_recent_activity(admin_user, limit)
        
        @self.router.get("/performance")
        async def get_performance_metrics(admin_user: Dict[str, Any] = Depends(require_admin)):
            return await self.get_performance_metrics(admin_user)
        
        @self.router.get("/alerts")
        async def get_system_alerts(admin_user: Dict[str, Any] = Depends(require_admin)):
            return await self.get_system_alerts(admin_user)
    
    async def get_dashboard_summary(self, admin_user: Dict[str, Any]):
        """Get dashboard summary statistics"""
            
        try:
            with self.get_db_session() as session:
                # Get user statistics
                total_users = session.execute("SELECT COUNT(*) FROM users").fetchone()[0]
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
                
                # Get feedback statistics
                feedback_stats = self._get_feedback_stats(session)
                
                # Get system health
                system_health = self._get_system_health()
            
            return self.build_response(
                data={
                    "users": {
                        "total": total_users,
                        "active": active_users,
                        "inactive": total_users - active_users
                    },
                    "sessions": {
                        "total": total_sessions,
                        "today": today_sessions,
                        "active": self._count_active_sessions()
                    },
                    "messages": {
                        "total": total_messages,
                        "today": today_messages
                    },
                    "feedback": feedback_stats,
                    "system": system_health
                }
            )
            
        except Exception as e:
            self.handle_error(e, "Error getting dashboard summary")
    
    async def get_recent_activity(self, 
                                  admin_user: Dict[str, Any],
                                  limit: int = 50):
        """Get recent system activity"""
            
        try:
            with self.get_db_session() as session:
                # Get recent messages
                recent_messages = session.execute("""
                    SELECT 
                        m.id,
                        m.content,
                        m.created_at,
                        s.user_id,
                        u.email
                    FROM chat_messages m
                    JOIN chat_sessions s ON m.session_id = s.id
                    JOIN users u ON s.user_id = u.id
                    ORDER BY m.created_at DESC
                    LIMIT ?
                """, (limit,)).fetchall()
                
                # Get recent sessions
                recent_sessions = session.execute("""
                    SELECT 
                        s.id,
                        s.title,
                        s.created_at,
                        u.email,
                        COUNT(m.id) as message_count
                    FROM chat_sessions s
                    JOIN users u ON s.user_id = u.id
                    LEFT JOIN chat_messages m ON s.id = m.session_id
                    GROUP BY s.id
                    ORDER BY s.created_at DESC
                    LIMIT ?
                """, (limit,)).fetchall()
            
            return self.build_response(
                data={
                    "recent_messages": [
                        {
                            "id": msg[0],
                            "content": msg[1][:100] + "..." if len(msg[1]) > 100 else msg[1],
                            "created_at": msg[2],
                            "user_id": msg[3],
                            "user_email": msg[4]
                        }
                        for msg in recent_messages
                    ],
                    "recent_sessions": [
                        {
                            "id": sess[0],
                            "title": sess[1],
                            "created_at": sess[2],
                            "user_email": sess[3],
                            "message_count": sess[4]
                        }
                        for sess in recent_sessions
                    ]
                }
            )
            
        except Exception as e:
            self.handle_error(e, "Error getting recent activity")
    
    async def get_performance_metrics(self, admin_user: Dict[str, Any]):
        """Get system performance metrics"""
            
        try:
            metrics = self.performance_monitor.get_current_metrics()
            
            # Add database performance metrics
            with self.get_db_session() as session:
                db_size = session.execute("""
                    SELECT page_count * page_size as size
                    FROM pragma_page_count, pragma_page_size
                """).fetchone()[0]
                
                metrics["database"] = {
                    "size_mb": round(db_size / 1024 / 1024, 2),
                    "connections": 1  # SQLite doesn't have connection pool
                }
            
            return self.build_response(data=metrics)
            
        except Exception as e:
            self.handle_error(e, "Error getting performance metrics")
    
    async def get_system_alerts(self, admin_user: Dict[str, Any]):
        """Get system alerts and warnings"""
            
        alerts = []
        
        try:
            # Check system resources
            metrics = self.performance_monitor.get_current_metrics()
            
            if metrics["cpu_percent"] > 80:
                alerts.append({
                    "level": "warning",
                    "type": "performance",
                    "message": f"High CPU usage: {metrics['cpu_percent']}%",
                    "timestamp": datetime.now().isoformat()
                })
            
            if metrics["memory_percent"] > 80:
                alerts.append({
                    "level": "warning", 
                    "type": "performance",
                    "message": f"High memory usage: {metrics['memory_percent']}%",
                    "timestamp": datetime.now().isoformat()
                })
            
            # Check for errors in logs
            error_count = self._count_recent_errors()
            if error_count > 10:
                alerts.append({
                    "level": "error",
                    "type": "errors",
                    "message": f"{error_count} errors in the last hour",
                    "timestamp": datetime.now().isoformat()
                })
            
            return self.build_response(
                data={
                    "alerts": alerts,
                    "total": len(alerts)
                }
            )
            
        except Exception as e:
            self.handle_error(e, "Error getting system alerts")
    
    def _get_feedback_stats(self, session) -> Dict[str, Any]:
        """Get feedback statistics"""
        try:
            total_feedback = session.execute(
                "SELECT COUNT(*) FROM message_feedback"
            ).fetchone()[0]
            
            positive_feedback = session.execute(
                "SELECT COUNT(*) FROM message_feedback WHERE rating = 1"
            ).fetchone()[0]
            
            negative_feedback = session.execute(
                "SELECT COUNT(*) FROM message_feedback WHERE rating = -1"
            ).fetchone()[0]
            
            return {
                "total": total_feedback,
                "positive": positive_feedback,
                "negative": negative_feedback,
                "neutral": total_feedback - positive_feedback - negative_feedback
            }
        except:
            return {
                "total": 0,
                "positive": 0,
                "negative": 0,
                "neutral": 0
            }
    
    def _get_system_health(self) -> Dict[str, Any]:
        """Get system health status"""
        # Get basic system info
        uptime_str = self.performance_monitor.get_uptime()
        # Extract days from the uptime string (e.g., "48h 30m" -> 2 days)
        # For now, just use the string directly
        
        return {
            "status": "healthy",  # Could be enhanced with real health checks
            "uptime": uptime_str,
            "version": "2.0.0",
            "last_check": datetime.now().isoformat()
        }
    
    def _count_active_sessions(self) -> int:
        """Count currently active sessions (accessed in last 30 minutes)"""
        try:
            with self.get_db_session() as session:
                # Count sessions with recent activity
                active_count = session.execute("""
                    SELECT COUNT(DISTINCT s.id)
                    FROM chat_sessions s
                    JOIN chat_messages m ON s.id = m.session_id
                    WHERE m.created_at > strftime('%s', 'now', '-30 minutes')
                """).fetchone()[0]
                
                return active_count
        except:
            return 0
    
    def _count_recent_errors(self, hours: int = 1) -> int:
        """Count recent errors in logs"""
        # This would typically check actual log files or error tracking system
        # For now, return mock data
        return 0


# Create handler instance
dashboard_handler = AdminDashboardHandler()