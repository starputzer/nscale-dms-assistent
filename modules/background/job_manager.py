"""
Background Job Manager
Manages background processing jobs for the system
"""

import uuid
import time
from typing import Dict, List, Any, Optional
from enum import Enum
from datetime import datetime
import asyncio
import json
import os

from modules.core.logging import LogManager
from modules.core.db import DBManager

logger = LogManager.setup_logging(__name__)

class JobStatus(Enum):
    QUEUED = "queued"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    PAUSED = "paused"
    CANCELLED = "cancelled"

class JobType(Enum):
    DOCUMENT_PROCESSING = "document_processing"
    REINDEX = "reindex"
    OPTIMIZE_DB = "optimize_db"
    BACKUP = "backup"
    CLEANUP = "cleanup"
    EMBEDDING_GENERATION = "embedding_generation"

class BackgroundJobManager:
    """Manages background jobs for the system"""
    
    def __init__(self):
        self.db_manager = DBManager()
        self.jobs = {}  # In-memory job storage for now
        self.queue_paused = False
        self._initialize_tables()
    
    def _initialize_tables(self):
        """Initialize job queue tables if not exists"""
        try:
            with self.db_manager.get_session() as session:
                session.execute("""
                    CREATE TABLE IF NOT EXISTS job_queue (
                        id TEXT PRIMARY KEY,
                        name TEXT NOT NULL,
                        type TEXT NOT NULL,
                        status TEXT NOT NULL,
                        progress REAL DEFAULT 0,
                        params TEXT,
                        result TEXT,
                        error_message TEXT,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        started_at TIMESTAMP,
                        completed_at TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                """)
                session.commit()
        except Exception as e:
            logger.error(f"Error initializing job queue tables: {e}")
    
    def create_job(self, name: str, type: str, params: Dict[str, Any] = None) -> str:
        """Create a new background job"""
        job_id = str(uuid.uuid4())
        
        job = {
            "id": job_id,
            "name": name,
            "type": type,
            "status": JobStatus.QUEUED.value,
            "progress": 0.0,
            "params": params or {},
            "created_at": datetime.now(),
            "started_at": None,
            "completed_at": None,
            "error_message": None
        }
        
        # Store in memory
        self.jobs[job_id] = job
        
        # Store in database
        try:
            with self.db_manager.get_session() as session:
                session.execute("""
                    INSERT INTO job_queue (id, name, type, status, progress, params)
                    VALUES (?, ?, ?, ?, ?, ?)
                """, (job_id, name, type, JobStatus.QUEUED.value, 0.0, json.dumps(params or {})))
                session.commit()
        except Exception as e:
            logger.error(f"Error creating job: {e}")
        
        # Trigger job processing
        asyncio.create_task(self._process_job(job_id))
        
        return job_id
    
    def get_job(self, job_id: str) -> Optional[Dict[str, Any]]:
        """Get job details"""
        # Check memory first
        if job_id in self.jobs:
            return self.jobs[job_id]
        
        # Check database
        try:
            with self.db_manager.get_session() as session:
                result = session.execute("""
                    SELECT * FROM job_queue WHERE id = ?
                """, (job_id,)).fetchone()
                
                if result:
                    return {
                        "id": result.id,
                        "name": result.name,
                        "type": result.type,
                        "status": result.status,
                        "progress": result.progress,
                        "params": json.loads(result.params) if result.params else {},
                        "created_at": result.created_at,
                        "started_at": result.started_at,
                        "completed_at": result.completed_at,
                        "error_message": result.error_message
                    }
        except Exception as e:
            logger.error(f"Error getting job: {e}")
        
        return None
    
    def get_all_jobs(self) -> List[Dict[str, Any]]:
        """Get all jobs"""
        jobs = []
        
        try:
            with self.db_manager.get_session() as session:
                results = session.execute("""
                    SELECT * FROM job_queue
                    ORDER BY created_at DESC
                    LIMIT 100
                """).fetchall()
                
                for result in results:
                    jobs.append({
                        "id": result.id,
                        "name": result.name,
                        "type": result.type,
                        "status": result.status,
                        "progress": result.progress,
                        "start_time": result.started_at.timestamp() if result.started_at else time.time(),
                        "duration": int((datetime.now() - result.started_at).total_seconds() * 1000) if result.started_at else 0
                    })
        except Exception as e:
            logger.error(f"Error getting all jobs: {e}")
        
        return jobs
    
    def update_job_progress(self, job_id: str, progress: float, status: JobStatus = None):
        """Update job progress"""
        if job_id in self.jobs:
            self.jobs[job_id]["progress"] = progress
            if status:
                self.jobs[job_id]["status"] = status.value
        
        try:
            with self.db_manager.get_session() as session:
                if status:
                    session.execute("""
                        UPDATE job_queue
                        SET progress = ?, status = ?, updated_at = CURRENT_TIMESTAMP
                        WHERE id = ?
                    """, (progress, status.value, job_id))
                else:
                    session.execute("""
                        UPDATE job_queue
                        SET progress = ?, updated_at = CURRENT_TIMESTAMP
                        WHERE id = ?
                    """, (progress, job_id))
                session.commit()
        except Exception as e:
            logger.error(f"Error updating job progress: {e}")
    
    def pause_job(self, job_id: str) -> bool:
        """Pause a job"""
        if job_id in self.jobs and self.jobs[job_id]["status"] == JobStatus.PROCESSING.value:
            self.jobs[job_id]["status"] = JobStatus.PAUSED.value
            
            try:
                with self.db_manager.get_session() as session:
                    session.execute("""
                        UPDATE job_queue
                        SET status = ?, updated_at = CURRENT_TIMESTAMP
                        WHERE id = ?
                    """, (JobStatus.PAUSED.value, job_id))
                    session.commit()
                return True
            except Exception as e:
                logger.error(f"Error pausing job: {e}")
        
        return False
    
    def resume_job(self, job_id: str) -> bool:
        """Resume a paused job"""
        if job_id in self.jobs and self.jobs[job_id]["status"] == JobStatus.PAUSED.value:
            self.jobs[job_id]["status"] = JobStatus.PROCESSING.value
            
            try:
                with self.db_manager.get_session() as session:
                    session.execute("""
                        UPDATE job_queue
                        SET status = ?, updated_at = CURRENT_TIMESTAMP
                        WHERE id = ?
                    """, (JobStatus.PROCESSING.value, job_id))
                    session.commit()
                
                # Resume processing
                asyncio.create_task(self._process_job(job_id))
                return True
            except Exception as e:
                logger.error(f"Error resuming job: {e}")
        
        return False
    
    def cancel_job(self, job_id: str) -> bool:
        """Cancel a job"""
        if job_id in self.jobs:
            self.jobs[job_id]["status"] = JobStatus.CANCELLED.value
            
            try:
                with self.db_manager.get_session() as session:
                    session.execute("""
                        UPDATE job_queue
                        SET status = ?, completed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
                        WHERE id = ?
                    """, (JobStatus.CANCELLED.value, job_id))
                    session.commit()
                return True
            except Exception as e:
                logger.error(f"Error cancelling job: {e}")
        
        return False
    
    def pause_queue(self) -> bool:
        """Pause the entire job queue"""
        self.queue_paused = True
        logger.info("Job queue paused")
        return True
    
    def resume_queue(self) -> bool:
        """Resume the job queue"""
        self.queue_paused = False
        logger.info("Job queue resumed")
        # Process any queued jobs
        asyncio.create_task(self._process_queued_jobs())
        return True
    
    def get_queue_stats(self) -> Dict[str, Any]:
        """Get queue statistics"""
        try:
            with self.db_manager.get_session() as session:
                # Count by status
                queued = session.execute("""
                    SELECT COUNT(*) FROM job_queue WHERE status = ?
                """, (JobStatus.QUEUED.value,)).scalar() or 0
                
                processing = session.execute("""
                    SELECT COUNT(*) FROM job_queue WHERE status = ?
                """, (JobStatus.PROCESSING.value,)).scalar() or 0
                
                # Today's stats
                today_start = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
                
                completed_today = session.execute("""
                    SELECT COUNT(*) FROM job_queue 
                    WHERE status = ? AND completed_at >= ?
                """, (JobStatus.COMPLETED.value, today_start)).scalar() or 0
                
                failed_today = session.execute("""
                    SELECT COUNT(*) FROM job_queue 
                    WHERE status = ? AND completed_at >= ?
                """, (JobStatus.FAILED.value, today_start)).scalar() or 0
                
                # Average processing time
                avg_time_result = session.execute("""
                    SELECT AVG(JULIANDAY(completed_at) - JULIANDAY(started_at)) * 24 * 60 * 60 * 1000
                    FROM job_queue
                    WHERE status = ? AND completed_at IS NOT NULL AND started_at IS NOT NULL
                """, (JobStatus.COMPLETED.value,)).scalar()
                
                avg_processing_time = float(avg_time_result) if avg_time_result else 0
                
                return {
                    "queued": queued,
                    "processing": processing,
                    "completed_today": completed_today,
                    "failed_today": failed_today,
                    "paused": self.queue_paused,
                    "avg_processing_time": avg_processing_time
                }
        except Exception as e:
            logger.error(f"Error getting queue stats: {e}")
            return {
                "queued": 0,
                "processing": 0,
                "completed_today": 0,
                "failed_today": 0,
                "paused": self.queue_paused,
                "avg_processing_time": 0
            }
    
    async def _process_job(self, job_id: str):
        """Process a job (async)"""
        if self.queue_paused:
            return
        
        job = self.get_job(job_id)
        if not job or job["status"] != JobStatus.QUEUED.value:
            return
        
        # Mark as processing
        self.update_job_progress(job_id, 0, JobStatus.PROCESSING)
        
        try:
            # Update start time
            with self.db_manager.get_session() as session:
                session.execute("""
                    UPDATE job_queue
                    SET started_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                """, (job_id,))
                session.commit()
            
            # Process based on job type
            if job["type"] == JobType.REINDEX.value:
                await self._process_reindex_job(job_id)
            elif job["type"] == JobType.OPTIMIZE_DB.value:
                await self._process_optimize_db_job(job_id)
            elif job["type"] == JobType.DOCUMENT_PROCESSING.value:
                await self._process_document_job(job_id, job["params"])
            else:
                # Unknown job type
                raise ValueError(f"Unknown job type: {job['type']}")
            
            # Mark as completed
            self.update_job_progress(job_id, 100, JobStatus.COMPLETED)
            
            with self.db_manager.get_session() as session:
                session.execute("""
                    UPDATE job_queue
                    SET completed_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                """, (job_id,))
                session.commit()
            
        except Exception as e:
            logger.error(f"Error processing job {job_id}: {e}")
            
            # Mark as failed
            self.update_job_progress(job_id, job.get("progress", 0), JobStatus.FAILED)
            
            with self.db_manager.get_session() as session:
                session.execute("""
                    UPDATE job_queue
                    SET completed_at = CURRENT_TIMESTAMP, error_message = ?
                    WHERE id = ?
                """, (str(e), job_id))
                session.commit()
    
    async def _process_reindex_job(self, job_id: str):
        """Process document reindexing job"""
        logger.info(f"Processing reindex job {job_id}")
        
        # Simulate reindexing
        for i in range(0, 101, 10):
            await asyncio.sleep(1)  # Simulate work
            self.update_job_progress(job_id, i)
            
            # Check if job was cancelled
            job = self.get_job(job_id)
            if job and job["status"] == JobStatus.CANCELLED.value:
                return
    
    async def _process_optimize_db_job(self, job_id: str):
        """Process database optimization job"""
        logger.info(f"Processing database optimization job {job_id}")
        
        # Simulate optimization
        for i in range(0, 101, 20):
            await asyncio.sleep(0.5)  # Simulate work
            self.update_job_progress(job_id, i)
            
            # Check if job was cancelled
            job = self.get_job(job_id)
            if job and job["status"] == JobStatus.CANCELLED.value:
                return
    
    async def _process_document_job(self, job_id: str, params: Dict[str, Any]):
        """Process document job"""
        logger.info(f"Processing document job {job_id}")
        
        # Simulate document processing
        for i in range(0, 101, 5):
            await asyncio.sleep(0.2)  # Simulate work
            self.update_job_progress(job_id, i)
            
            # Check if job was cancelled or paused
            job = self.get_job(job_id)
            if job:
                if job["status"] == JobStatus.CANCELLED.value:
                    return
                elif job["status"] == JobStatus.PAUSED.value:
                    # Wait until resumed
                    while job["status"] == JobStatus.PAUSED.value:
                        await asyncio.sleep(1)
                        job = self.get_job(job_id)
                        if not job or job["status"] == JobStatus.CANCELLED.value:
                            return
    
    async def _process_queued_jobs(self):
        """Process any queued jobs"""
        try:
            with self.db_manager.get_session() as session:
                queued_jobs = session.execute("""
                    SELECT id FROM job_queue
                    WHERE status = ?
                    ORDER BY created_at
                """, (JobStatus.QUEUED.value,)).fetchall()
                
                for job in queued_jobs:
                    if not self.queue_paused:
                        await self._process_job(job.id)
        except Exception as e:
            logger.error(f"Error processing queued jobs: {e}")
    
    def is_paused(self) -> bool:
        """Check if queue is paused"""
        return self.queue_paused
    
    def pause_processing(self):
        """Pause all job processing"""
        self.queue_paused = True
        logger.info("Job processing paused")
    
    def resume_processing(self):
        """Resume job processing"""
        self.queue_paused = False
        logger.info("Job processing resumed")
        # Process any queued jobs
        asyncio.create_task(self._process_queued_jobs())
    
    def get_active_worker_count(self) -> int:
        """Get number of active workers"""
        # Count jobs in processing state
        return len([j for j in self.jobs.values() if j["status"] == JobStatus.PROCESSING.value])
    
    def get_max_worker_count(self) -> int:
        """Get maximum number of workers"""
        # Can be configured, default to 3
        return int(os.getenv("MAX_BACKGROUND_WORKERS", "3"))
    
    def clear_completed_jobs(self) -> int:
        """Clear completed and failed jobs from history"""
        try:
            with self.db_manager.get_session() as session:
                result = session.execute("""
                    DELETE FROM job_queue
                    WHERE status IN (?, ?)
                """, (JobStatus.COMPLETED.value, JobStatus.FAILED.value))
                count = result.rowcount
                session.commit()
                
                # Also clear from memory
                to_remove = []
                for job_id, job in self.jobs.items():
                    if job["status"] in [JobStatus.COMPLETED.value, JobStatus.FAILED.value]:
                        to_remove.append(job_id)
                
                for job_id in to_remove:
                    del self.jobs[job_id]
                
                logger.info(f"Cleared {count} completed/failed jobs")
                return count
        except Exception as e:
            logger.error(f"Error clearing completed jobs: {e}")
            return 0