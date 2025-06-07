"""
System Monitoring Routes
"""

from fastapi import APIRouter, HTTPException, Depends
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
import psutil
import logging
import os

from modules.core.auth_dependency import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter()

# Dependency to check if user is admin
async def require_admin(user_data: Dict[str, Any] = Depends(get_current_user)):
    """Require admin role for access"""
    if user_data.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user_data

@router.get("/health")
async def get_system_health(admin_user: Dict[str, Any] = Depends(require_admin)):
    """Get overall system health status"""
    try:
        # Get system metrics
        cpu_percent = psutil.cpu_percent(interval=1)
        memory = psutil.virtual_memory()
        disk = psutil.disk_usage('/')
        
        # Determine health status
        status = "healthy"
        issues = []
        
        if cpu_percent > 80:
            status = "warning"
            issues.append("High CPU usage")
        if memory.percent > 80:
            status = "warning"
            issues.append("High memory usage")
        if disk.percent > 90:
            status = "critical"
            issues.append("Low disk space")
        
        return {
            "status": status,
            "timestamp": datetime.now().isoformat(),
            "services": {
                "api": "healthy",
                "database": "healthy",
                "cache": "healthy",
                "background_jobs": "healthy"
            },
            "issues": issues,
            "uptime": get_uptime()
        }
        
    except Exception as e:
        logger.error(f"Error getting system health: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/metrics")
async def get_system_metrics(admin_user: Dict[str, Any] = Depends(require_admin)):
    """Get detailed system metrics"""
    try:
        # CPU metrics
        cpu_count = psutil.cpu_count()
        cpu_percent = psutil.cpu_percent(interval=1, percpu=True)
        
        # Memory metrics
        memory = psutil.virtual_memory()
        swap = psutil.swap_memory()
        
        # Disk metrics
        disk = psutil.disk_usage('/')
        
        # Network metrics
        net_io = psutil.net_io_counters()
        
        return {
            "cpu": {
                "count": cpu_count,
                "usage_percent": sum(cpu_percent) / len(cpu_percent),
                "per_core": cpu_percent
            },
            "memory": {
                "total": memory.total,
                "available": memory.available,
                "used": memory.used,
                "percent": memory.percent,
                "swap_total": swap.total,
                "swap_used": swap.used,
                "swap_percent": swap.percent
            },
            "disk": {
                "total": disk.total,
                "used": disk.used,
                "free": disk.free,
                "percent": disk.percent
            },
            "network": {
                "bytes_sent": net_io.bytes_sent,
                "bytes_recv": net_io.bytes_recv,
                "packets_sent": net_io.packets_sent,
                "packets_recv": net_io.packets_recv
            }
        }
        
    except Exception as e:
        logger.error(f"Error getting system metrics: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/metrics/history")
async def get_metrics_history(
    metric_type: str = "all",
    hours: int = 24,
    admin_user: Dict[str, Any] = Depends(require_admin)
):
    """Get historical metrics data"""
    try:
        # Mock historical data
        import random
        history = []
        
        now = datetime.now()
        for i in range(hours * 4):  # 15-minute intervals
            timestamp = now - timedelta(minutes=15 * i)
            
            data_point = {
                "timestamp": timestamp.isoformat(),
                "cpu": random.uniform(20, 60),
                "memory": random.uniform(40, 70),
                "disk_io": random.uniform(0, 100),
                "network_io": random.uniform(0, 50)
            }
            
            if metric_type != "all":
                data_point = {
                    "timestamp": timestamp.isoformat(),
                    metric_type: data_point.get(metric_type, 0)
                }
            
            history.append(data_point)
        
        return {
            "metric_type": metric_type,
            "hours": hours,
            "data_points": len(history),
            "history": list(reversed(history))
        }
        
    except Exception as e:
        logger.error(f"Error getting metrics history: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/processes")
async def get_system_processes(
    sort_by: str = "cpu",
    limit: int = 20,
    admin_user: Dict[str, Any] = Depends(require_admin)
):
    """Get top system processes"""
    try:
        processes = []
        
        for proc in psutil.process_iter(['pid', 'name', 'cpu_percent', 'memory_info']):
            try:
                pinfo = proc.info
                processes.append({
                    "pid": pinfo['pid'],
                    "name": pinfo['name'],
                    "cpu_percent": proc.cpu_percent(interval=0.1),
                    "memory_mb": pinfo['memory_info'].rss / 1024 / 1024
                })
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                pass
        
        # Sort processes
        if sort_by == "cpu":
            processes.sort(key=lambda x: x['cpu_percent'], reverse=True)
        elif sort_by == "memory":
            processes.sort(key=lambda x: x['memory_mb'], reverse=True)
        
        return {
            "total_processes": len(processes),
            "processes": processes[:limit]
        }
        
    except Exception as e:
        logger.error(f"Error getting processes: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/alerts")
