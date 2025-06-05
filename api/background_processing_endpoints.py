"""
Background Processing API Endpoints
Uses the BackgroundJobManager for unified job processing
"""

from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
import json
from pathlib import Path

from modules.core.logging import LogManager
from modules.core.auth_dependency import get_current_user, get_admin_user as require_admin
from modules.core.db import DBManager
from modules.background.job_manager import BackgroundJobManager

# Initialize components
logger = LogManager.setup_logging(__name__)

db_manager = DBManager()
job_manager = BackgroundJobManager()

router = APIRouter()

# Pydantic models
class QueueStatus(BaseModel):
    paused: bool
    queued: int
    processing: int
    completed: int
    failed: int
    cancelled: int
    total_jobs: int
    active_workers: int

class JobDetails(BaseModel):
    id: str
    type: str
    status: str
    priority: int
    created_at: datetime
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    progress: float
    data: Dict[str, Any]
    error: Optional[str] = None
    estimated_time: Optional[int] = None

class ProcessingStats(BaseModel):
    jobs_per_hour: float
    avg_processing_time: float
    success_rate: float
    failure_rate: float
    queue_depth: int
    estimated_queue_time: int
    top_job_types: List[Dict[str, Any]]
    worker_utilization: float

class JobSubmission(BaseModel):
    job_type: str
    priority: int = 5
    data: Dict[str, Any]
    estimated_time: Optional[int] = None

class BatchSubmission(BaseModel):
    jobs: List[JobSubmission]
    priority: int = 5

# Endpoints
@router.get("/queue/status", response_model=QueueStatus)
async def get_queue_status(user: Dict[str, Any] = Depends(require_admin)):
    """Get current queue status"""
    try:
        all_jobs = job_manager.get_all_jobs()
        
        status_counts = {
            "queued": 0,
            "processing": 0,
            "completed": 0,
            "failed": 0,
            "cancelled": 0
        }
        
        for job in all_jobs:
            if job.status in status_counts:
                status_counts[job.status] += 1
        
        return QueueStatus(
            paused=job_manager.is_paused(),
            queued=status_counts["queued"],
            processing=status_counts["processing"],
            completed=status_counts["completed"],
            failed=status_counts["failed"],
            cancelled=status_counts["cancelled"],
            total_jobs=len(all_jobs),
            active_workers=job_manager.get_active_worker_count()
        )
    except Exception as e:
        logger.error(f"Error getting queue status: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/jobs", response_model=List[JobDetails])
async def get_jobs(
    status: Optional[str] = None,
    limit: int = 100,
    offset: int = 0,
    user: Dict[str, Any] = Depends(require_admin)
):
    """Get jobs with optional filtering"""
    try:
        all_jobs = job_manager.get_all_jobs()
        
        # Filter by status if provided
        if status:
            all_jobs = [job for job in all_jobs if job.status == status]
        
        # Sort by creation time (newest first)
        all_jobs.sort(key=lambda x: x.created_at, reverse=True)
        
        # Apply pagination
        paginated_jobs = all_jobs[offset:offset + limit]
        
        # Convert to JobDetails
        job_details = []
        for job in paginated_jobs:
            job_details.append(JobDetails(
                id=job.id,
                type=job.job_type,
                status=job.status,
                priority=job.data.get("priority", 5),
                created_at=job.created_at,
                started_at=job.started_at,
                completed_at=job.completed_at,
                progress=job.progress,
                data=job.data,
                error=job.error,
                estimated_time=job.data.get("estimated_time")
            ))
        
        return job_details
    except Exception as e:
        logger.error(f"Error getting jobs: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/stats", response_model=ProcessingStats)
async def get_processing_stats(user: Dict[str, Any] = Depends(require_admin)):
    """Get processing statistics"""
    try:
        all_jobs = job_manager.get_all_jobs()
        
        # Calculate statistics
        now = datetime.now()
        hour_ago = now - timedelta(hours=1)
        
        # Jobs per hour
        recent_jobs = [j for j in all_jobs if j.created_at > hour_ago]
        jobs_per_hour = len(recent_jobs)
        
        # Average processing time
        completed_jobs = [j for j in all_jobs if j.completed_at and j.started_at]
        if completed_jobs:
            avg_processing_time = sum(
                (j.completed_at - j.started_at).total_seconds() 
                for j in completed_jobs
            ) / len(completed_jobs)
        else:
            avg_processing_time = 0
        
        # Success/failure rates
        total_finished = len([j for j in all_jobs if j.status in ["completed", "failed"]])
        if total_finished > 0:
            success_rate = len([j for j in all_jobs if j.status == "completed"]) / total_finished * 100
            failure_rate = 100 - success_rate
        else:
            success_rate = 0
            failure_rate = 0
        
        # Queue depth and estimated time
        queued_jobs = [j for j in all_jobs if j.status == "queued"]
        queue_depth = len(queued_jobs)
        estimated_queue_time = sum(
            j.data.get("estimated_time", 60) for j in queued_jobs
        )
        
        # Top job types
        job_type_counts = {}
        for job in all_jobs:
            job_type = job.job_type
            if job_type not in job_type_counts:
                job_type_counts[job_type] = 0
            job_type_counts[job_type] += 1
        
        top_job_types = [
            {"type": k, "count": v} 
            for k, v in sorted(job_type_counts.items(), key=lambda x: x[1], reverse=True)[:5]
        ]
        
        # Worker utilization
        active_workers = job_manager.get_active_worker_count()
        max_workers = job_manager.get_max_worker_count()
        worker_utilization = (active_workers / max_workers * 100) if max_workers > 0 else 0
        
        return ProcessingStats(
            jobs_per_hour=jobs_per_hour,
            avg_processing_time=avg_processing_time,
            success_rate=success_rate,
            failure_rate=failure_rate,
            queue_depth=queue_depth,
            estimated_queue_time=estimated_queue_time,
            top_job_types=top_job_types,
            worker_utilization=worker_utilization
        )
    except Exception as e:
        logger.error(f"Error getting processing stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/queue/pause")
