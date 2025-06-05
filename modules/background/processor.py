"""
Background Processing System for Asynchronous Document Processing
Manages document processing queue, progress tracking, and error recovery
"""

import os
import json
import asyncio
import threading
from typing import Dict, List, Optional, Any, Callable
from dataclasses import dataclass, field, asdict
from datetime import datetime, timedelta
from enum import Enum
from queue import Queue, PriorityQueue, Empty
import time
import uuid
from concurrent.futures import ThreadPoolExecutor, ProcessPoolExecutor
import multiprocessing
import signal
import sys

from ..core.logging import LogManager
from ..doc_converter.document_classifier import DocumentClassifier, ClassificationResult
from doc_converter.processing.enhanced_processor import EnhancedProcessor, ProcessedDocument
from ..rag.knowledge_manager import create_knowledge_manager, IntegrationResult
from ..rag.quality_assurance import create_quality_assurance, QualityReport


class ProcessingStatus(Enum):
    """Status of document processing"""
    QUEUED = "queued"
    PROCESSING = "processing"
    CLASSIFYING = "classifying"
    EXTRACTING = "extracting"
    INTEGRATING = "integrating"
    QUALITY_CHECK = "quality_check"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"
    RETRYING = "retrying"


class ProcessingPriority(Enum):
    """Processing priority levels"""
    CRITICAL = 0  # Highest priority
    HIGH = 1
    NORMAL = 2
    LOW = 3
    BACKGROUND = 4  # Lowest priority


@dataclass
class ProcessingJob:
    """Represents a document processing job"""
    job_id: str
    file_path: str
    priority: ProcessingPriority
    status: ProcessingStatus
    created_at: datetime
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    progress: float = 0.0  # 0.0 to 1.0
    current_step: str = ""
    retry_count: int = 0
    max_retries: int = 3
    error_message: Optional[str] = None
    result: Optional[Dict[str, Any]] = None
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    def __lt__(self, other):
        """For priority queue comparison"""
        return self.priority.value < other.priority.value


@dataclass
class ProcessingProgress:
    """Progress information for a processing job"""
    job_id: str
    status: ProcessingStatus
    progress: float
    current_step: str
    steps_completed: List[str]
    estimated_time_remaining: Optional[float] = None
    message: Optional[str] = None


@dataclass
class BatchProcessingResult:
    """Result of batch processing operation"""
    total_jobs: int
    successful: int
    failed: int
    cancelled: int
    processing_time: float
    jobs: List[ProcessingJob]
    errors: List[Dict[str, Any]]


