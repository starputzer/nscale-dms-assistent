import logging
import asyncio
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Callable, Any
from enum import Enum
import json
from dataclasses import dataclass, asdict
import os
import sqlite3
from pathlib import Path

logger = logging.getLogger(__name__)

class JobStatus(Enum):
    PENDING = "pending"
    RUNNING = "running"
    SUCCESS = "success"
    FAILED = "failed"
    RETRYING = "retrying"
    CANCELLED = "cancelled"
    DEAD = "dead"  # Max retries exceeded

@dataclass
class Job:
    id: str
    type: str
    payload: Dict[str, Any]
    status: JobStatus
    created_at: datetime
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    retry_count: int = 0
    max_retries: int = 3
    error_message: Optional[str] = None
    result: Optional[Dict[str, Any]] = None
    user_id: Optional[str] = None
    priority: int = 5  # 1-10, 1 is highest priority
    scheduled_for: Optional[datetime] = None
    
    def to_dict(self) -> Dict:
        data = asdict(self)
        data['status'] = self.status.value
        data['created_at'] = self.created_at.isoformat()
        if self.started_at:
            data['started_at'] = self.started_at.isoformat()
        if self.completed_at:
            data['completed_at'] = self.completed_at.isoformat()
        if self.scheduled_for:
            data['scheduled_for'] = self.scheduled_for.isoformat()
        return data
    
    @classmethod
    def from_dict(cls, data: Dict) -> 'Job':
        data['status'] = JobStatus(data['status'])
        data['created_at'] = datetime.fromisoformat(data['created_at'])
        if data.get('started_at'):
            data['started_at'] = datetime.fromisoformat(data['started_at'])
        if data.get('completed_at'):
            data['completed_at'] = datetime.fromisoformat(data['completed_at'])
        if data.get('scheduled_for'):
            data['scheduled_for'] = datetime.fromisoformat(data['scheduled_for'])
        return cls(**data)

class RetryStrategy:
    """Defines retry behavior for failed jobs"""
    
    def __init__(self, max_retries: int = 3, backoff_factor: float = 2.0, 
                 initial_delay: int = 60, max_delay: int = 3600):
        self.max_retries = max_retries
        self.backoff_factor = backoff_factor
        self.initial_delay = initial_delay  # seconds
        self.max_delay = max_delay  # seconds
    
    def get_retry_delay(self, retry_count: int) -> int:
        """Calculate delay before next retry using exponential backoff"""
        delay = self.initial_delay * (self.backoff_factor ** retry_count)
        return min(int(delay), self.max_delay)
    
    def should_retry(self, job: Job) -> bool:
        """Determine if job should be retried"""
        return job.retry_count < self.max_retries

