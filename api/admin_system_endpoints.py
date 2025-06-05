import sqlite3
"""
Real System Monitoring API Endpoints for Admin Panel
Provides actual system metrics instead of mock data
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from datetime import datetime
import psutil
import platform
import os
import time
import asyncio
from collections import deque

from modules.core.logging import LogManager
from modules.core.auth_dependency import get_admin_user as require_admin, get_current_user
from modules.core.config import Config
from modules.rag.engine import RAGEngine
from modules.core.cache import cache_manager
# Import or define HybridCache
from modules.rag.engine import HybridCache
from modules.background.job_manager import BackgroundJobManager

# Initialize components
logger = LogManager.setup_logging(__name__)
rag_engine = RAGEngine()
cache = None  # Will be initialized as HybridCache
job_manager = BackgroundJobManager()

# Initialize cache on first use
async def ensure_cache():
    global cache
    if cache is None:
        cache = await get_cache()
    return cache

router = APIRouter(prefix="/api/v1/admin", tags=["admin-system"])

# System metrics storage (for history)
system_metrics_history = deque(maxlen=100)  # Keep last 100 measurements

# Pydantic models
class SystemResources(BaseModel):
    cpu: float
    memory: float
    disk: float
    network: Dict[str, Any]
    timestamp: int

class ProcessInfo(BaseModel):
    pid: int
    name: str
    memory: float  # MB
    cpu: float     # Percentage
    threads: int
    status: str

class RAGMetrics(BaseModel):
    queryPerformance: List[float]
    cacheHitRate: float
    embeddingQueueSize: int
    averageProcessingTime: float
    totalQueries: int
    activeQueries: int

class BackgroundJob(BaseModel):
    id: str
    name: str
    status: str
    progress: float
    startTime: int
    estimatedTimeRemaining: Optional[int]
    error: Optional[str]

class SystemLog(BaseModel):
    timestamp: int
    level: str
    message: str
    source: str

class DashboardSummary(BaseModel):
    activeUsers: Dict[str, int]  # today, week, month
    documentStats: Dict[str, int]  # processed, queued, failed
    ragStats: Dict[str, Any]
    responseTimeAvg: float
    systemHealth: Dict[str, str]

# Endpoints

@router.get("/system/resources", response_model=SystemResources)
async def get_system_resources(user: Dict[str, Any] = Depends(require_admin)):
    """Get real-time system resource usage"""
    try:
        # CPU usage (non-blocking)
        cpu_percent = await asyncio.get_event_loop().run_in_executor(
            None, psutil.cpu_percent, 1, False
        )
        
        # Memory usage
        memory = psutil.virtual_memory()
        
        # Disk usage
        disk = psutil.disk_usage('/')
        
        # Network I/O
        net_io = psutil.net_io_counters()
        
        resources = SystemResources(
            cpu=cpu_percent,
            memory=memory.percent,
            disk=disk.percent,
            network={
                "bytes_sent": net_io.bytes_sent,
                "bytes_recv": net_io.bytes_recv,
                "packets_sent": net_io.packets_sent,
                "packets_recv": net_io.packets_recv
            },
            timestamp=int(time.time() * 1000)
        )
        
        # Store in history
        system_metrics_history.append(resources.dict())
        
        return resources
    except Exception as e:
        logger.error(f"Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Helper functions

async def _get_processed_documents_count() -> int:
    """Get count of processed documents"""
    try:
        # TODO: Query from document database
        from modules.doc_converter.processor import DocumentProcessor
        processor = DocumentProcessor()
        return processor.get_processed_count() if hasattr(processor, 'get_processed_count') else 0
    except:
        return 0

async def _get_queued_documents_count() -> int:
    """Get count of queued documents"""
    try:
        # TODO: Query from queue
        return job_manager.get_queue_size() if hasattr(job_manager, 'get_queue_size') else 0
    except:
        return 0

async def _get_failed_documents_count() -> int:
    """Get count of failed documents"""
    try:
        # TODO: Query from document database
        return 0
    except:
        return 0

async def _check_system_health() -> Dict[str, str]:
    """Check health of all system components"""
    health = {}
    
    # Check API
    health["api"] = "healthy"
    
    # Check database
    try:
        from modules.core.database import get_db
        db = get_db()
        db.execute("SELECT 1")
        health["database"] = "healthy"
    except:
        health["database"] = "unhealthy"
    
    # Check RAG
    health["rag"] = "healthy" if rag_engine.initialized else "unhealthy"
    
    # Check cache
    try:
        cache_instance = await ensure_cache()
        await cache_instance.ping()
        health["cache"] = "healthy"
    except:
        health["cache"] = "unhealthy"
    
    # Check background processing
    health["processing"] = "healthy"  # TODO: Implement actual check
    
    return health

# Mount router to main app
def init_admin_system_routes(app):
    """Initialize admin system routes"""
    app.include_router(router)