async def pause_queue(user: Dict[str, Any] = Depends(require_admin)):
    """Pause job processing"""
    try:
        job_manager.pause_processing()
        return {"success": True, "message": "Queue processing paused"}
    except Exception as e:
        logger.error(f"Error pausing queue: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/queue/resume")
async def resume_queue(user: Dict[str, Any] = Depends(require_admin)):
    """Resume job processing"""
    try:
        job_manager.resume_processing()
        return {"success": True, "message": "Queue processing resumed"}
    except Exception as e:
        logger.error(f"Error resuming queue: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/submit-job", response_model=Dict[str, Any])
async def submit_job(submission: JobSubmission, user: Dict[str, Any] = Depends(require_admin)):
    """Submit a single job to the queue"""
    try:
        # Add priority to job data
        job_data = submission.data.copy()
        job_data["priority"] = submission.priority
        if submission.estimated_time:
            job_data["estimated_time"] = submission.estimated_time
        
        job = job_manager.create_job(
            job_type=submission.job_type,
            data=job_data
        )
        
        return {
            "success": True,
            "job_id": job.id,
            "message": f"Job {job.id} submitted successfully"
        }
    except Exception as e:
        logger.error(f"Error submitting job: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/submit-batch", response_model=Dict[str, Any])
async def submit_batch(submission: BatchSubmission, user: Dict[str, Any] = Depends(require_admin)):
    """Submit multiple jobs to the queue"""
    try:
        job_ids = []
        
        for job_spec in submission.jobs:
            job_data = job_spec.data.copy()
            job_data["priority"] = job_spec.priority or submission.priority
            if job_spec.estimated_time:
                job_data["estimated_time"] = job_spec.estimated_time
            
            job = job_manager.create_job(
                job_type=job_spec.job_type,
                data=job_data
            )
            job_ids.append(job.id)
        
        return {
            "success": True,
            "job_ids": job_ids,
            "total": len(job_ids),
            "message": f"{len(job_ids)} jobs submitted successfully"
        }
    except Exception as e:
        logger.error(f"Error submitting batch: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/cancel/{job_id}")
async def cancel_job(job_id: str, user: Dict[str, Any] = Depends(require_admin)):
    """Cancel a specific job"""
    try:
        success = job_manager.cancel_job(job_id)
        if success:
            return {"success": True, "message": f"Job {job_id} cancelled"}
        else:
            raise HTTPException(status_code=404, detail="Job not found")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error cancelling job: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/retry/{job_id}")
async def retry_job(job_id: str, user: Dict[str, Any] = Depends(require_admin)):
    """Retry a failed job"""
    try:
        job = job_manager.get_job(job_id)
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")
        
        if job.status != "failed":
            raise HTTPException(status_code=400, detail="Can only retry failed jobs")
        
        # Create new job with same data
        new_job_data = job.data.copy()
        new_job_data["retry_of"] = job_id
        new_job_data["priority"] = new_job_data.get("priority", 5) + 1  # Higher priority for retries
        
        new_job = job_manager.create_job(
            job_type=job.job_type,
            data=new_job_data
        )
        
        return {
            "success": True,
            "new_job_id": new_job.id,
            "message": f"Job {job_id} resubmitted as {new_job.id}"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrying job: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/clear-completed")
async def clear_completed_jobs(user: Dict[str, Any] = Depends(require_admin)):
    """Clear all completed and failed jobs from history"""
    try:
        cleared_count = job_manager.clear_completed_jobs()
        return {
            "success": True,
            "cleared": cleared_count,
            "message": f"Cleared {cleared_count} completed/failed jobs"
        }
    except Exception as e:
        logger.error(f"Error clearing completed jobs: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/job-types", response_model=List[Dict[str, Any]])
async def get_job_types(user: Dict[str, Any] = Depends(require_admin)):
    """Get available job types"""
    try:
        # Define available job types
        job_types = [
            {
                "type": "document_conversion",
                "name": "Document Conversion",
                "description": "Convert and process documents for RAG",
                "icon": "file-alt",
                "estimated_time": 120
            },
            {
                "type": "reindex_documents",
                "name": "Reindex Documents",
                "description": "Rebuild document embeddings and search index",
                "icon": "search",
                "estimated_time": 300
            },
            {
                "type": "database_optimization",
                "name": "Database Optimization",
                "description": "Optimize database performance",
                "icon": "database",
                "estimated_time": 180
            },
            {
                "type": "cache_cleanup",
                "name": "Cache Cleanup",
                "description": "Clean expired cache entries",
                "icon": "broom",
                "estimated_time": 60
            },
            {
                "type": "log_rotation",
                "name": "Log Rotation",
                "description": "Archive and compress old logs",
                "icon": "archive",
                "estimated_time": 90
            },
            {
                "type": "backup_creation",
                "name": "Backup Creation",
                "description": "Create system backup",
                "icon": "save",
                "estimated_time": 240
            }
        ]
        
        return job_types
    except Exception as e:
        logger.error(f"Error getting job types: {e}")
        raise HTTPException(status_code=500, detail=str(e))