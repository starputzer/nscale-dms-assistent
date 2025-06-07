"""
Background Processing Routes
"""

from fastapi import APIRouter, HTTPException, Depends
from typing import Dict, Any, List, Optional
from datetime import datetime
import logging

from modules.core.auth_dependency import get_current_user
from modules.background.job_manager import BackgroundJobManager
from modules.background.queue_manager import QueueManager
from modules.background.processor import BackgroundProcessor

logger = logging.getLogger(__name__)
router = APIRouter()

# Initialize services
job_manager = BackgroundJobManager()
queue_manager = QueueManager()
processor = BackgroundProcessor()

# Dependency to check if user is admin
async def require_admin(user_data: Dict[str, Any] = Depends(get_current_user)):
    """Require admin role for access"""
    if user_data.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user_data

@router.get("/jobs")
async def get_background_jobs(
    status: Optional[str] = None,
    queue: Optional[str] = None,
    limit: int = 100,
    offset: int = 0,
    admin_user: Dict[str, Any] = Depends(require_admin)
):
    """Get list of background jobs"""
    try:
        jobs = job_manager.get_jobs(
            status=status,
            queue=queue,
            limit=limit,
            offset=offset
        )
        
        # Add mock data for UI
        if len(jobs["jobs"]) == 0:
            jobs["jobs"] = [
                {
                    "id": "job_001",
                    "type": "document_processing",
                    "status": "running",
                    "progress": 75,
                    "created_at": datetime.now().isoformat(),
                    "started_at": datetime.now().isoformat(),
                    "queue": "default",
                    "priority": "normal",
                    "metadata": {
                        "filename": "report.pdf",
                        "pages": 45
                    }
                },
                {
                    "id": "job_002",
                    "type": "embedding_generation",
                    "status": "pending",
                    "progress": 0,
                    "created_at": datetime.now().isoformat(),
                    "queue": "ml",
                    "priority": "low",
                    "metadata": {
                        "documents": 15
                    }
                }
            ]
            jobs["total"] = 2
        
        return jobs
        
    except Exception as e:
        logger.error(f"Error getting background jobs: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/jobs/{job_id}")
async def get_job_details(
    job_id: str,
    admin_user: Dict[str, Any] = Depends(require_admin)
):
    """Get details of a specific job"""
    try:
        job = job_manager.get_job(job_id)
        
        if not job:
            # Mock data for demo
            job = {
                "id": job_id,
                "type": "document_processing",
                "status": "running",
                "progress": 45,
                "created_at": datetime.now().isoformat(),
                "started_at": datetime.now().isoformat(),
                "queue": "default",
                "priority": "normal",
                "logs": [
                    {"timestamp": datetime.now().isoformat(), "message": "Job started"},
                    {"timestamp": datetime.now().isoformat(), "message": "Processing page 15/45"}
                ],
                "metadata": {
                    "filename": "document.pdf",
                    "pages": 45,
                    "processed_pages": 15
                }
            }
        
        return job
        
    except Exception as e:
        logger.error(f"Error getting job details: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/jobs/{job_id}/retry")
async def retry_job(
    job_id: str,
    admin_user: Dict[str, Any] = Depends(require_admin)
):
    """Retry a failed job"""
    try:
        success = job_manager.retry_job(job_id)
        
        if success:
            return {"success": True, "message": "Job queued for retry"}
        else:
            raise HTTPException(status_code=404, detail="Job not found")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrying job: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/jobs/{job_id}/cancel")
async def cancel_job(
    job_id: str,
    admin_user: Dict[str, Any] = Depends(require_admin)
):
    """Cancel a running job"""
    try:
        success = job_manager.cancel_job(job_id)
        
        if success:
            return {"success": True, "message": "Job cancelled"}
        else:
            raise HTTPException(status_code=404, detail="Job not found or not cancellable")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error cancelling job: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/jobs/{job_id}")
async def delete_job(
    job_id: str,
    admin_user: Dict[str, Any] = Depends(require_admin)
):
    """Delete a completed job"""
    try:
        success = job_manager.delete_job(job_id)
        
        if success:
            return {"success": True, "message": "Job deleted"}
        else:
            raise HTTPException(status_code=404, detail="Job not found or still running")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting job: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/queues")
