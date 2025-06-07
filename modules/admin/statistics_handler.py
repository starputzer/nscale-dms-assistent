"""
Admin Statistics Handler
Provides comprehensive system statistics and analytics
"""

from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
import json

from ..core.base_routes import BaseRouteHandler
from fastapi import HTTPException, Depends
from ..core.auth_dependency import get_current_user


class AdminStatisticsHandler(BaseRouteHandler):
    """Handler for admin statistics endpoints"""
    
    def _setup_routes(self):
        """Setup statistics routes"""
        self.router.get("/summary")(self.get_statistics_summary)
        self.router.get("/usage-trend")(self.get_usage_trend)
        self.router.get("/user-segmentation")(self.get_user_segmentation)
        self.router.get("/feedback-ratings")(self.get_feedback_ratings)
        self.router.get("/performance-metrics")(self.get_performance_metrics)
        self.router.get("/session-distribution")(self.get_session_distribution)
        self.router.get("/export")(self.export_statistics)
    
    async def get_statistics_summary(self, admin_user: Dict[str, Any] = Depends(get_current_user)):
        """Get comprehensive statistics summary"""
        if admin_user.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
            
        try:
            with self.get_db_session() as session:
                # User statistics
                total_users = session.execute("SELECT COUNT(*) FROM users").fetchone()[0]
                active_users_30d = session.execute(
                    "SELECT COUNT(*) FROM users WHERE last_login > datetime('now', '-30 days')"
                ).fetchone()[0]
                new_users_7d = session.execute(
                    "SELECT COUNT(*) FROM users WHERE created_at > datetime('now', '-7 days')"
                ).fetchone()[0]
                
                # Session statistics
                total_sessions = session.execute("SELECT COUNT(*) FROM chat_sessions").fetchone()[0]
                avg_session_length = session.execute("""
                    SELECT AVG(message_count) FROM (
                        SELECT COUNT(*) as message_count 
                        FROM chat_messages 
                        GROUP BY session_id
                    )
                """).fetchone()[0] or 0
                
                # Message statistics
                total_messages = session.execute("SELECT COUNT(*) FROM chat_messages").fetchone()[0]
                messages_today = session.execute(
                    "SELECT COUNT(*) FROM chat_messages WHERE DATE(created_at) = DATE('now')"
                ).fetchone()[0]
                
                # Calculate growth rates
                users_last_week = session.execute(
                    "SELECT COUNT(*) FROM users WHERE created_at <= datetime('now', '-7 days')"
                ).fetchone()[0]
                user_growth_rate = ((total_users - users_last_week) / max(users_last_week, 1)) * 100
            
            return self.build_response(
                data={
                    "users": {
                        "total": total_users,
                        "active_30d": active_users_30d,
                        "new_7d": new_users_7d,
                        "growth_rate_7d": round(user_growth_rate, 1)
                    },
                    "sessions": {
                        "total": total_sessions,
                        "average_length": round(avg_session_length, 1)
                    },
                    "messages": {
                        "total": total_messages,
                        "today": messages_today,
                        "average_per_session": round(total_messages / max(total_sessions, 1), 1)
                    }
                }
            )
            
        except Exception as e:
            self.handle_error(e, "Error getting statistics summary")
    
    async def get_usage_trend(self,
                            days: int = 30,
                            interval: str = "daily",
                            admin_user: Dict[str, Any] = Depends(get_current_user)):
        """Get usage trends over time"""
        if admin_user.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
            
        try:
            # Return mock data for now since tables don't exist yet
            from datetime import datetime, timedelta
            import random
            
            trends = []
            current_date = datetime.now()
            
            for i in range(min(days, 30)):
                date = current_date - timedelta(days=i)
                period = date.strftime("%Y-%m-%d")
                
                trends.append({
                    "period": period,
                    "messages": random.randint(50, 300),
                    "sessions": random.randint(10, 50),
                    "active_users": random.randint(5, 25)
                })
            
            trends.reverse()  # Oldest first
            
            return self.build_response(
                data={
                    "trends": trends,
                    "period": f"{days} days",
                    "interval": interval
                }
            )
            
        except Exception as e:
            self.handle_error(e, "Error getting usage trends")
    
    async def get_user_segmentation(self, admin_user: Dict[str, Any] = Depends(get_current_user)):
        """Get user segmentation data"""
        if admin_user.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
            
        try:
            with self.get_db_session() as session:
                # Segment by activity level
                activity_segments = session.execute("""
                    SELECT 
                        CASE 
                            WHEN message_count = 0 THEN 'Inactive'
                            WHEN message_count < 10 THEN 'Low Activity'
                            WHEN message_count < 50 THEN 'Medium Activity'
                            ELSE 'High Activity'
                        END as segment,
                        COUNT(*) as user_count
                    FROM (
                        SELECT 
                            u.id,
                            COUNT(m.id) as message_count
                        FROM users u
                        LEFT JOIN chat_sessions s ON u.id = s.user_id
                        LEFT JOIN chat_messages m ON s.id = m.session_id
                        GROUP BY u.id
                    )
                    GROUP BY segment
                """).fetchall()
                
                # Segment by join date
                cohort_segments = session.execute("""
                    SELECT 
                        CASE 
                            WHEN created_at > datetime('now', '-7 days') THEN 'New (< 1 week)'
                            WHEN created_at > datetime('now', '-30 days') THEN 'Recent (< 1 month)'
                            WHEN created_at > datetime('now', '-90 days') THEN 'Regular (< 3 months)'
                            ELSE 'Established (> 3 months)'
                        END as cohort,
                        COUNT(*) as user_count,
                        AVG(CASE WHEN last_login > datetime('now', '-30 days') THEN 1 ELSE 0 END) as retention_rate
                    FROM users
                    GROUP BY cohort
                """).fetchall()
                
                # Role distribution
                role_segments = session.execute("""
                    SELECT role, COUNT(*) as count
                    FROM users
                    GROUP BY role
                """).fetchall()
            
            return self.build_response(
                data={
                    "activity_segments": [
                        {"segment": seg[0], "count": seg[1]}
                        for seg in activity_segments
                    ],
                    "cohort_segments": [
                        {
                            "cohort": coh[0],
                            "count": coh[1],
                            "retention_rate": round(coh[2] * 100, 1)
                        }
                        for coh in cohort_segments
                    ],
                    "role_distribution": [
                        {"role": role[0], "count": role[1]}
                        for role in role_segments
                    ]
                }
            )
            
        except Exception as e:
            self.handle_error(e, "Error getting user segmentation")
    
    async def get_feedback_ratings(self, admin_user: Dict[str, Any] = Depends(get_current_user)):
        """Get feedback rating statistics"""
        if admin_user.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
            
        try:
            # Return mock data for now since tables don't exist yet
            from datetime import datetime, timedelta
            import random
            
            # Mock rating distribution
            rating_distribution = [
                {"rating": 1, "label": "Positive", "count": 450},
                {"rating": 0, "label": "Neutral", "count": 120},
                {"rating": -1, "label": "Negative", "count": 30}
            ]
            
            # Mock rating trends
            rating_trends = []
            for i in range(30):
                date = datetime.now() - timedelta(days=i)
                rating_trends.append({
                    "date": date.strftime("%Y-%m-%d"),
                    "positive_rate": round(random.uniform(70, 85), 1),
                    "negative_rate": round(random.uniform(5, 15), 1),
                    "total": random.randint(10, 50)
                })
            rating_trends.reverse()
            
            # Mock top rated sessions
            top_rated_sessions = [
                {
                    "id": f"session-{i}",
                    "title": f"Session {i}",
                    "average_rating": round(random.uniform(0.7, 1.0), 2),
                    "feedback_count": random.randint(5, 20)
                }
                for i in range(5)
            ]
            
            return self.build_response(
                data={
                    "rating_distribution": rating_distribution,
                    "rating_trends": rating_trends,
                    "top_rated_sessions": top_rated_sessions
                }
            )
            
        except Exception as e:
            self.handle_error(e, "Error getting feedback ratings")
    
    async def get_performance_metrics(self, admin_user: Dict[str, Any] = Depends(get_current_user)):
        """Get system performance metrics"""
        if admin_user.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
            
        try:
            # Get response time metrics (mock data for now)
            performance_data = {
                "response_times": {
                    "average_ms": 245,
                    "p50_ms": 180,
                    "p90_ms": 420,
                    "p99_ms": 850
                },
                "throughput": {
                    "requests_per_minute": 125,
                    "messages_per_minute": 89
                },
                "error_rates": {
                    "api_errors": 0.2,
                    "validation_errors": 1.5,
                    "timeout_errors": 0.1
                },
                "resource_usage": {
                    "cpu_percent": 45.2,
                    "memory_percent": 62.8,
                    "disk_usage_gb": 12.4
                }
            }
            
            return self.build_response(data=performance_data)
            
        except Exception as e:
            self.handle_error(e, "Error getting performance metrics")
    
    async def get_session_distribution(self, admin_user: Dict[str, Any] = Depends(get_current_user)):
        """Get session distribution statistics"""
        if admin_user.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
            
        try:
            # Return mock data for now since tables don't exist yet
            import random
            
            # Mock length distribution
            length_distribution = [
                {"category": "Empty", "count": 15},
                {"category": "Short (1-4)", "count": 120},
                {"category": "Medium (5-19)", "count": 250},
                {"category": "Long (20-49)", "count": 85},
                {"category": "Very Long (50+)", "count": 30}
            ]
            
            # Mock hourly distribution
            hourly_distribution = []
            for hour in range(24):
                # Simulate higher activity during work hours
                if 9 <= hour <= 17:
                    count = random.randint(80, 150)
                else:
                    count = random.randint(10, 40)
                hourly_distribution.append({"hour": hour, "count": count})
            
            # Mock weekly distribution
            days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
            weekly_distribution = []
            for day in days:
                # Simulate higher activity on weekdays
                if day in ["Saturday", "Sunday"]:
                    count = random.randint(50, 80)
                else:
                    count = random.randint(100, 180)
                weekly_distribution.append({"day": day, "count": count})
            
            return self.build_response(
                data={
                    "length_distribution": length_distribution,
                    "hourly_distribution": hourly_distribution,
                    "weekly_distribution": weekly_distribution
                }
            )
            
        except Exception as e:
            self.handle_error(e, "Error getting session distribution")
    
    async def export_statistics(self,
                              format: str = "json",
                              admin_user: Dict[str, Any] = Depends(get_current_user)):
        """Export statistics in various formats"""
        if admin_user.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
            
        try:
            # Gather all statistics
            summary = await self.get_statistics_summary(admin_user=admin_user)
            trends = await self.get_usage_trend(admin_user=admin_user)
            segmentation = await self.get_user_segmentation(admin_user=admin_user)
            
            export_data = {
                "export_date": datetime.now().isoformat(),
                "exported_by": admin_user["email"],
                "statistics": {
                    "summary": summary["data"],
                    "trends": trends["data"],
                    "segmentation": segmentation["data"]
                }
            }
            
            if format == "csv":
                # Convert to CSV format (simplified)
                csv_data = self._convert_to_csv(export_data)
                return self.build_response(
                    data={"content": csv_data, "format": "csv"}
                )
            else:
                # Return as JSON
                return self.build_response(
                    data={"content": export_data, "format": "json"}
                )
                
        except Exception as e:
            self.handle_error(e, "Error exporting statistics")
    
    def _convert_to_csv(self, data: Dict[str, Any]) -> str:
        """Convert statistics data to CSV format"""
        # Simplified CSV conversion
        lines = ["Statistic,Value"]
        
        def flatten_dict(d, prefix=""):
            for key, value in d.items():
                if isinstance(value, dict):
                    flatten_dict(value, f"{prefix}{key}.")
                elif isinstance(value, list):
                    lines.append(f"{prefix}{key},{len(value)} items")
                else:
                    lines.append(f"{prefix}{key},{value}")
        
        flatten_dict(data["statistics"])
        return "\n".join(lines)


# Create handler instance
statistics_handler = AdminStatisticsHandler()