"""
Advanced Queue Management for Background Processing
Provides persistent queue storage, priority management, and recovery mechanisms
"""

import sqlite3
import json
import os
from typing import List, Optional, Dict, Any, Tuple
from dataclasses import dataclass, asdict
from datetime import datetime, timedelta
from enum import Enum
import threading
import pickle
import base64

from ..core.logging import LogManager
from .processor import ProcessingJob, ProcessingStatus, ProcessingPriority


class QueuePersistence:
    """
    Manages persistent storage of the processing queue
    Ensures jobs survive system restarts
    """
    
    def __init__(self, db_path: str = "data/processing_queue.db"):
        """Initialize queue persistence"""
        self.db_path = db_path
        self.logger = LogManager.setup_logging(__name__)
        self._init_database()
        self._lock = threading.Lock()
        
        self.logger.info(f"📁 QueuePersistence initialized at {db_path}")
    
    def _init_database(self):
        """Initialize the queue database"""
        os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        try:
            # Queue table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS processing_queue (
                    job_id TEXT PRIMARY KEY,
                    priority INTEGER NOT NULL,
                    status TEXT NOT NULL,
                    file_path TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    started_at TEXT,
                    completed_at TEXT,
                    retry_count INTEGER DEFAULT 0,
                    error_message TEXT,
                    metadata TEXT,
                    result TEXT,
                    INDEX idx_priority (priority),
                    INDEX idx_status (status),
                    INDEX idx_created (created_at)
                )
            """)
            
            # Job history table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS job_history (
                    job_id TEXT PRIMARY KEY,
                    file_path TEXT NOT NULL,
                    status TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    completed_at TEXT NOT NULL,
                    processing_time REAL,
                    result TEXT,
                    error_message TEXT,
                    metadata TEXT
                )
            """)
            
            # Processing statistics
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS processing_stats (
                    stat_date DATE PRIMARY KEY,
                    total_jobs INTEGER DEFAULT 0,
                    successful_jobs INTEGER DEFAULT 0,
                    failed_jobs INTEGER DEFAULT 0,
                    total_processing_time REAL DEFAULT 0,
                    average_processing_time REAL DEFAULT 0
                )
            """)
            
            conn.commit()
            
        except Exception as e:
            self.logger.error(f"Database initialization error: {str(e)}")
            # SQLite doesn't support INDEX in CREATE TABLE, create separately
            try:
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_priority ON processing_queue(priority)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_status ON processing_queue(status)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_created ON processing_queue(created_at)")
                conn.commit()
            except:
                pass
        finally:
            conn.close()
    
    def save_job(self, job: ProcessingJob):
        """Save a job to persistent storage"""
        with self._lock:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            try:
                cursor.execute("""
                    INSERT OR REPLACE INTO processing_queue 
                    (job_id, priority, status, file_path, created_at, started_at, 
                     completed_at, retry_count, error_message, metadata, result)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    job.job_id,
                    job.priority.value,
                    job.status.value,
                    job.file_path,
                    job.created_at.isoformat(),
                    job.started_at.isoformat() if job.started_at else None,
                    job.completed_at.isoformat() if job.completed_at else None,
                    job.retry_count,
                    job.error_message,
                    json.dumps(job.metadata),
                    json.dumps(job.result) if job.result else None
                ))
                
                conn.commit()
                
            finally:
                conn.close()
    
    def load_pending_jobs(self) -> List[ProcessingJob]:
        """Load all pending jobs from storage"""
        with self._lock:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            try:
                cursor.execute("""
                    SELECT job_id, priority, status, file_path, created_at, 
                           started_at, completed_at, retry_count, error_message, 
                           metadata, result
                    FROM processing_queue
                    WHERE status IN (?, ?, ?)
                    ORDER BY priority ASC, created_at ASC
                """, (
                    ProcessingStatus.QUEUED.value,
                    ProcessingStatus.PROCESSING.value,
                    ProcessingStatus.RETRYING.value
                ))
                
                jobs = []
                for row in cursor.fetchall():
                    job = ProcessingJob(
                        job_id=row[0],
                        file_path=row[3],
                        priority=ProcessingPriority(row[1]),
                        status=ProcessingStatus(row[2]),
                        created_at=datetime.fromisoformat(row[4]),
                        started_at=datetime.fromisoformat(row[5]) if row[5] else None,
                        completed_at=datetime.fromisoformat(row[6]) if row[6] else None,
                        retry_count=row[7],
                        error_message=row[8],
                        metadata=json.loads(row[9]) if row[9] else {},
                        result=json.loads(row[10]) if row[10] else None
                    )
                    
                    # Reset processing jobs to queued (they were interrupted)
                    if job.status == ProcessingStatus.PROCESSING:
                        job.status = ProcessingStatus.QUEUED
                        job.started_at = None
                    
                    jobs.append(job)
                
                return jobs
                
            finally:
                conn.close()
    
    def remove_job(self, job_id: str):
        """Remove a job from the queue"""
        with self._lock:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            try:
                cursor.execute("DELETE FROM processing_queue WHERE job_id = ?", (job_id,))
                conn.commit()
            finally:
                conn.close()
    
    def archive_job(self, job: ProcessingJob):
        """Archive a completed job to history"""
        with self._lock:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            try:
                # Calculate processing time
                processing_time = None
                if job.started_at and job.completed_at:
                    processing_time = (job.completed_at - job.started_at).total_seconds()
                
                # Insert into history
                cursor.execute("""
                    INSERT OR REPLACE INTO job_history 
                    (job_id, file_path, status, created_at, completed_at, 
                     processing_time, result, error_message, metadata)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    job.job_id,
                    job.file_path,
                    job.status.value,
                    job.created_at.isoformat(),
                    job.completed_at.isoformat() if job.completed_at else datetime.now().isoformat(),
                    processing_time,
                    json.dumps(job.result) if job.result else None,
                    job.error_message,
                    json.dumps(job.metadata)
                ))
                
                # Update statistics
                stat_date = datetime.now().date()
                cursor.execute("""
                    INSERT OR IGNORE INTO processing_stats 
                    (stat_date) VALUES (?)
                """, (stat_date,))
                
                if job.status == ProcessingStatus.COMPLETED:
                    cursor.execute("""
                        UPDATE processing_stats 
                        SET total_jobs = total_jobs + 1,
                            successful_jobs = successful_jobs + 1,
                            total_processing_time = total_processing_time + ?
                        WHERE stat_date = ?
                    """, (processing_time or 0, stat_date))
                else:
                    cursor.execute("""
                        UPDATE processing_stats 
                        SET total_jobs = total_jobs + 1,
                            failed_jobs = failed_jobs + 1
                        WHERE stat_date = ?
                    """, (stat_date,))
                
                # Update average
                cursor.execute("""
                    UPDATE processing_stats 
                    SET average_processing_time = 
                        CASE WHEN successful_jobs > 0 
                        THEN total_processing_time / successful_jobs 
                        ELSE 0 END
                    WHERE stat_date = ?
                """, (stat_date,))
                
                # Remove from queue
                cursor.execute("DELETE FROM processing_queue WHERE job_id = ?", (job.job_id,))
                
                conn.commit()
                
            finally:
                conn.close()
    
    def get_statistics(self, days: int = 7) -> Dict[str, Any]:
        """Get processing statistics for the last N days"""
        with self._lock:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            try:
                cutoff_date = (datetime.now() - timedelta(days=days)).date()
                
                cursor.execute("""
                    SELECT 
                        SUM(total_jobs) as total,
                        SUM(successful_jobs) as successful,
                        SUM(failed_jobs) as failed,
                        AVG(average_processing_time) as avg_time
                    FROM processing_stats
                    WHERE stat_date >= ?
                """, (cutoff_date,))
                
                row = cursor.fetchone()
                
                # Get daily breakdown
                cursor.execute("""
                    SELECT stat_date, total_jobs, successful_jobs, 
                           failed_jobs, average_processing_time
                    FROM processing_stats
                    WHERE stat_date >= ?
                    ORDER BY stat_date DESC
                """, (cutoff_date,))
                
                daily_stats = []
                for daily_row in cursor.fetchall():
                    daily_stats.append({
                        'date': daily_row[0],
                        'total': daily_row[1],
                        'successful': daily_row[2],
                        'failed': daily_row[3],
                        'avg_time': daily_row[4]
                    })
                
                return {
                    'summary': {
                        'total_jobs': row[0] or 0,
                        'successful_jobs': row[1] or 0,
                        'failed_jobs': row[2] or 0,
                        'average_processing_time': row[3] or 0,
                        'success_rate': (row[1] / row[0] * 100) if row[0] and row[0] > 0 else 0
                    },
                    'daily_breakdown': daily_stats
                }
                
            finally:
                conn.close()
    
    def cleanup_old_history(self, days: int = 30):
        """Clean up old job history"""
        with self._lock:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            try:
                cutoff_date = (datetime.now() - timedelta(days=days)).isoformat()
                
                cursor.execute("""
                    DELETE FROM job_history 
                    WHERE completed_at < ?
                """, (cutoff_date,))
                
                deleted = cursor.rowcount
                conn.commit()
                
                self.logger.info(f"🧹 Cleaned up {deleted} old job records")
                
                return deleted
                
            finally:
                conn.close()


class PriorityQueueManager:
    """
    Advanced priority queue management with dynamic priority adjustment
    """
    
    def __init__(self, persistence: QueuePersistence):
        """Initialize priority queue manager"""
        self.persistence = persistence
        self.logger = LogManager.setup_logging(__name__ + ".priority")
        
        # Priority adjustment rules
        self.priority_rules = {
            'age_boost': True,  # Boost priority of old jobs
            'failure_penalty': True,  # Lower priority of frequently failing jobs
            'size_adjustment': True,  # Adjust based on file size
            'type_preference': {  # Preferred document types
                'pdf': -1,  # Higher priority
                'docx': -1,
                'md': 0,
                'txt': 1,  # Lower priority
                'html': 1
            }
        }
    
    def calculate_effective_priority(self, job: ProcessingJob) -> float:
        """
        Calculate effective priority considering various factors
        
        Returns:
            Effective priority value (lower is higher priority)
        """
        base_priority = job.priority.value
        
        # Age boost - older jobs get higher priority
        if self.priority_rules['age_boost']:
            age_minutes = (datetime.now() - job.created_at).total_seconds() / 60
            age_boost = min(age_minutes / 60, 2.0)  # Max 2 levels boost after 2 hours
            base_priority -= age_boost
        
        # Failure penalty
        if self.priority_rules['failure_penalty'] and job.retry_count > 0:
            base_priority += job.retry_count * 0.5
        
        # File type preference
        file_ext = os.path.splitext(job.file_path)[1].lower().strip('.')
        type_adjustment = self.priority_rules['type_preference'].get(file_ext, 0)
        base_priority += type_adjustment
        
        # Size adjustment (if available in metadata)
        if self.priority_rules['size_adjustment'] and 'file_size' in job.metadata:
            size_mb = job.metadata['file_size'] / (1024 * 1024)
            if size_mb > 10:  # Large files
                base_priority += 0.5
            elif size_mb < 0.1:  # Very small files
                base_priority -= 0.5
        
        return max(0, base_priority)  # Ensure non-negative
    
    def rebalance_queue(self, jobs: List[ProcessingJob]) -> List[ProcessingJob]:
        """
        Rebalance job priorities based on current conditions
        
        Args:
            jobs: List of jobs to rebalance
            
        Returns:
            Rebalanced list of jobs
        """
        # Calculate effective priorities
        job_priorities = []
        for job in jobs:
            effective_priority = self.calculate_effective_priority(job)
            job_priorities.append((effective_priority, job))
        
        # Sort by effective priority
        job_priorities.sort(key=lambda x: x[0])
        
        # Return rebalanced jobs
        return [job for _, job in job_priorities]
    
    def promote_job(self, job_id: str, levels: int = 1):
        """Promote a job to higher priority"""
        # This would be implemented to modify job priority in the queue
        pass
    
    def demote_job(self, job_id: str, levels: int = 1):
        """Demote a job to lower priority"""
        # This would be implemented to modify job priority in the queue
        pass


class QueueMonitor:
    """
    Monitor queue health and performance
    """
    
    def __init__(self, persistence: QueuePersistence):
        """Initialize queue monitor"""
        self.persistence = persistence
        self.logger = LogManager.setup_logging(__name__ + ".monitor")
        self.alerts = []
    
    def check_queue_health(self) -> Dict[str, Any]:
        """Check overall queue health"""
        conn = sqlite3.connect(self.persistence.db_path)
        cursor = conn.cursor()
        
        try:
            # Get queue statistics
            cursor.execute("""
                SELECT 
                    COUNT(*) as total,
                    SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as queued,
                    SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as processing,
                    SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as failed,
                    MIN(created_at) as oldest_job
                FROM processing_queue
                WHERE status IN (?, ?, ?, ?)
            """, (
                ProcessingStatus.QUEUED.value,
                ProcessingStatus.PROCESSING.value,
                ProcessingStatus.FAILED.value,
                ProcessingStatus.QUEUED.value,
                ProcessingStatus.PROCESSING.value,
                ProcessingStatus.FAILED.value,
                ProcessingStatus.RETRYING.value
            ))
            
            row = cursor.fetchone()
            
            health_status = {
                'status': 'healthy',
                'total_jobs': row[0] or 0,
                'queued_jobs': row[1] or 0,
                'processing_jobs': row[2] or 0,
                'failed_jobs': row[3] or 0,
                'oldest_job_age': None,
                'alerts': []
            }
            
            # Calculate oldest job age
            if row[4]:
                oldest_time = datetime.fromisoformat(row[4])
                age_hours = (datetime.now() - oldest_time).total_seconds() / 3600
                health_status['oldest_job_age'] = age_hours
                
                # Alert if jobs are too old
                if age_hours > 24:
                    health_status['alerts'].append({
                        'level': 'warning',
                        'message': f'Oldest job is {age_hours:.1f} hours old'
                    })
                    health_status['status'] = 'warning'
            
            # Check for stuck jobs
            cursor.execute("""
                SELECT COUNT(*) FROM processing_queue
                WHERE status = ? AND 
                      datetime(started_at) < datetime('now', '-1 hour')
            """, (ProcessingStatus.PROCESSING.value,))
            
            stuck_count = cursor.fetchone()[0]
            if stuck_count > 0:
                health_status['alerts'].append({
                    'level': 'error',
                    'message': f'{stuck_count} jobs appear to be stuck'
                })
                health_status['status'] = 'critical'
            
            # Check failure rate
            stats = self.persistence.get_statistics(1)
            if stats['summary']['total_jobs'] > 10:
                failure_rate = stats['summary']['failed_jobs'] / stats['summary']['total_jobs']
                if failure_rate > 0.2:  # More than 20% failure
                    health_status['alerts'].append({
                        'level': 'warning',
                        'message': f'High failure rate: {failure_rate:.1%}'
                    })
                    health_status['status'] = 'warning' if health_status['status'] == 'healthy' else health_status['status']
            
            return health_status
            
        finally:
            conn.close()
    
    def get_performance_metrics(self) -> Dict[str, Any]:
        """Get queue performance metrics"""
        stats = self.persistence.get_statistics(7)
        
        # Calculate additional metrics
        metrics = {
            'weekly_summary': stats['summary'],
            'daily_throughput': [],
            'peak_processing_time': 0,
            'average_queue_time': 0
        }
        
        # Daily throughput
        for day in stats['daily_breakdown']:
            if day['avg_time'] > 0:
                throughput = 3600 / day['avg_time']  # Jobs per hour
                metrics['daily_throughput'].append({
                    'date': day['date'],
                    'jobs_per_hour': throughput
                })
                
                if day['avg_time'] > metrics['peak_processing_time']:
                    metrics['peak_processing_time'] = day['avg_time']
        
        return metrics


if __name__ == "__main__":
    # Example usage
    import tempfile
    
    # Create persistence
    db_path = tempfile.mktemp(suffix='.db')
    persistence = QueuePersistence(db_path)
    
    # Create test job
    test_job = ProcessingJob(
        job_id="test-123",
        file_path="/tmp/test.pdf",
        priority=ProcessingPriority.NORMAL,
        status=ProcessingStatus.QUEUED,
        created_at=datetime.now(),
        metadata={'file_size': 1024 * 1024}  # 1MB
    )
    
    # Save job
    persistence.save_job(test_job)
    print("✅ Job saved")
    
    # Load pending jobs
    jobs = persistence.load_pending_jobs()
    print(f"📋 Loaded {len(jobs)} pending jobs")
    
    # Get statistics
    stats = persistence.get_statistics()
    print(f"📊 Statistics: {stats['summary']}")
    
    # Test priority manager
    priority_mgr = PriorityQueueManager(persistence)
    effective_priority = priority_mgr.calculate_effective_priority(test_job)
    print(f"🎯 Effective priority: {effective_priority}")
    
    # Test queue monitor
    monitor = QueueMonitor(persistence)
    health = monitor.check_queue_health()
    print(f"🏥 Queue health: {health['status']}")
    
    # Cleanup
    os.unlink(db_path)