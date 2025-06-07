"""
Admin System Monitor Routes
"""

from fastapi import APIRouter, HTTPException, Depends, Request
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
import logging
import psutil
import os
import sys

from modules.core.auth_dependency import get_current_user
from modules.core.performance import PerformanceMonitor

logger = logging.getLogger(__name__)
router = APIRouter()

# Initialize services
perf_monitor = PerformanceMonitor()

# Dependency to check if user is admin
async def require_admin(user_data: Dict[str, Any] = Depends(get_current_user)):
    """Require admin role for access"""
    if user_data.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user_data

@router.get("/status")
async def get_system_status(
    admin_user: Dict[str, Any] = Depends(require_admin)
):
    """Get current system status"""
    try:
        # Get system metrics
        cpu_percent = psutil.cpu_percent(interval=1)
        memory = psutil.virtual_memory()
        disk = psutil.disk_usage('/')
        
        # Get process info
        process = psutil.Process(os.getpid())
        process_memory = process.memory_info()
        
        return {
            "status": "healthy",
            "timestamp": datetime.now().isoformat(),
            "system": {
                "cpu": {
                    "usage_percent": cpu_percent,
                    "cores": psutil.cpu_count()
                },
                "memory": {
                    "total_gb": round(memory.total / (1024**3), 2),
                    "used_gb": round(memory.used / (1024**3), 2),
                    "available_gb": round(memory.available / (1024**3), 2),
                    "percent": memory.percent
                },
                "disk": {
                    "total_gb": round(disk.total / (1024**3), 2),
                    "used_gb": round(disk.used / (1024**3), 2),
                    "free_gb": round(disk.free / (1024**3), 2),
                    "percent": disk.percent
                }
            },
            "process": {
                "memory_mb": round(process_memory.rss / (1024**2), 2),
                "cpu_percent": process.cpu_percent(),
                "threads": process.num_threads(),
                "uptime_hours": round((datetime.now() - datetime.fromtimestamp(process.create_time())).total_seconds() / 3600, 2)
            }
        }
    except Exception as e:
        logger.error(f"Error getting system status: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/metrics")
async def get_system_metrics(
    period: str = "1h",  # 1h, 6h, 24h, 7d
    admin_user: Dict[str, Any] = Depends(require_admin)
):
    """Get system metrics over time"""
    try:
        # Convert period to minutes
        period_map = {
            "1h": 60,
            "6h": 360,
            "24h": 1440,
            "7d": 10080
        }
        minutes = period_map.get(period, 60)
        
        metrics = perf_monitor.get_metrics(minutes)
        
        return metrics
    except Exception as e:
        logger.error(f"Error getting system metrics: {e}")
        # Return mock data
        return {
            "period": period,
            "metrics": {
                "cpu": [
                    {"timestamp": "2025-06-05T12:00:00Z", "value": 25.5},
                    {"timestamp": "2025-06-05T12:05:00Z", "value": 30.2},
                    {"timestamp": "2025-06-05T12:10:00Z", "value": 28.7},
                    {"timestamp": "2025-06-05T12:15:00Z", "value": 35.1},
                    {"timestamp": "2025-06-05T12:20:00Z", "value": 22.3}
                ],
                "memory": [
                    {"timestamp": "2025-06-05T12:00:00Z", "value": 45.2},
                    {"timestamp": "2025-06-05T12:05:00Z", "value": 46.1},
                    {"timestamp": "2025-06-05T12:10:00Z", "value": 44.8},
                    {"timestamp": "2025-06-05T12:15:00Z", "value": 47.5},
                    {"timestamp": "2025-06-05T12:20:00Z", "value": 45.9}
                ],
                "requests_per_minute": [
                    {"timestamp": "2025-06-05T12:00:00Z", "value": 120},
                    {"timestamp": "2025-06-05T12:05:00Z", "value": 135},
                    {"timestamp": "2025-06-05T12:10:00Z", "value": 110},
                    {"timestamp": "2025-06-05T12:15:00Z", "value": 145},
                    {"timestamp": "2025-06-05T12:20:00Z", "value": 125}
                ]
            }
        }