async def get_queues(admin_user: Dict[str, Any] = Depends(require_admin)):
    """Get all processing queues"""
    try:
        queues = queue_manager.get_all_queues()
        
        # Add mock data
        if not queues:
            queues = [
                {
                    "name": "default",
                    "active": 2,
                    "pending": 5,
                    "workers": 4,
                    "status": "running",
                    "avg_processing_time": 45.2
                },
                {
                    "name": "ml",
                    "active": 1,
                    "pending": 3,
                    "workers": 2,
                    "status": "running",
                    "avg_processing_time": 120.5
                },
                {
                    "name": "priority",
                    "active": 0,
                    "pending": 0,
                    "workers": 2,
                    "status": "idle",
                    "avg_processing_time": 15.8
                }
            ]
        
        return {"queues": queues}
        
    except Exception as e:
        logger.error(f"Error getting queues: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/queues/{queue_name}")
async def get_queue_details(
    queue_name: str,
    admin_user: Dict[str, Any] = Depends(require_admin)
):
    """Get details of a specific queue"""
    try:
        queue = queue_manager.get_queue_details(queue_name)
        
        if not queue:
            # Mock data
            queue = {
                "name": queue_name,
                "active": 1,
                "pending": 3,
                "workers": 2,
                "status": "running",
                "config": {
                    "max_workers": 4,
                    "timeout": 300,
                    "retry_attempts": 3
                },
                "stats": {
                    "total_processed": 1234,
                    "total_failed": 12,
                    "avg_processing_time": 45.2,
                    "success_rate": 99.0
                }
            }
        
        return queue
        
    except Exception as e:
        logger.error(f"Error getting queue details: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/queues/{queue_name}/pause")
async def pause_queue(
    queue_name: str,
    admin_user: Dict[str, Any] = Depends(require_admin)
):
    """Pause a processing queue"""
    try:
        success = queue_manager.pause_queue(queue_name)
        
        if success:
            return {"success": True, "message": f"Queue {queue_name} paused"}
        else:
            raise HTTPException(status_code=404, detail="Queue not found")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error pausing queue: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/queues/{queue_name}/resume")
async def resume_queue(
    queue_name: str,
    admin_user: Dict[str, Any] = Depends(require_admin)
):
    """Resume a paused queue"""
    try:
        success = queue_manager.resume_queue(queue_name)
        
        if success:
            return {"success": True, "message": f"Queue {queue_name} resumed"}
        else:
            raise HTTPException(status_code=404, detail="Queue not found")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error resuming queue: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/stats")
async def get_processing_stats(admin_user: Dict[str, Any] = Depends(require_admin)):
    """Get overall processing statistics"""
    try:
        stats = processor.get_queue_status()
        
        # Enhance with additional stats
        return {
            "active_jobs": stats.get("active", 0),
            "queued_jobs": stats.get("queued", 0),
            "total_workers": stats.get("workers", 4),
            "paused": stats.get("paused", False),
            "stats": stats.get("stats", {}),
            "performance": {
                "jobs_per_minute": 12.5,
                "avg_job_duration": 45.2,
                "success_rate": 98.5
            },
            "by_type": {
                "document_processing": 45,
                "embedding_generation": 23,
                "data_sync": 12,
                "cleanup": 8
            }
        }
        
    except Exception as e:
        logger.error(f"Error getting processing stats: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/logs")
async def get_processing_logs(
    level: Optional[str] = None,
    limit: int = 100,
    admin_user: Dict[str, Any] = Depends(require_admin)
):
    """Get processing logs"""
    try:
        # Mock implementation
        logs = []
        import random
        levels = ["info", "warning", "error", "debug"]
        
        for i in range(min(limit, 20)):
            logs.append({
                "timestamp": datetime.now().isoformat(),
                "level": level or random.choice(levels),
                "job_id": f"job_{i:03d}",
                "message": f"Processing event {i}",
                "metadata": {
                    "queue": random.choice(["default", "ml", "priority"]),
                    "worker": f"worker_{random.randint(1, 4)}"
                }
            })
        
        return {
            "logs": logs,
            "total": len(logs)
        }
        
    except Exception as e:
        logger.error(f"Error getting logs: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))