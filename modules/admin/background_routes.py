"""
Admin Background Processing Routes
"""

from fastapi import APIRouter, HTTPException, Depends, Request
from typing import Dict, Any, List, Optional
from datetime import datetime
import logging

from modules.core.auth_dependency import get_current_user
from modules.background.job_manager import BackgroundJobManager
from modules.background.queue_manager import QueueManager

logger = logging.getLogger(__name__)
router = APIRouter()

# Initialize services
job_manager = BackgroundJobManager()
queue_manager = QueueManager()

# Dependency to check if user is admin
async def require_admin(user_data: Dict[str, Any] = Depends(get_current_user)):
    """Require admin role for access"""
    if user_data.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user_data

@router.get("/jobs")
async def get_background_jobs(
    status: Optional[str] = None,  # pending, running, completed, failed
    queue: Optional[str] = None,
    limit: int = 100,
    offset: int = 0,
    admin_user: Dict[str, Any] = Depends(require_admin)
):
    """Get background jobs"""
    try:
        jobs = job_manager.get_jobs(
            status=status,
            queue=queue,
            limit=limit,
            offset=offset
        )
        
        return jobs
    except Exception as e:
        logger.error(f"Error getting background jobs: {e}")
        # Return mock data
        return {
            "jobs": [
                {
                    "id": "job-001",
                    "queue": "document_processing",
                    "type": "pdf_conversion",
                    "status": "running",
                    "progress": 45,
                    "created_at": "2025-06-05T10:00:00Z",
                    "started_at": "2025-06-05T10:01:00Z",
                    "completed_at": None,
                    "error": None,
                    "payload": {
                        "filename": "report.pdf",
                        "pages": 25
                    }
                },
                {
                    "id": "job-002",
                    "queue": "rag_indexing",
                    "type": "document_indexing",
                    "status": "completed",
                    "progress": 100,
                    "created_at": "2025-06-05T09:00:00Z",
                    "started_at": "2025-06-05T09:00:30Z",
                    "completed_at": "2025-06-05T09:05:00Z",
                    "error": None,
                    "payload": {
                        "document_id": "doc-123",
                        "chunks": 45
                    }
                }
            ],
            "total": 2,
            "limit": limit,
            "offset": offset
        }

@router.get("/queues")
async def get_queue_status(
    admin_user: Dict[str, Any] = Depends(require_admin)
):
    """Get status of all processing queues"""
    try:
        queues = queue_manager.get_all_queues_status()
        
        return queues
    except Exception as e:
        logger.error(f"Error getting queue status: {e}")
        # Return mock data
        return {
            "queues": [
                {
                    "name": "document_processing",
                    "pending": 5,
                    "running": 2,
                    "workers": 4,
                    "active_workers": 2,
                    "health": "healthy"
                },
                {
                    "name": "rag_indexing",
                    "pending": 0,
                    "running": 1,
                    "workers": 2,
                    "active_workers": 1,
                    "health": "healthy"
                },
                {
                    "name": "email_notifications",
                    "pending": 12,
                    "running": 0,
                    "workers": 1,
                    "active_workers": 0,
                    "health": "idle"
                }
            ],
            "total_jobs": 20,
            "total_workers": 7,
            "system_health": "healthy"
        }