async def get_system_alerts(
    status: Optional[str] = None,
    admin_user: Dict[str, Any] = Depends(require_admin)
):
    """Get system alerts"""
    try:
        # Mock alerts
        alerts = [
            {
                "id": "alert_001",
                "type": "performance",
                "severity": "warning",
                "message": "High memory usage detected",
                "details": "Memory usage has been above 75% for the last hour",
                "timestamp": datetime.now().isoformat(),
                "status": "active"
            },
            {
                "id": "alert_002",
                "type": "security",
                "severity": "info",
                "message": "Multiple failed login attempts",
                "details": "5 failed login attempts from IP 192.168.1.100",
                "timestamp": (datetime.now() - timedelta(hours=2)).isoformat(),
                "status": "resolved"
            }
        ]
        
        if status:
            alerts = [a for a in alerts if a["status"] == status]
        
        return {
            "total": len(alerts),
            "alerts": alerts
        }
        
    except Exception as e:
        logger.error(f"Error getting alerts: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/alerts/{alert_id}/resolve")
async def resolve_alert(
    alert_id: str,
    admin_user: Dict[str, Any] = Depends(require_admin)
):
    """Resolve a system alert"""
    try:
        # Mock implementation
        return {
            "success": True,
            "message": f"Alert {alert_id} resolved"
        }
        
    except Exception as e:
        logger.error(f"Error resolving alert: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/logs/system")
async def get_system_logs(
    level: Optional[str] = None,
    service: Optional[str] = None,
    limit: int = 100,
    admin_user: Dict[str, Any] = Depends(require_admin)
):
    """Get system logs"""
    try:
        # Mock logs
        import random
        logs = []
        
        services = ["api", "database", "cache", "worker"]
        levels = ["info", "warning", "error", "debug"]
        
        for i in range(min(limit, 50)):
            log_entry = {
                "timestamp": (datetime.now() - timedelta(minutes=i)).isoformat(),
                "level": level or random.choice(levels),
                "service": service or random.choice(services),
                "message": f"System event {i}",
                "details": {
                    "event_type": random.choice(["request", "response", "error", "startup"]),
                    "duration_ms": random.randint(10, 1000)
                }
            }
            logs.append(log_entry)
        
        return {
            "total": len(logs),
            "logs": logs
        }
        
    except Exception as e:
        logger.error(f"Error getting logs: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/performance")
async def get_performance_metrics(admin_user: Dict[str, Any] = Depends(require_admin)):
    """Get API performance metrics"""
    try:
        return {
            "api_metrics": {
                "requests_per_minute": 245,
                "avg_response_time_ms": 125,
                "p95_response_time_ms": 350,
                "p99_response_time_ms": 800,
                "error_rate": 0.2
            },
            "endpoint_metrics": [
                {
                    "endpoint": "/api/health",
                    "calls": 1234,
                    "avg_time_ms": 10,
                    "error_rate": 0.0
                },
                {
                    "endpoint": "/api/chat/message",
                    "calls": 567,
                    "avg_time_ms": 250,
                    "error_rate": 0.5
                },
                {
                    "endpoint": "/api/documents/upload",
                    "calls": 89,
                    "avg_time_ms": 1500,
                    "error_rate": 2.2
                }
            ]
        }
        
    except Exception as e:
        logger.error(f"Error getting performance metrics: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/info")
async def get_system_info(admin_user: Dict[str, Any] = Depends(require_admin)):
    """Get system information"""
    try:
        import platform
        
        return {
            "system": {
                "platform": platform.system(),
                "platform_release": platform.release(),
                "platform_version": platform.version(),
                "architecture": platform.machine(),
                "processor": platform.processor(),
                "python_version": platform.python_version()
            },
            "process": {
                "pid": os.getpid(),
                "cwd": os.getcwd(),
                "user": os.environ.get("USER", "unknown")
            },
            "environment": {
                "host": os.environ.get("HOST", "localhost"),
                "port": os.environ.get("PORT", "8000"),
                "environment": os.environ.get("ENVIRONMENT", "development")
            }
        }
        
    except Exception as e:
        logger.error(f"Error getting system info: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/jobs")
