"""
API Endpoints for Background Processing System
Provides REST API for document processing queue management
"""

from fastapi import FastAPI, HTTPException, BackgroundTasks, Query
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
import asyncio
import json
from pathlib import Path

from modules.background import (
    create_background_processor,
    ProcessingPriority,
    ProcessingStatus,
    ProcessingMonitor
)
from modules.background.queue_manager import QueuePersistence, QueueMonitor
from modules.core.logging import LogManager


# Initialize components
logger = LogManager.setup_logging(__name__)
processor = None
queue_persistence = None
queue_monitor = None
processing_monitor = None


def get_processor():
    """Get or create the background processor instance"""
    global processor, queue_persistence, queue_monitor, processing_monitor
    
    if processor is None:
        processor = create_background_processor({
            'max_workers': 4,
            'db_path': 'data/knowledge_base.db'
        })
        queue_persistence = QueuePersistence('data/processing_queue.db')
        queue_monitor = QueueMonitor(queue_persistence)
        processing_monitor = ProcessingMonitor(processor)
        
        # Load any pending jobs from previous session
        pending_jobs = queue_persistence.load_pending_jobs()
        for job in pending_jobs:
            processor.active_jobs[job.job_id] = job
            processor.job_queue.put((job.priority.value, job))
        
        logger.info(f"✅ Loaded {len(pending_jobs)} pending jobs from previous session")
    
    return processor


# Pydantic models
class SubmitJobRequest(BaseModel):
    file_path: str = Field(..., description="Path to the document to process")
    priority: str = Field("normal", description="Processing priority: critical, high, normal, low, background")
    metadata: Optional[Dict[str, Any]] = Field(None, description="Optional metadata for the job")


class BatchSubmitRequest(BaseModel):
    file_paths: List[str] = Field(..., description="List of document paths to process")
    priority: str = Field("normal", description="Processing priority for all documents")
    metadata: Optional[Dict[str, Any]] = Field(None, description="Optional metadata for all jobs")


class JobResponse(BaseModel):
    job_id: str
    status: str
    file_path: str
    priority: str
    created_at: datetime
    started_at: Optional[datetime]
    completed_at: Optional[datetime]
    progress: float
    current_step: str
    error_message: Optional[str]
    result: Optional[Dict[str, Any]]


class QueueStatusResponse(BaseModel):
    queued: int
    active: int
    completed: int
    paused: bool
    workers: int
    stats: Dict[str, Any]


class HealthCheckResponse(BaseModel):
    status: str
    total_jobs: int
    queued_jobs: int
    processing_jobs: int
    failed_jobs: int
    oldest_job_age: Optional[float]
    alerts: List[Dict[str, Any]]


# API Router
app = FastAPI(title="Background Processing API")


@app.post("/api/background/submit", response_model=Dict[str, str])
async def submit_job(request: SubmitJobRequest):
    """Submit a single document for background processing"""
    try:
        processor = get_processor()
        
        # Validate file exists
        if not Path(request.file_path).exists():
            raise HTTPException(status_code=404, detail=f"File not found: {request.file_path}")
        
        # Convert priority string to enum
        priority_map = {
            'critical': ProcessingPriority.CRITICAL,
            'high': ProcessingPriority.HIGH,
            'normal': ProcessingPriority.NORMAL,
            'low': ProcessingPriority.LOW,
            'background': ProcessingPriority.BACKGROUND
        }
        priority = priority_map.get(request.priority.lower(), ProcessingPriority.NORMAL)
        
        # Submit job
        job_id = processor.submit_job(
            request.file_path,
            priority,
            request.metadata
        )
        
        # Persist to queue
        job = processor.get_job_status(job_id)
        if job and queue_persistence:
            queue_persistence.save_job(job)
        
        return {"job_id": job_id, "status": "submitted"}
        
    except Exception as e:
        logger.error(f"Error submitting job: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/background/submit-batch", response_model=Dict[str, Any])
async def submit_batch(request: BatchSubmitRequest):
    """Submit multiple documents for background processing"""
    try:
        processor = get_processor()
        
        # Validate files exist
        missing_files = [f for f in request.file_paths if not Path(f).exists()]
        if missing_files:
            raise HTTPException(
                status_code=404, 
                detail=f"Files not found: {', '.join(missing_files)}"
            )
        
        # Convert priority
        priority_map = {
            'critical': ProcessingPriority.CRITICAL,
            'high': ProcessingPriority.HIGH,
            'normal': ProcessingPriority.NORMAL,
            'low': ProcessingPriority.LOW,
            'background': ProcessingPriority.BACKGROUND
        }
        priority = priority_map.get(request.priority.lower(), ProcessingPriority.NORMAL)
        
        # Submit batch
        job_ids = processor.submit_batch(request.file_paths, priority)
        
        # Persist jobs
        if queue_persistence:
            for job_id in job_ids:
                job = processor.get_job_status(job_id)
                if job:
                    queue_persistence.save_job(job)
        
        return {
            "job_ids": job_ids,
            "total": len(job_ids),
            "status": "submitted"
        }
        
    except Exception as e:
        logger.error(f"Error submitting batch: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/background/job/{job_id}", response_model=JobResponse)