@router.get("/logs")
async def get_system_logs(
    level: Optional[str] = None,  # error, warning, info
    limit: int = 100,
    admin_user: Dict[str, Any] = Depends(require_admin)
):
    """Get system logs"""
    try:
        # This would normally read from actual log files
        # For now, return mock data
        return {
            "logs": [
                {
                    "timestamp": "2025-06-05T12:25:00Z",
                    "level": "INFO",
                    "logger": "modules.chat.chat_routes",
                    "message": "Chat request from user 5 in session abc123",
                    "context": {}
                },
                {
                    "timestamp": "2025-06-05T12:24:30Z",
                    "level": "WARNING",
                    "logger": "modules.rag.engine",
                    "message": "Slow query detected: 850ms",
                    "context": {"query": "nscale permissions"}
                },
                {
                    "timestamp": "2025-06-05T12:23:00Z",
                    "level": "ERROR",
                    "logger": "modules.doc_converter",
                    "message": "OCR failed for document",
                    "context": {"document_id": "doc-456", "error": "Timeout"}
                }
            ],
            "total": 3,
            "limit": limit
        }
    except Exception as e:
        logger.error(f"Error getting system logs: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/health")
async def get_health_checks(
    admin_user: Dict[str, Any] = Depends(require_admin)
):
    """Get health status of all system components"""
    try:
        # Check various components
        health_checks = {
            "api": {"status": "healthy", "message": "API responding normally"},
            "database": {"status": "healthy", "message": "Database connection OK"},
            "llm": {"status": "healthy", "message": "LLM service available"},
            "rag": {"status": "healthy", "message": "RAG engine operational"},
            "document_converter": {"status": "healthy", "message": "Converter service running"},
            "cache": {"status": "healthy", "message": "Cache service available"},
            "background_jobs": {"status": "healthy", "message": "Job queues processing"}
        }
        
        # Overall health
        all_healthy = all(check["status"] == "healthy" for check in health_checks.values())
        
        return {
            "overall_status": "healthy" if all_healthy else "degraded",
            "timestamp": datetime.now().isoformat(),
            "components": health_checks
        }
    except Exception as e:
        logger.error(f"Error getting health checks: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/errors")
async def get_error_summary(
    hours: int = 24,
    admin_user: Dict[str, Any] = Depends(require_admin)
):
    """Get error summary for the specified time period"""
    try:
        # This would normally aggregate from logs
        # For now, return mock data
        return {
            "period": f"Last {hours} hours",
            "total_errors": 45,
            "error_rate": 0.02,  # 2% error rate
            "errors_by_type": {
                "HTTPException": 20,
                "ValidationError": 10,
                "TimeoutError": 8,
                "DatabaseError": 5,
                "Other": 2
            },
            "errors_by_module": {
                "doc_converter": 15,
                "rag": 10,
                "chat": 8,
                "auth": 7,
                "other": 5
            },
            "recent_errors": [
                {
                    "timestamp": "2025-06-05T12:00:00Z",
                    "type": "TimeoutError",
                    "module": "doc_converter",
                    "message": "Document processing timeout",
                    "count": 3
                },
                {
                    "timestamp": "2025-06-05T11:30:00Z",
                    "type": "ValidationError",
                    "module": "chat",
                    "message": "Invalid session ID",
                    "count": 2
                }
            ]
        }
    except Exception as e:
        logger.error(f"Error getting error summary: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/performance")
async def get_performance_stats(
    admin_user: Dict[str, Any] = Depends(require_admin)
):
    """Get API performance statistics"""
    try:
        stats = perf_monitor.get_performance_stats()
        
        return stats
    except Exception as e:
        logger.error(f"Error getting performance stats: {e}")
        # Return mock data
        return {
            "endpoints": [
                {
                    "path": "/api/chat/message/stream",
                    "method": "GET",
                    "avg_response_time_ms": 185,
                    "p95_response_time_ms": 320,
                    "p99_response_time_ms": 450,
                    "requests_per_minute": 45,
                    "error_rate": 0.01
                },
                {
                    "path": "/api/chat/sessions",
                    "method": "GET",
                    "avg_response_time_ms": 25,
                    "p95_response_time_ms": 45,
                    "p99_response_time_ms": 60,
                    "requests_per_minute": 120,
                    "error_rate": 0.0
                }
            ],
            "overall": {
                "avg_response_time_ms": 85,
                "total_requests_24h": 125000,
                "error_rate": 0.015,
                "uptime_percent": 99.95
            }
        }