async def get_background_jobs(admin_user: Dict[str, Any] = Depends(require_admin)):
    """Get background job status"""
    try:
        # Mock job data
        return {
            "queues": [
                {
                    "name": "document_processing",
                    "pending": 5,
                    "active": 2,
                    "completed": 150,
                    "failed": 3
                },
                {
                    "name": "embedding_generation",
                    "pending": 12,
                    "active": 4,
                    "completed": 280,
                    "failed": 1
                },
                {
                    "name": "cleanup",
                    "pending": 0,
                    "active": 1,
                    "completed": 50,
                    "failed": 0
                }
            ],
            "recent_jobs": [
                {
                    "id": "job_001",
                    "type": "document_processing",
                    "status": "completed",
                    "started_at": (datetime.now() - timedelta(minutes=5)).isoformat(),
                    "completed_at": (datetime.now() - timedelta(minutes=2)).isoformat(),
                    "duration_seconds": 180
                },
                {
                    "id": "job_002",
                    "type": "embedding_generation",
                    "status": "active",
                    "started_at": (datetime.now() - timedelta(minutes=1)).isoformat(),
                    "progress": 65
                }
            ]
        }
        
    except Exception as e:
        logger.error(f"Error getting background jobs: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/logs")
async def get_logs(
    level: Optional[str] = None,
    service: Optional[str] = None,
    limit: int = 100,
    admin_user: Dict[str, Any] = Depends(require_admin)
):
    """Get logs (alias for /logs/system)"""
    return await get_system_logs(level, service, limit, admin_user)

@router.get("/network")
async def get_network_info(admin_user: Dict[str, Any] = Depends(require_admin)):
    """Get network information and statistics"""
    try:
        net_io = psutil.net_io_counters()
        connections = psutil.net_connections(kind='inet')
        
        # Count connections by status
        conn_status = {}
        for conn in connections:
            status = conn.status
            conn_status[status] = conn_status.get(status, 0) + 1
        
        return {
            "io_counters": {
                "bytes_sent": net_io.bytes_sent,
                "bytes_recv": net_io.bytes_recv,
                "packets_sent": net_io.packets_sent,
                "packets_recv": net_io.packets_recv,
                "errin": net_io.errin,
                "errout": net_io.errout,
                "dropin": net_io.dropin,
                "dropout": net_io.dropout
            },
            "connections": {
                "total": len(connections),
                "by_status": conn_status
            },
            "bandwidth": {
                "download_mbps": round((net_io.bytes_recv / 1024 / 1024) / (psutil.boot_time() / 3600), 2),
                "upload_mbps": round((net_io.bytes_sent / 1024 / 1024) / (psutil.boot_time() / 3600), 2)
            }
        }
        
    except Exception as e:
        logger.error(f"Error getting network info: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/rag/metrics")
async def get_rag_metrics(admin_user: Dict[str, Any] = Depends(require_admin)):
    """Get RAG system metrics"""
    try:
        # Mock RAG metrics
        return {
            "overview": {
                "total_documents": 156,
                "total_chunks": 3420,
                "total_embeddings": 3420,
                "index_size_mb": 125.5,
                "avg_retrieval_time_ms": 85
            },
            "performance": {
                "queries_today": 450,
                "avg_query_time_ms": 120,
                "p95_query_time_ms": 250,
                "p99_query_time_ms": 500,
                "cache_hit_rate": 0.75
            },
            "quality": {
                "avg_relevance_score": 0.85,
                "avg_chunks_per_query": 5.2,
                "successful_retrievals": 0.92
            },
            "recent_queries": [
                {
                    "timestamp": datetime.now().isoformat(),
                    "query": "nscale permissions",
                    "chunks_retrieved": 5,
                    "avg_score": 0.89,
                    "time_ms": 95
                },
                {
                    "timestamp": (datetime.now() - timedelta(minutes=5)).isoformat(),
                    "query": "document workflow",
                    "chunks_retrieved": 4,
                    "avg_score": 0.82,
                    "time_ms": 110
                }
            ]
        }
        
    except Exception as e:
        logger.error(f"Error getting RAG metrics: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

def get_uptime():
    """Get system uptime"""
    try:
        boot_time = psutil.boot_time()
        current_time = datetime.now().timestamp()
        uptime_seconds = current_time - boot_time
        
        days = int(uptime_seconds // 86400)
        hours = int((uptime_seconds % 86400) // 3600)
        minutes = int((uptime_seconds % 3600) // 60)
        
        return f"{days}d {hours}h {minutes}m"
    except:
        return "Unknown"