async def get_job_status(job_id: str):
    """Get the status of a specific job"""
    try:
        processor = get_processor()
        job = processor.get_job_status(job_id)
        
        if not job:
            raise HTTPException(status_code=404, detail=f"Job not found: {job_id}")
        
        return JobResponse(
            job_id=job.job_id,
            status=job.status.value,
            file_path=job.file_path,
            priority=job.priority.name.lower(),
            created_at=job.created_at,
            started_at=job.started_at,
            completed_at=job.completed_at,
            progress=job.progress,
            current_step=job.current_step,
            error_message=job.error_message,
            result=job.result
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting job status: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/background/job/{job_id}/progress")
async def get_job_progress(job_id: str):
    """Get detailed progress information for a job"""
    try:
        processor = get_processor()
        progress = processor.get_job_progress(job_id)
        
        if not progress:
            raise HTTPException(status_code=404, detail=f"Job not found: {job_id}")
        
        return {
            "job_id": progress.job_id,
            "status": progress.status.value,
            "progress": progress.progress,
            "current_step": progress.current_step,
            "steps_completed": progress.steps_completed,
            "estimated_time_remaining": progress.estimated_time_remaining,
            "message": progress.message
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting job progress: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/api/background/job/{job_id}")
async def cancel_job(job_id: str):
    """Cancel a processing job"""
    try:
        processor = get_processor()
        
        if processor.cancel_job(job_id):
            # Archive cancelled job
            if queue_persistence:
                job = processor.get_job_status(job_id)
                if job:
                    queue_persistence.archive_job(job)
            
            return {"status": "cancelled", "job_id": job_id}
        else:
            raise HTTPException(status_code=404, detail=f"Job not found or cannot be cancelled: {job_id}")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error cancelling job: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/background/queue/status", response_model=QueueStatusResponse)
async def get_queue_status():
    """Get the current queue status"""
    try:
        processor = get_processor()
        status = processor.get_queue_status()
        
        return QueueStatusResponse(**status)
        
    except Exception as e:
        logger.error(f"Error getting queue status: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/background/queue/health", response_model=HealthCheckResponse)
async def get_queue_health():
    """Get queue health information"""
    try:
        if not queue_monitor:
            raise HTTPException(status_code=503, detail="Queue monitor not initialized")
        
        health = queue_monitor.check_queue_health()
        
        return HealthCheckResponse(**health)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting queue health: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/background/queue/pause")
async def pause_processing():
    """Pause all processing"""
    try:
        processor = get_processor()
        processor.pause_processing()
        
        return {"status": "paused"}
        
    except Exception as e:
        logger.error(f"Error pausing processing: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/background/queue/resume")
async def resume_processing():
    """Resume processing"""
    try:
        processor = get_processor()
        processor.resume_processing()
        
        return {"status": "resumed"}
        
    except Exception as e:
        logger.error(f"Error resuming processing: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/background/statistics")
async def get_statistics(days: int = Query(7, description="Number of days to include")):
    """Get processing statistics"""
    try:
        if not queue_persistence:
            raise HTTPException(status_code=503, detail="Queue persistence not initialized")
        
        stats = queue_persistence.get_statistics(days)
        
        return stats
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting statistics: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/background/monitor/summary")
async def get_monitor_summary():
    """Get comprehensive monitoring summary"""
    try:
        if not processing_monitor:
            raise HTTPException(status_code=503, detail="Processing monitor not initialized")
        
        summary = processing_monitor.get_summary_report()
        
        return summary
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting monitor summary: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/background/stream/progress")
async def stream_progress():
    """Stream real-time progress updates via Server-Sent Events"""
    async def generate():
        processor = get_processor()
        
        # Register callback to capture progress
        progress_queue = asyncio.Queue()
        
        async def progress_callback(progress):
            await progress_queue.put(progress)
        
        # Note: This is simplified. In production, you'd need proper async handling
        while True:
            try:
                # Get active jobs
                active_jobs = []
                for job_id, job in processor.active_jobs.items():
                    if job.status == ProcessingStatus.PROCESSING:
                        progress = processor.get_job_progress(job_id)
                        if progress:
                            active_jobs.append({
                                'job_id': job_id,
                                'progress': progress.progress,
                                'current_step': progress.current_step,
                                'status': progress.status.value
                            })
                
                # Send update
                data = json.dumps({
                    'type': 'progress',
                    'timestamp': datetime.now().isoformat(),
                    'active_jobs': active_jobs,
                    'queue_size': processor.job_queue.qsize()
                })
                
                yield f"data: {data}\n\n"
                
                await asyncio.sleep(1)  # Update every second
                
            except Exception as e:
                logger.error(f"Error in progress stream: {str(e)}")
                yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"
    
    return StreamingResponse(generate(), media_type="text/event-stream")


@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    global processor
    if processor:
        processor.shutdown(wait=True)
        processor = None


# Health check endpoint
@app.get("/api/background/health")
async def health_check():
    """Basic health check"""
    return {"status": "healthy", "service": "background-processing"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)