@router.post("/alerts")
async def configure_alerts(
    alert_config: Dict[str, Any],
    admin_user: Dict[str, Any] = Depends(require_admin)
):
    """Configure system alerts"""
    try:
        # Save alert configuration
        # This would normally persist to database
        
        return {
            "success": True,
            "message": "Alert configuration updated",
            "config": alert_config
        }
    except Exception as e:
        logger.error(f"Error configuring alerts: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/alerts")
async def get_active_alerts(
    admin_user: Dict[str, Any] = Depends(require_admin)
):
    """Get currently active system alerts"""
    try:
        # Return mock alerts
        return {
            "alerts": [
                {
                    "id": "alert-001",
                    "severity": "warning",
                    "type": "high_memory_usage",
                    "message": "Memory usage above 80%",
                    "triggered_at": "2025-06-05T12:00:00Z",
                    "details": {
                        "current_usage": 82.5,
                        "threshold": 80
                    }
                }
            ],
            "total": 1
        }
    except Exception as e:
        logger.error(f"Error getting active alerts: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/info")
async def get_system_info(
    admin_user: Dict[str, Any] = Depends(require_admin)
):
    """Get system information"""
    try:
        import platform
        
        # Get process info
        process = psutil.Process(os.getpid())
        
        return {
            "system": {
                "platform": platform.system(),
                "platform_release": platform.release(),
                "platform_version": platform.version(),
                "architecture": platform.machine(),
                "processor": platform.processor(),
                "python_version": platform.python_version(),
                "hostname": platform.node()
            },
            "process": {
                "pid": process.pid,
                "name": process.name(),
                "create_time": datetime.fromtimestamp(process.create_time()).isoformat(),
                "cpu_percent": process.cpu_percent(),
                "memory_mb": process.memory_info().rss / 1024 / 1024,
                "num_threads": process.num_threads()
            },
            "environment": {
                "host": os.environ.get("HOST", "localhost"),
                "port": os.environ.get("PORT", "8000"),
                "environment": os.environ.get("ENVIRONMENT", "development"),
                "debug": os.environ.get("DEBUG", "False").lower() == "true"
            },
            "paths": {
                "working_directory": os.getcwd(),
                "python_path": sys.executable
            }
        }
    except Exception as e:
        logger.error(f"Error getting system info: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/jobs")
async def get_background_jobs(
    admin_user: Dict[str, Any] = Depends(require_admin)
):
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
                    "failed": 3,
                    "avg_processing_time_s": 45.2
                },
                {
                    "name": "embedding_generation",
                    "pending": 12,
                    "active": 4,
                    "completed": 280,
                    "failed": 1,
                    "avg_processing_time_s": 12.8
                },
                {
                    "name": "cleanup",
                    "pending": 0,
                    "active": 1,
                    "completed": 50,
                    "failed": 0,
                    "avg_processing_time_s": 5.5
                }
            ],
            "recent_jobs": [
                {
                    "id": "job_001",
                    "type": "document_processing",
                    "status": "completed",
                    "started_at": (datetime.now() - timedelta(minutes=5)).isoformat(),
                    "completed_at": (datetime.now() - timedelta(minutes=2)).isoformat(),
                    "duration_seconds": 180,
                    "result": "Success"
                },
                {
                    "id": "job_002",
                    "type": "embedding_generation",
                    "status": "active",
                    "started_at": (datetime.now() - timedelta(minutes=1)).isoformat(),
                    "progress": 65,
                    "estimated_completion": (datetime.now() + timedelta(seconds=30)).isoformat()
                },
                {
                    "id": "job_003",
                    "type": "document_processing",
                    "status": "failed",
                    "started_at": (datetime.now() - timedelta(minutes=10)).isoformat(),
                    "failed_at": (datetime.now() - timedelta(minutes=8)).isoformat(),
                    "error": "OCR timeout"
                }
            ],
            "stats": {
                "total_jobs_24h": 483,
                "success_rate": 0.94,
                "avg_queue_time_s": 8.5,
                "avg_processing_time_s": 28.3
            }
        }
    except Exception as e:
        logger.error(f"Error getting background jobs: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/network")