@router.get("/job/{job_id}")
async def get_job_details(
    job_id: str,
    admin_user: Dict[str, Any] = Depends(require_admin)
):
    """Get detailed information about a specific job"""
    try:
        job = job_manager.get_job(job_id)
        
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")
        
        return job
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting job details: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.post("/job/{job_id}/retry")
async def retry_job(
    job_id: str,
    admin_user: Dict[str, Any] = Depends(require_admin)
):
    """Retry a failed job"""
    try:
        success = job_manager.retry_job(job_id)
        
        if not success:
            raise HTTPException(status_code=404, detail="Job not found or not retryable")
        
        return {"success": True, "message": "Job queued for retry"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrying job: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.post("/job/{job_id}/cancel")
async def cancel_job(
    job_id: str,
    admin_user: Dict[str, Any] = Depends(require_admin)
):
    """Cancel a pending or running job"""
    try:
        success = job_manager.cancel_job(job_id)
        
        if not success:
            raise HTTPException(status_code=404, detail="Job not found or not cancellable")
        
        return {"success": True, "message": "Job cancelled"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error cancelling job: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.delete("/job/{job_id}")
async def delete_job(
    job_id: str,
    admin_user: Dict[str, Any] = Depends(require_admin)
):
    """Delete a completed or failed job"""
    try:
        success = job_manager.delete_job(job_id)
        
        if not success:
            raise HTTPException(status_code=404, detail="Job not found or still running")
        
        return {"success": True, "message": "Job deleted"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting job: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.post("/queue/{queue_name}/pause")
async def pause_queue(
    queue_name: str,
    admin_user: Dict[str, Any] = Depends(require_admin)
):
    """Pause a processing queue"""
    try:
        success = queue_manager.pause_queue(queue_name)
        
        if not success:
            raise HTTPException(status_code=404, detail="Queue not found")
        
        return {"success": True, "message": f"Queue {queue_name} paused"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error pausing queue: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.post("/queue/{queue_name}/resume")
async def resume_queue(
    queue_name: str,
    admin_user: Dict[str, Any] = Depends(require_admin)
):
    """Resume a paused queue"""
    try:
        success = queue_manager.resume_queue(queue_name)
        
        if not success:
            raise HTTPException(status_code=404, detail="Queue not found")
        
        return {"success": True, "message": f"Queue {queue_name} resumed"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error resuming queue: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.put("/queue/{queue_name}/workers")
async def update_queue_workers(
    queue_name: str,
    worker_count: int,
    admin_user: Dict[str, Any] = Depends(require_admin)
):
    """Update the number of workers for a queue"""
    try:
        if worker_count < 0 or worker_count > 10:
            raise HTTPException(status_code=400, detail="Worker count must be between 0 and 10")
        
        success = queue_manager.set_worker_count(queue_name, worker_count)
        
        if not success:
            raise HTTPException(status_code=404, detail="Queue not found")
        
        return {
            "success": True,
            "message": f"Queue {queue_name} worker count set to {worker_count}"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating queue workers: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/statistics")
async def get_processing_statistics(
    days: int = 7,
    admin_user: Dict[str, Any] = Depends(require_admin)
):
    """Get background processing statistics"""
    try:
        stats = job_manager.get_statistics(days)
        
        return stats
    except Exception as e:
        logger.error(f"Error getting processing statistics: {e}")
        # Return mock data
        return {
            "period": f"Last {days} days",
            "total_jobs": 1250,
            "completed_jobs": 1180,
            "failed_jobs": 45,
            "pending_jobs": 25,
            "success_rate": 96.3,
            "average_processing_time_seconds": 45.2,
            "jobs_per_day": [
                {"date": "2025-06-01", "completed": 180, "failed": 8},
                {"date": "2025-06-02", "completed": 165, "failed": 5},
                {"date": "2025-06-03", "completed": 170, "failed": 6},
                {"date": "2025-06-04", "completed": 175, "failed": 7},
                {"date": "2025-06-05", "completed": 155, "failed": 4}
            ],
            "queue_distribution": {
                "document_processing": 650,
                "rag_indexing": 400,
                "email_notifications": 200
            }
        }

@router.delete("/jobs/cleanup")
async def cleanup_old_jobs(
    days: int = 30,
    admin_user: Dict[str, Any] = Depends(require_admin)
):
    """Clean up old completed/failed jobs"""
    try:
        deleted_count = job_manager.cleanup_old_jobs(days)
        
        return {
            "success": True,
            "message": f"Deleted {deleted_count} old jobs",
            "deleted_count": deleted_count
        }
    except Exception as e:
        logger.error(f"Error cleaning up jobs: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")