class BackgroundProcessor:
    """
    Manages background document processing with queue management and progress tracking
    """
    
    def __init__(self, config: Optional[Dict[str, Any]] = None):
        """Initialize the background processor"""
        self.config = config or {}
        self.logger = LogManager.setup_logging(__name__)
        
        # Configuration
        self.max_workers = self.config.get('max_workers', min(4, multiprocessing.cpu_count()))
        self.max_queue_size = self.config.get('max_queue_size', 1000)
        self.batch_size = self.config.get('batch_size', 10)
        self.progress_update_interval = self.config.get('progress_update_interval', 1.0)
        self.job_timeout = self.config.get('job_timeout', 300)  # 5 minutes
        self.db_path = self.config.get('db_path', 'data/knowledge_base.db')
        
        # Queues
        self.job_queue: PriorityQueue = PriorityQueue(maxsize=self.max_queue_size)
        self.result_queue: Queue = Queue()
        self.progress_queue: Queue = Queue()
        
        # Job tracking
        self.active_jobs: Dict[str, ProcessingJob] = {}
        self.completed_jobs: Dict[str, ProcessingJob] = {}
        self.job_history: List[ProcessingJob] = []
        
        # Processing components
        self.classifier = DocumentClassifier()
        self.processor = EnhancedProcessor()
        self.knowledge_mgr = create_knowledge_manager(self.db_path)
        self.qa_system = create_quality_assurance(self.knowledge_mgr)
        
        # Thread pool for concurrent processing
        self.executor = ThreadPoolExecutor(max_workers=self.max_workers)
        self.process_pool = ProcessPoolExecutor(max_workers=max(1, self.max_workers // 2))
        
        # Control flags
        self.running = False
        self.paused = False
        self._shutdown_event = threading.Event()
        
        # Progress callbacks
        self.progress_callbacks: List[Callable[[ProcessingProgress], None]] = []
        
        # Statistics
        self.stats = {
            'total_processed': 0,
            'total_failed': 0,
            'total_time': 0.0,
            'average_time': 0.0
        }
        
        # Start background threads
        self._start_background_threads()
        
        self.logger.info(f"🚀 BackgroundProcessor initialized with {self.max_workers} workers")
    
    def submit_job(self, file_path: str, priority: ProcessingPriority = ProcessingPriority.NORMAL,
                   metadata: Optional[Dict[str, Any]] = None) -> str:
        """
        Submit a document for background processing
        
        Args:
            file_path: Path to the document
            priority: Processing priority
            metadata: Optional metadata for the job
            
        Returns:
            Job ID
        """
        job_id = str(uuid.uuid4())
        
        job = ProcessingJob(
            job_id=job_id,
            file_path=file_path,
            priority=priority,
            status=ProcessingStatus.QUEUED,
            created_at=datetime.now(),
            metadata=metadata or {}
        )
        
        try:
            self.job_queue.put((priority.value, job), block=False)
            self.active_jobs[job_id] = job
            
            self.logger.info(f"📋 Job submitted: {job_id} for {file_path}")
            
            # Notify progress
            self._update_progress(job, "Job queued for processing")
            
            return job_id
            
        except Exception as e:
            self.logger.error(f"❌ Failed to submit job: {str(e)}")
            raise
    
    def submit_batch(self, file_paths: List[str], 
                    priority: ProcessingPriority = ProcessingPriority.NORMAL) -> List[str]:
        """
        Submit multiple documents for processing
        
        Args:
            file_paths: List of document paths
            priority: Processing priority for all documents
            
        Returns:
            List of job IDs
        """
        job_ids = []
        
        for file_path in file_paths:
            try:
                job_id = self.submit_job(file_path, priority)
                job_ids.append(job_id)
            except Exception as e:
                self.logger.error(f"❌ Failed to submit {file_path}: {str(e)}")
        
        self.logger.info(f"📦 Batch submitted: {len(job_ids)} jobs")
        
        return job_ids
    
    def get_job_status(self, job_id: str) -> Optional[ProcessingJob]:
        """Get the status of a processing job"""
        if job_id in self.active_jobs:
            return self.active_jobs[job_id]
        elif job_id in self.completed_jobs:
            return self.completed_jobs[job_id]
        return None
    
    def get_job_progress(self, job_id: str) -> Optional[ProcessingProgress]:
        """Get detailed progress for a job"""
        job = self.get_job_status(job_id)
        if not job:
            return None
        
        steps_completed = []
        if job.status.value >= ProcessingStatus.CLASSIFYING.value:
            steps_completed.append("classification")
        if job.status.value >= ProcessingStatus.EXTRACTING.value:
            steps_completed.append("extraction")
        if job.status.value >= ProcessingStatus.INTEGRATING.value:
            steps_completed.append("integration")
        if job.status.value >= ProcessingStatus.QUALITY_CHECK.value:
            steps_completed.append("quality_check")
        
        # Estimate remaining time
        if job.started_at and job.progress > 0:
            elapsed = (datetime.now() - job.started_at).total_seconds()
            estimated_total = elapsed / job.progress
            estimated_remaining = estimated_total - elapsed
        else:
            estimated_remaining = None
        
        return ProcessingProgress(
            job_id=job_id,
            status=job.status,
            progress=job.progress,
            current_step=job.current_step,
            steps_completed=steps_completed,
            estimated_time_remaining=estimated_remaining,
            message=job.error_message if job.status == ProcessingStatus.FAILED else None
        )
    
    def cancel_job(self, job_id: str) -> bool:
        """Cancel a processing job"""
        if job_id in self.active_jobs:
            job = self.active_jobs[job_id]
            if job.status in [ProcessingStatus.QUEUED, ProcessingStatus.PROCESSING]:
                job.status = ProcessingStatus.CANCELLED
                job.completed_at = datetime.now()
                
                # Move to completed
                self.completed_jobs[job_id] = job
                del self.active_jobs[job_id]
                
                self.logger.info(f"🚫 Job cancelled: {job_id}")
                self._update_progress(job, "Job cancelled by user")
                
                return True
        
        return False
    
    def pause_processing(self):
        """Pause all processing"""
        self.paused = True
        self.logger.info("⏸️ Processing paused")
    
    def resume_processing(self):
        """Resume processing"""
        self.paused = False
        self.logger.info("▶️ Processing resumed")
    
    def get_queue_status(self) -> Dict[str, Any]:
        """Get current queue status"""
        return {
            'queued': self.job_queue.qsize(),
            'active': len([j for j in self.active_jobs.values() 
                          if j.status == ProcessingStatus.PROCESSING]),
            'completed': len(self.completed_jobs),
            'paused': self.paused,
            'workers': self.max_workers,
            'stats': self.stats
        }
    
    def register_progress_callback(self, callback: Callable[[ProcessingProgress], None]):
        """Register a callback for progress updates"""
        self.progress_callbacks.append(callback)
    
    def _start_background_threads(self):
        """Start background processing threads"""
        self.running = True
        
        # Start worker threads
        for i in range(self.max_workers):
            thread = threading.Thread(target=self._worker_thread, args=(i,))
            thread.daemon = True
            thread.start()
        
        # Start progress monitor thread
        monitor_thread = threading.Thread(target=self._progress_monitor_thread)
        monitor_thread.daemon = True
        monitor_thread.start()
        
        # Start cleanup thread
        cleanup_thread = threading.Thread(target=self._cleanup_thread)
        cleanup_thread.daemon = True
        cleanup_thread.start()
    
    def _worker_thread(self, worker_id: int):
        """Worker thread for processing jobs"""
        self.logger.info(f"🔧 Worker {worker_id} started")
        
        while self.running:
            if self.paused:
                time.sleep(1)
                continue
            
            try:
                # Get job from queue (timeout to check running flag)
                priority, job = self.job_queue.get(timeout=1)
                
                # Check if job was cancelled
                if job.status == ProcessingStatus.CANCELLED:
                    continue
                
                # Process the job
                self.logger.info(f"👷 Worker {worker_id} processing job {job.job_id}")
                self._process_job(job)
                
            except Empty:
                continue
            except Exception as e:
                self.logger.error(f"❌ Worker {worker_id} error: {str(e)}")
    
    def _process_job(self, job: ProcessingJob):
        """Process a single job"""
        try:
            job.status = ProcessingStatus.PROCESSING
            job.started_at = datetime.now()
            
            # Phase 1: Classification
            job.status = ProcessingStatus.CLASSIFYING
            job.current_step = "Classifying document"
            job.progress = 0.1
            self._update_progress(job, "Starting classification")
            
            classification = self.classifier.classify_document(job.file_path)
            
            # Phase 2: Enhanced Processing
            job.status = ProcessingStatus.EXTRACTING
            job.current_step = "Extracting content"
            job.progress = 0.3
            self._update_progress(job, "Extracting structured content")
            
            processed_doc = self.processor.process_document(job.file_path, classification)
            
            # Phase 3: Knowledge Integration
            job.status = ProcessingStatus.INTEGRATING
            job.current_step = "Integrating into knowledge base"
            job.progress = 0.6
            self._update_progress(job, "Integrating into knowledge base")
            
            integration_result = self.knowledge_mgr.integrate_document(processed_doc)
            
            # Phase 4: Quality Assurance
            job.status = ProcessingStatus.QUALITY_CHECK
            job.current_step = "Running quality checks"
            job.progress = 0.8
            self._update_progress(job, "Performing quality assurance")
            
            quality_report = self.qa_system.generate_quality_report(processed_doc)
            
            # Complete job
            job.status = ProcessingStatus.COMPLETED
            job.progress = 1.0
            job.completed_at = datetime.now()
            job.current_step = "Processing complete"
            
            # Store results
            job.result = {
                'document_id': processed_doc.document_id,
                'classification': {
                    'type': classification.metadata.document_type.value,
                    'category': classification.metadata.content_category.value,
                    'strategy': classification.processing_strategy.value
                },
                'extraction': {
                    'tables': len(processed_doc.tables),
                    'code_snippets': len(processed_doc.code_snippets),
                    'references': len(processed_doc.references)
                },
                'integration': {
                    'status': integration_result.status,
                    'duplicates': len(integration_result.duplicates_found),
                    'cross_references': len(integration_result.cross_references_created)
                },
                'quality': {
                    'overall_score': quality_report.quality_score.overall_score,
                    'issues': len(quality_report.issues_found),
                    'recommendations': len(quality_report.recommendations)
                },
                'processing_time': (job.completed_at - job.started_at).total_seconds()
            }
            
            # Update statistics
            self._update_statistics(job)
            
            # Move to completed
            self.completed_jobs[job.job_id] = job
            if job.job_id in self.active_jobs:
                del self.active_jobs[job.job_id]
            
            self._update_progress(job, "Processing completed successfully")
            self.logger.info(f"✅ Job completed: {job.job_id}")
            
        except Exception as e:
            self._handle_job_error(job, e)
    
    def _handle_job_error(self, job: ProcessingJob, error: Exception):
        """Handle job processing error"""
        job.error_message = str(error)
        
        if job.retry_count < job.max_retries:
            # Retry the job
            job.retry_count += 1
            job.status = ProcessingStatus.RETRYING
            job.progress = 0.0
            
            self.logger.warning(f"🔄 Retrying job {job.job_id} (attempt {job.retry_count})")
            self._update_progress(job, f"Retrying (attempt {job.retry_count})")
            
            # Re-queue with higher priority
            priority = ProcessingPriority(max(0, job.priority.value - 1))
            self.job_queue.put((priority.value, job))
            
        else:
            # Mark as failed
            job.status = ProcessingStatus.FAILED
            job.completed_at = datetime.now()
            
            # Move to completed
            self.completed_jobs[job.job_id] = job
            if job.job_id in self.active_jobs:
                del self.active_jobs[job.job_id]
            
            self.logger.error(f"❌ Job failed: {job.job_id} - {job.error_message}")
            self._update_progress(job, f"Job failed: {job.error_message}")
            
            # Update failure statistics
            self.stats['total_failed'] += 1
    
    def _update_progress(self, job: ProcessingJob, message: Optional[str] = None):
        """Update job progress and notify callbacks"""
        progress = ProcessingProgress(
            job_id=job.job_id,
            status=job.status,
            progress=job.progress,
            current_step=job.current_step,
            steps_completed=[],
            message=message
        )
        
        # Put in progress queue
        self.progress_queue.put(progress)
        
        # Notify callbacks
        for callback in self.progress_callbacks:
            try:
                callback(progress)
            except Exception as e:
                self.logger.error(f"Progress callback error: {str(e)}")
    
    def _update_statistics(self, job: ProcessingJob):
        """Update processing statistics"""
        if job.status == ProcessingStatus.COMPLETED and job.started_at:
            processing_time = (job.completed_at - job.started_at).total_seconds()
            
            self.stats['total_processed'] += 1
            self.stats['total_time'] += processing_time
            self.stats['average_time'] = self.stats['total_time'] / self.stats['total_processed']
    
    def _progress_monitor_thread(self):
        """Monitor and report progress"""
        while self.running:
            try:
                # Process progress queue
                while not self.progress_queue.empty():
                    try:
                        progress = self.progress_queue.get_nowait()
                        # Could send to websocket, logging, etc.
                        self.logger.debug(f"Progress: {progress.job_id} - {progress.current_step}")
                    except Empty:
                        break
                
                time.sleep(self.progress_update_interval)
                
            except Exception as e:
                self.logger.error(f"Progress monitor error: {str(e)}")
    
    def _cleanup_thread(self):
        """Clean up old completed jobs"""
        while self.running:
            try:
                # Remove completed jobs older than 1 hour
                cutoff_time = datetime.now() - timedelta(hours=1)
                
                jobs_to_remove = []
                for job_id, job in self.completed_jobs.items():
                    if job.completed_at and job.completed_at < cutoff_time:
                        jobs_to_remove.append(job_id)
                        self.job_history.append(job)
                
                for job_id in jobs_to_remove:
                    del self.completed_jobs[job_id]
                
                # Keep job history limited
                if len(self.job_history) > 1000:
                    self.job_history = self.job_history[-1000:]
                
                # Check for stuck jobs
                for job_id, job in self.active_jobs.items():
                    if job.started_at:
                        elapsed = (datetime.now() - job.started_at).total_seconds()
                        if elapsed > self.job_timeout and job.status == ProcessingStatus.PROCESSING:
                            self.logger.warning(f"⏱️ Job timeout: {job_id}")
                            self._handle_job_error(job, Exception("Job timeout"))
                
                time.sleep(60)  # Run every minute
                
            except Exception as e:
                self.logger.error(f"Cleanup thread error: {str(e)}")
    
    def process_batch_sync(self, file_paths: List[str], 
                          priority: ProcessingPriority = ProcessingPriority.NORMAL,
                          timeout: Optional[float] = None) -> BatchProcessingResult:
        """
        Process a batch of documents synchronously
        
        Args:
            file_paths: List of document paths
            priority: Processing priority
            timeout: Maximum time to wait for completion
            
        Returns:
            BatchProcessingResult with all results
        """
        start_time = time.time()
        job_ids = self.submit_batch(file_paths, priority)
        
        # Wait for all jobs to complete
        completed = []
        failed = []
        cancelled = []
        errors = []
        
        deadline = time.time() + timeout if timeout else None
        
        while len(completed) + len(failed) + len(cancelled) < len(job_ids):
            if deadline and time.time() > deadline:
                # Cancel remaining jobs
                for job_id in job_ids:
                    job = self.get_job_status(job_id)
                    if job and job.status in [ProcessingStatus.QUEUED, ProcessingStatus.PROCESSING]:
                        self.cancel_job(job_id)
                        cancelled.append(job)
                break
            
            for job_id in job_ids:
                job = self.get_job_status(job_id)
                if job:
                    if job.status == ProcessingStatus.COMPLETED and job not in completed:
                        completed.append(job)
                    elif job.status == ProcessingStatus.FAILED and job not in failed:
                        failed.append(job)
                        if job.error_message:
                            errors.append({
                                'job_id': job_id,
                                'file': job.file_path,
                                'error': job.error_message
                            })
                    elif job.status == ProcessingStatus.CANCELLED and job not in cancelled:
                        cancelled.append(job)
            
            time.sleep(0.5)
        
        processing_time = time.time() - start_time
        
        return BatchProcessingResult(
            total_jobs=len(job_ids),
            successful=len(completed),
            failed=len(failed),
            cancelled=len(cancelled),
            processing_time=processing_time,
            jobs=completed + failed + cancelled,
            errors=errors
        )
    
    def shutdown(self, wait: bool = True):
        """Shutdown the background processor"""
        self.logger.info("🛑 Shutting down BackgroundProcessor")
        
        self.running = False
        self._shutdown_event.set()
        
        if wait:
            # Cancel pending jobs
            while not self.job_queue.empty():
                try:
                    _, job = self.job_queue.get_nowait()
                    job.status = ProcessingStatus.CANCELLED
                    self.completed_jobs[job.job_id] = job
                except Empty:
                    break
            
            # Wait for active jobs to complete
            timeout = 30
            start = time.time()
            while self.active_jobs and (time.time() - start) < timeout:
                time.sleep(0.5)
            
            # Force cancel remaining active jobs
            for job_id, job in list(self.active_jobs.items()):
                self.cancel_job(job_id)
        
        # Shutdown executors
        self.executor.shutdown(wait=wait)
        self.process_pool.shutdown(wait=wait)
        
        self.logger.info("✅ BackgroundProcessor shutdown complete")


def create_background_processor(config: Optional[Dict[str, Any]] = None) -> BackgroundProcessor:
    """Factory function to create a background processor"""
    return BackgroundProcessor(config)


class ProcessingMonitor:
    """Monitor and report on processing activities"""
    
    def __init__(self, processor: BackgroundProcessor):
        self.processor = processor
        self.logger = LogManager.setup_logging(__name__ + ".monitor")
    
    def get_summary_report(self) -> Dict[str, Any]:
        """Get summary report of processing activities"""
        queue_status = self.processor.get_queue_status()
        
        # Calculate additional metrics
        success_rate = 0
        if self.processor.stats['total_processed'] > 0:
            success_rate = (self.processor.stats['total_processed'] - 
                          self.processor.stats['total_failed']) / self.processor.stats['total_processed']
        
        # Get recent jobs
        recent_jobs = []
        for job in list(self.processor.completed_jobs.values())[-10:]:
            recent_jobs.append({
                'job_id': job.job_id,
                'file': os.path.basename(job.file_path),
                'status': job.status.value,
                'duration': (job.completed_at - job.started_at).total_seconds() if job.completed_at and job.started_at else None,
                'completed_at': job.completed_at.isoformat() if job.completed_at else None
            })
        
        return {
            'queue_status': queue_status,
            'success_rate': success_rate,
            'recent_jobs': recent_jobs,
            'performance': {
                'average_processing_time': self.processor.stats['average_time'],
                'throughput': self.processor.stats['total_processed'] / self.processor.stats['total_time'] if self.processor.stats['total_time'] > 0 else 0
            },
            'health': {
                'is_running': self.processor.running,
                'is_paused': self.processor.paused,
                'active_workers': queue_status['active'],
                'queue_utilization': queue_status['queued'] / self.processor.max_queue_size if self.processor.max_queue_size > 0 else 0
            }
        }
    
    def print_status(self):
        """Print current processing status"""
        report = self.get_summary_report()
        
        print("\n📊 Background Processing Status")
        print("=" * 60)
        print(f"Queue: {report['queue_status']['queued']} queued, "
              f"{report['queue_status']['active']} active")
        print(f"Completed: {report['queue_status']['completed']} "
              f"(Success rate: {report['success_rate']:.1%})")
        print(f"Average time: {report['performance']['average_processing_time']:.2f}s")
        print(f"Status: {'Paused' if report['health']['is_paused'] else 'Running'}")
        
        if report['recent_jobs']:
            print("\nRecent Jobs:")
            for job in report['recent_jobs'][:5]:
                status_icon = "✅" if job['status'] == 'completed' else "❌"
                print(f"  {status_icon} {job['file']} - {job['duration']:.1f}s" if job['duration'] else f"  {status_icon} {job['file']}")


if __name__ == "__main__":
    # Example usage
    import tempfile
    
    # Create processor
    processor = create_background_processor({
        'max_workers': 4,
        'db_path': tempfile.mktemp(suffix='.db')
    })
    
    # Create monitor
    monitor = ProcessingMonitor(processor)
    
    # Register progress callback
    def progress_callback(progress: ProcessingProgress):
        print(f"Progress: {progress.job_id} - {progress.current_step} ({progress.progress:.0%})")
    
    processor.register_progress_callback(progress_callback)
    
    # Submit some test jobs
    test_files = [
        "test1.md",
        "test2.pdf",
        "test3.txt"
    ]
    
    # Simulate file creation
    temp_dir = tempfile.mkdtemp()
    for filename in test_files:
        filepath = os.path.join(temp_dir, filename)
        with open(filepath, 'w') as f:
            f.write(f"# Test Document {filename}\n\nThis is test content.")
    
    try:
        # Submit batch
        print("\n📤 Submitting batch job...")
        job_ids = processor.submit_batch(
            [os.path.join(temp_dir, f) for f in test_files],
            ProcessingPriority.HIGH
        )
        
        print(f"Submitted {len(job_ids)} jobs")
        
        # Monitor progress
        time.sleep(2)
        monitor.print_status()
        
        # Process synchronously
        print("\n⏳ Processing batch synchronously...")
        result = processor.process_batch_sync(
            [os.path.join(temp_dir, f) for f in test_files],
            timeout=30
        )
        
        print(f"\n✅ Batch completed:")
        print(f"  - Successful: {result.successful}")
        print(f"  - Failed: {result.failed}")
        print(f"  - Time: {result.processing_time:.2f}s")
        
    finally:
        # Cleanup
        processor.shutdown()
        import shutil
        shutil.rmtree(temp_dir, ignore_errors=True)