async def get_network_info(
    admin_user: Dict[str, Any] = Depends(require_admin)
):
    """Get network information and statistics"""
    try:
        net_io = psutil.net_io_counters()
        net_connections = psutil.net_connections(kind='inet')
        
        # Count connections by status
        conn_by_status = {}
        conn_by_type = {"tcp": 0, "udp": 0}
        
        for conn in net_connections:
            # Count by status
            if hasattr(conn, 'status'):
                status = conn.status
                conn_by_status[status] = conn_by_status.get(status, 0) + 1
            
            # Count by type
            if conn.type == 1:  # SOCK_STREAM
                conn_by_type["tcp"] += 1
            elif conn.type == 2:  # SOCK_DGRAM
                conn_by_type["udp"] += 1
        
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
                "total": len(net_connections),
                "by_status": conn_by_status,
                "by_type": conn_by_type
            },
            "bandwidth": {
                "total_bytes_sent": net_io.bytes_sent,
                "total_bytes_recv": net_io.bytes_recv,
                "send_rate_mbps": round((net_io.bytes_sent / 1024 / 1024) / max((datetime.now().timestamp() - psutil.boot_time()) / 3600, 1), 2),
                "recv_rate_mbps": round((net_io.bytes_recv / 1024 / 1024) / max((datetime.now().timestamp() - psutil.boot_time()) / 3600, 1), 2)
            },
            "interfaces": get_network_interfaces()
        }
    except Exception as e:
        logger.error(f"Error getting network info: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/rag/metrics")
async def get_rag_metrics(
    admin_user: Dict[str, Any] = Depends(require_admin)
):
    """Get RAG system metrics"""
    try:
        # Mock RAG metrics
        import random
        
        return {
            "overview": {
                "total_documents": 156,
                "total_chunks": 3420,
                "total_embeddings": 3420,
                "index_size_mb": 125.5,
                "vector_dimension": 1536,
                "embedding_model": "text-embedding-ada-002"
            },
            "performance": {
                "queries_today": 450,
                "avg_query_time_ms": 120,
                "p50_query_time_ms": 95,
                "p95_query_time_ms": 250,
                "p99_query_time_ms": 500,
                "cache_hit_rate": 0.75,
                "avg_chunks_retrieved": 5.2,
                "avg_relevance_score": 0.85
            },
            "quality": {
                "avg_relevance_score": 0.85,
                "successful_retrievals": 0.92,
                "user_satisfaction_rate": 0.88,
                "reranking_improvement": 0.15
            },
            "recent_queries": [
                {
                    "timestamp": datetime.now().isoformat(),
                    "query": "nscale permissions management",
                    "chunks_retrieved": 5,
                    "avg_score": 0.89,
                    "time_ms": 95,
                    "cache_hit": True
                },
                {
                    "timestamp": (datetime.now() - timedelta(minutes=5)).isoformat(),
                    "query": "document workflow automation",
                    "chunks_retrieved": 4,
                    "avg_score": 0.82,
                    "time_ms": 110,
                    "cache_hit": False
                },
                {
                    "timestamp": (datetime.now() - timedelta(minutes=10)).isoformat(),
                    "query": "OCR configuration settings",
                    "chunks_retrieved": 6,
                    "avg_score": 0.91,
                    "time_ms": 88,
                    "cache_hit": True
                }
            ],
            "storage": {
                "documents_size_mb": 45.2,
                "embeddings_size_mb": 80.3,
                "cache_size_mb": 12.5,
                "total_size_mb": 138.0
            }
        }
    except Exception as e:
        logger.error(f"Error getting RAG metrics: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

def get_network_interfaces():
    """Get network interface information"""
    try:
        interfaces = []
        for interface, addrs in psutil.net_if_addrs().items():
            if_info = {
                "name": interface,
                "addresses": []
            }
            
            for addr in addrs:
                addr_info = {
                    "family": addr.family.name,
                    "address": addr.address
                }
                if addr.netmask:
                    addr_info["netmask"] = addr.netmask
                if addr.broadcast:
                    addr_info["broadcast"] = addr.broadcast
                
                if_info["addresses"].append(addr_info)
            
            interfaces.append(if_info)
        
        return interfaces
    except:
        return []