class JobRetryManager:
    """Manages background job execution with retry capabilities"""
    
    def __init__(self, db_path: Optional[str] = None):
        self.db_path = db_path or os.path.join(
            Path(__file__).parent.parent.parent, 'data', 'db', 'jobs.db'
        )
        self._init_db()
        
        # Job handlers registry
        self.handlers: Dict[str, Callable] = {}
        
        # Retry strategies per job type
        self.retry_strategies: Dict[str, RetryStrategy] = {
            'default': RetryStrategy(),
            'document_processing': RetryStrategy(max_retries=5, initial_delay=30),
            'email_send': RetryStrategy(max_retries=3, initial_delay=10),
            'rag_indexing': RetryStrategy(max_retries=4, initial_delay=120),
            'model_training': RetryStrategy(max_retries=2, initial_delay=300)
        }
        
        # Background task for processing jobs
        self.processing_task = None
        self.is_running = False
    
    def _init_db(self):
        """Initialize jobs database"""
        os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
        
        with sqlite3.connect(self.db_path) as conn:
            conn.execute('''
                CREATE TABLE IF NOT EXISTS jobs (
                    id TEXT PRIMARY KEY,
                    type TEXT NOT NULL,
                    payload TEXT NOT NULL,
                    status TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    started_at TEXT,
                    completed_at TEXT,
                    retry_count INTEGER DEFAULT 0,
                    max_retries INTEGER DEFAULT 3,
                    error_message TEXT,
                    result TEXT,
                    user_id TEXT,
                    priority INTEGER DEFAULT 5,
                    scheduled_for TEXT,
                    INDEX idx_status (status),
                    INDEX idx_type (type),
                    INDEX idx_user (user_id),
                    INDEX idx_scheduled (scheduled_for)
                )
            ''')
            conn.commit()
    
    def register_handler(self, job_type: str, handler: Callable):
        """Register a handler for a specific job type"""
        self.handlers[job_type] = handler
        logger.info(f"Registered handler for job type: {job_type}")
    
    def set_retry_strategy(self, job_type: str, strategy: RetryStrategy):
        """Set custom retry strategy for a job type"""
        self.retry_strategies[job_type] = strategy
    
    async def create_job(self, job_type: str, payload: Dict[str, Any], 
                        user_id: Optional[str] = None, priority: int = 5,
                        scheduled_for: Optional[datetime] = None) -> Job:
        """Create and queue a new job"""
        import uuid
        
        job = Job(
            id=str(uuid.uuid4()),
            type=job_type,
            payload=payload,
            status=JobStatus.PENDING,
            created_at=datetime.now(),
            user_id=user_id,
            priority=priority,
            scheduled_for=scheduled_for,
            max_retries=self.retry_strategies.get(
                job_type, self.retry_strategies['default']
            ).max_retries
        )
        
        # Save to database
        with sqlite3.connect(self.db_path) as conn:
            conn.execute('''
                INSERT INTO jobs (id, type, payload, status, created_at, 
                                 retry_count, max_retries, user_id, priority, scheduled_for)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                job.id, job.type, json.dumps(job.payload), job.status.value,
                job.created_at.isoformat(), job.retry_count, job.max_retries,
                job.user_id, job.priority, 
                job.scheduled_for.isoformat() if job.scheduled_for else None
            ))
            conn.commit()
        
        logger.info(f"Created job {job.id} of type {job_type}")
        return job
    
    async def get_job(self, job_id: str) -> Optional[Job]:
        """Get job by ID"""
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.execute('SELECT * FROM jobs WHERE id = ?', (job_id,))
            row = cursor.fetchone()
            
            if row:
                return self._row_to_job(dict(row))
        return None
    
    async def get_jobs(self, status: Optional[JobStatus] = None, 
                      job_type: Optional[str] = None,
                      user_id: Optional[str] = None,
                      limit: int = 100) -> List[Job]:
        """Get jobs with optional filters"""
        query = 'SELECT * FROM jobs WHERE 1=1'
        params = []
        
        if status:
            query += ' AND status = ?'
            params.append(status.value)
        if job_type:
            query += ' AND type = ?'
            params.append(job_type)
        if user_id:
            query += ' AND user_id = ?'
            params.append(user_id)
        
        query += ' ORDER BY priority ASC, created_at DESC LIMIT ?'
        params.append(limit)
        
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.execute(query, params)
            rows = cursor.fetchall()
            
            return [self._row_to_job(dict(row)) for row in rows]
    
    def _row_to_job(self, row: Dict) -> Job:
        """Convert database row to Job object"""
        row['payload'] = json.loads(row['payload'])
        if row.get('result'):
            row['result'] = json.loads(row['result'])
        return Job.from_dict(row)
    
    async def cancel_job(self, job_id: str) -> bool:
        """Cancel a pending or running job"""
        job = await self.get_job(job_id)
        if not job:
            return False
        
        if job.status in [JobStatus.PENDING, JobStatus.RUNNING, JobStatus.RETRYING]:
            job.status = JobStatus.CANCELLED
            job.completed_at = datetime.now()
            await self._update_job(job)
            logger.info(f"Cancelled job {job_id}")
            return True
        
        return False
    
    async def retry_job(self, job_id: str) -> bool:
        """Manually retry a failed job"""
        job = await self.get_job(job_id)
        if not job or job.status not in [JobStatus.FAILED, JobStatus.DEAD]:
            return False
        
        job.status = JobStatus.PENDING
        job.retry_count = 0  # Reset retry count
        job.error_message = None
        job.started_at = None
        job.completed_at = None
        await self._update_job(job)
        
        logger.info(f"Manually retrying job {job_id}")
        return True
    
    async def _update_job(self, job: Job):
        """Update job in database"""
        with sqlite3.connect(self.db_path) as conn:
            conn.execute('''
                UPDATE jobs SET status = ?, started_at = ?, completed_at = ?,
                               retry_count = ?, error_message = ?, result = ?
                WHERE id = ?
            ''', (
                job.status.value,
                job.started_at.isoformat() if job.started_at else None,
                job.completed_at.isoformat() if job.completed_at else None,
                job.retry_count,
                job.error_message,
                json.dumps(job.result) if job.result else None,
                job.id
            ))
            conn.commit()
    
    async def start_processing(self):
        """Start background job processing"""
        if self.is_running:
            logger.warning("Job processing already running")
            return
        
        self.is_running = True
        self.processing_task = asyncio.create_task(self._process_jobs())
        logger.info("Started job processing")
    
    async def stop_processing(self):
        """Stop background job processing"""
        self.is_running = False
        if self.processing_task:
            self.processing_task.cancel()
            try:
                await self.processing_task
            except asyncio.CancelledError:
                pass
        logger.info("Stopped job processing")
    
    async def _process_jobs(self):
        """Main job processing loop"""
        while self.is_running:
            try:
                # Get next pending job
                jobs = await self._get_next_jobs()
                
                if jobs:
                    # Process jobs concurrently
                    tasks = [self._execute_job(job) for job in jobs]
                    await asyncio.gather(*tasks, return_exceptions=True)
                else:
                    # No jobs, wait a bit
                    await asyncio.sleep(5)
                    
            except Exception as e:
                logger.error(f"Error in job processing loop: {str(e)}")
                await asyncio.sleep(10)
    
    async def _get_next_jobs(self, batch_size: int = 5) -> List[Job]:
        """Get next jobs to process"""
        now = datetime.now()
        
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.execute('''
                SELECT * FROM jobs 
                WHERE status IN (?, ?) 
                AND (scheduled_for IS NULL OR scheduled_for <= ?)
                ORDER BY priority ASC, created_at ASC
                LIMIT ?
            ''', (JobStatus.PENDING.value, JobStatus.RETRYING.value, 
                 now.isoformat(), batch_size))
            
            rows = cursor.fetchall()
            return [self._row_to_job(dict(row)) for row in rows]
    
    async def _execute_job(self, job: Job):
        """Execute a single job"""
        logger.info(f"Executing job {job.id} (type: {job.type})")
        
        # Update job status
        job.status = JobStatus.RUNNING
        job.started_at = datetime.now()
        await self._update_job(job)
        
        try:
            # Get handler
            handler = self.handlers.get(job.type)
            if not handler:
                raise ValueError(f"No handler registered for job type: {job.type}")
            
            # Execute handler
            result = await handler(job.payload)
            
            # Success
            job.status = JobStatus.SUCCESS
            job.completed_at = datetime.now()
            job.result = result
            await self._update_job(job)
            
            logger.info(f"Job {job.id} completed successfully")
            
            # Send completion notification if email service available
            try:
                from modules.core.email_service import email_service
                if job.user_id:
                    # Get user email (simplified for example)
                    duration = str(job.completed_at - job.started_at)
                    await email_service.send_job_completion_email(
                        "user@example.com",  # Would get from user_id
                        "User",
                        job.id,
                        job.type,
                        "success",
                        duration,
                        result
                    )
            except:
                pass  # Email sending is optional
                
        except Exception as e:
            logger.error(f"Job {job.id} failed: {str(e)}")
            
            job.error_message = str(e)
            job.retry_count += 1
            
            # Check if should retry
            strategy = self.retry_strategies.get(job.type, self.retry_strategies['default'])
            if strategy.should_retry(job):
                # Schedule retry
                retry_delay = strategy.get_retry_delay(job.retry_count)
                job.status = JobStatus.RETRYING
                job.scheduled_for = datetime.now() + timedelta(seconds=retry_delay)
                
                logger.info(f"Job {job.id} will retry in {retry_delay} seconds")
            else:
                # Max retries exceeded
                job.status = JobStatus.DEAD
                job.completed_at = datetime.now()
                logger.error(f"Job {job.id} exceeded max retries")
            
            await self._update_job(job)
    
    async def get_statistics(self) -> Dict[str, Any]:
        """Get job processing statistics"""
        with sqlite3.connect(self.db_path) as conn:
            # Count by status
            cursor = conn.execute('''
                SELECT status, COUNT(*) as count 
                FROM jobs 
                GROUP BY status
            ''')
            status_counts = {row[0]: row[1] for row in cursor.fetchall()}
            
            # Count by type
            cursor = conn.execute('''
                SELECT type, COUNT(*) as count 
                FROM jobs 
                GROUP BY type
            ''')
            type_counts = {row[0]: row[1] for row in cursor.fetchall()}
            
            # Average processing time for successful jobs
            cursor = conn.execute('''
                SELECT AVG(julianday(completed_at) - julianday(started_at)) * 86400 as avg_seconds
                FROM jobs 
                WHERE status = ? AND started_at IS NOT NULL AND completed_at IS NOT NULL
            ''', (JobStatus.SUCCESS.value,))
            avg_processing_time = cursor.fetchone()[0] or 0
            
            # Jobs in last 24 hours
            yesterday = (datetime.now() - timedelta(days=1)).isoformat()
            cursor = conn.execute('''
                SELECT COUNT(*) FROM jobs WHERE created_at >= ?
            ''', (yesterday,))
            jobs_24h = cursor.fetchone()[0]
            
            return {
                'status_counts': status_counts,
                'type_counts': type_counts,
                'avg_processing_time_seconds': avg_processing_time,
                'jobs_last_24h': jobs_24h,
                'total_jobs': sum(status_counts.values())
            }

# Global job manager instance
job_manager = JobRetryManager()