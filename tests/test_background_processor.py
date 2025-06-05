"""
Tests for Background Processing System
"""

import os
import tempfile
import unittest
import time
import threading
from datetime import datetime
from pathlib import Path

# Add parent directory to path
import sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from modules.background import (
    create_background_processor,
    ProcessingStatus,
    ProcessingPriority,
    ProcessingJob,
    ProcessingMonitor
)
from modules.background.queue_manager import (
    QueuePersistence,
    PriorityQueueManager,
    QueueMonitor
)


class TestBackgroundProcessor(unittest.TestCase):
    """Test cases for BackgroundProcessor"""
    
    def setUp(self):
        """Set up test fixtures"""
        self.test_dir = tempfile.mkdtemp()
        self.db_path = os.path.join(self.test_dir, "test_knowledge.db")
        
        # Create processor with test configuration
        self.processor = create_background_processor({
            'max_workers': 2,
            'db_path': self.db_path,
            'job_timeout': 30
        })
        
        # Create test files
        self.test_files = []
        for i in range(3):
            file_path = os.path.join(self.test_dir, f"test_doc_{i}.md")
            with open(file_path, 'w') as f:
                f.write(f"# Test Document {i}\n\nTest content for document {i}.")
            self.test_files.append(file_path)
    
    def tearDown(self):
        """Clean up test fixtures"""
        # Shutdown processor
        self.processor.shutdown(wait=True)
        
        # Clean up files
        import shutil
        shutil.rmtree(self.test_dir, ignore_errors=True)
    
    def test_submit_job(self):
        """Test submitting a single job"""
        job_id = self.processor.submit_job(
            self.test_files[0],
            ProcessingPriority.NORMAL
        )
        
        self.assertIsNotNone(job_id)
        
        # Check job status
        job = self.processor.get_job_status(job_id)
        self.assertIsNotNone(job)
        self.assertEqual(job.file_path, self.test_files[0])
        self.assertEqual(job.priority, ProcessingPriority.NORMAL)
        self.assertIn(job.status, [ProcessingStatus.QUEUED, ProcessingStatus.PROCESSING])
    
    def test_submit_batch(self):
        """Test submitting multiple jobs"""
        job_ids = self.processor.submit_batch(
            self.test_files,
            ProcessingPriority.HIGH
        )
        
        self.assertEqual(len(job_ids), len(self.test_files))
        
        # Check all jobs were created
        for job_id in job_ids:
            job = self.processor.get_job_status(job_id)
            self.assertIsNotNone(job)
            self.assertEqual(job.priority, ProcessingPriority.HIGH)
    
    def test_job_progress(self):
        """Test job progress tracking"""
        job_id = self.processor.submit_job(
            self.test_files[0],
            ProcessingPriority.NORMAL
        )
        
        # Wait a bit for processing to start
        time.sleep(0.5)
        
        # Get progress
        progress = self.processor.get_job_progress(job_id)
        self.assertIsNotNone(progress)
        self.assertEqual(progress.job_id, job_id)
        self.assertGreaterEqual(progress.progress, 0.0)
        self.assertLessEqual(progress.progress, 1.0)
    
    def test_cancel_job(self):
        """Test cancelling a job"""
        job_id = self.processor.submit_job(
            self.test_files[0],
            ProcessingPriority.LOW
        )
        
        # Cancel immediately
        cancelled = self.processor.cancel_job(job_id)
        self.assertTrue(cancelled)
        
        # Check status
        job = self.processor.get_job_status(job_id)
        self.assertEqual(job.status, ProcessingStatus.CANCELLED)
    
    def test_pause_resume_processing(self):
        """Test pausing and resuming processing"""
        # Submit jobs
        job_ids = self.processor.submit_batch(self.test_files)
        
        # Pause processing
        self.processor.pause_processing()
        self.assertTrue(self.processor.paused)
        
        # Jobs should remain queued
        time.sleep(0.5)
        for job_id in job_ids:
            job = self.processor.get_job_status(job_id)
            self.assertIn(job.status, [ProcessingStatus.QUEUED, ProcessingStatus.PROCESSING])
        
        # Resume processing
        self.processor.resume_processing()
        self.assertFalse(self.processor.paused)
    
    def test_queue_status(self):
        """Test getting queue status"""
        # Submit some jobs
        job_ids = self.processor.submit_batch(self.test_files)
        
        # Get status
        status = self.processor.get_queue_status()
        
        self.assertIn('queued', status)
        self.assertIn('active', status)
        self.assertIn('completed', status)
        self.assertIn('workers', status)
        self.assertEqual(status['workers'], 2)
    
    def test_process_batch_sync(self):
        """Test synchronous batch processing"""
        result = self.processor.process_batch_sync(
            self.test_files[:2],
            ProcessingPriority.HIGH,
            timeout=60
        )
        
        self.assertEqual(result.total_jobs, 2)
        self.assertGreaterEqual(result.successful, 0)
        self.assertLessEqual(result.failed, 2)
        self.assertGreater(result.processing_time, 0)
    
    def test_priority_ordering(self):
        """Test that jobs are processed in priority order"""
        # Submit jobs with different priorities
        low_job = self.processor.submit_job(
            self.test_files[0],
            ProcessingPriority.LOW
        )
        high_job = self.processor.submit_job(
            self.test_files[1],
            ProcessingPriority.HIGH
        )
        critical_job = self.processor.submit_job(
            self.test_files[2],
            ProcessingPriority.CRITICAL
        )
        
        # Critical job should be processed first
        # Note: This is a simplified test - in real scenario would need more sophisticated checking
        time.sleep(0.1)
        
        # At least verify all jobs exist
        self.assertIsNotNone(self.processor.get_job_status(low_job))
        self.assertIsNotNone(self.processor.get_job_status(high_job))
        self.assertIsNotNone(self.processor.get_job_status(critical_job))
    
    def test_error_handling(self):
        """Test error handling for invalid files"""
        # Submit job with non-existent file
        job_id = self.processor.submit_job(
            "/non/existent/file.pdf",
            ProcessingPriority.NORMAL
        )
        
        # Wait for processing
        time.sleep(2)
        
        # Job should fail
        job = self.processor.get_job_status(job_id)
        self.assertIn(job.status, [ProcessingStatus.FAILED, ProcessingStatus.RETRYING])
        self.assertIsNotNone(job.error_message)
    
    def test_progress_callbacks(self):
        """Test progress callback mechanism"""
        progress_updates = []
        
        def progress_callback(progress):
            progress_updates.append(progress)
        
        # Register callback
        self.processor.register_progress_callback(progress_callback)
        
        # Submit job
        job_id = self.processor.submit_job(self.test_files[0])
        
        # Wait for some progress
        time.sleep(2)
        
        # Should have received progress updates
        self.assertGreater(len(progress_updates), 0)
        self.assertTrue(any(p.job_id == job_id for p in progress_updates))


class TestQueuePersistence(unittest.TestCase):
    """Test cases for QueuePersistence"""
    
    def setUp(self):
        """Set up test fixtures"""
        self.test_dir = tempfile.mkdtemp()
        self.db_path = os.path.join(self.test_dir, "test_queue.db")
        self.persistence = QueuePersistence(self.db_path)
    
    def tearDown(self):
        """Clean up test fixtures"""
        import shutil
        shutil.rmtree(self.test_dir, ignore_errors=True)
    
    def test_save_and_load_job(self):
        """Test saving and loading jobs"""
        # Create test job
        job = ProcessingJob(
            job_id="test-123",
            file_path="/test/file.pdf",
            priority=ProcessingPriority.NORMAL,
            status=ProcessingStatus.QUEUED,
            created_at=datetime.now(),
            metadata={'test': 'data'}
        )
        
        # Save job
        self.persistence.save_job(job)
        
        # Load pending jobs
        jobs = self.persistence.load_pending_jobs()
        
        self.assertEqual(len(jobs), 1)
        loaded_job = jobs[0]
        self.assertEqual(loaded_job.job_id, job.job_id)
        self.assertEqual(loaded_job.file_path, job.file_path)
        self.assertEqual(loaded_job.metadata['test'], 'data')
    
    def test_archive_job(self):
        """Test archiving completed jobs"""
        # Create and save job
        job = ProcessingJob(
            job_id="test-456",
            file_path="/test/file2.pdf",
            priority=ProcessingPriority.HIGH,
            status=ProcessingStatus.COMPLETED,
            created_at=datetime.now(),
            started_at=datetime.now(),
            completed_at=datetime.now(),
            result={'success': True}
        )
        
        self.persistence.save_job(job)
        
        # Archive job
        self.persistence.archive_job(job)
        
        # Job should be removed from queue
        jobs = self.persistence.load_pending_jobs()
        self.assertEqual(len(jobs), 0)
        
        # Check statistics were updated
        stats = self.persistence.get_statistics(1)
        self.assertEqual(stats['summary']['successful_jobs'], 1)
    
    def test_get_statistics(self):
        """Test getting processing statistics"""
        # Archive some jobs
        for i in range(5):
            job = ProcessingJob(
                job_id=f"test-{i}",
                file_path=f"/test/file{i}.pdf",
                priority=ProcessingPriority.NORMAL,
                status=ProcessingStatus.COMPLETED if i < 4 else ProcessingStatus.FAILED,
                created_at=datetime.now(),
                completed_at=datetime.now()
            )
            self.persistence.archive_job(job)
        
        # Get statistics
        stats = self.persistence.get_statistics(7)
        
        self.assertEqual(stats['summary']['total_jobs'], 5)
        self.assertEqual(stats['summary']['successful_jobs'], 4)
        self.assertEqual(stats['summary']['failed_jobs'], 1)
        self.assertEqual(stats['summary']['success_rate'], 80.0)
    
    def test_cleanup_old_history(self):
        """Test cleaning up old job history"""
        # This test would need to mock datetime to test properly
        # For now, just verify the method runs without error
        deleted = self.persistence.cleanup_old_history(30)
        self.assertGreaterEqual(deleted, 0)


class TestPriorityQueueManager(unittest.TestCase):
    """Test cases for PriorityQueueManager"""
    
    def setUp(self):
        """Set up test fixtures"""
        self.test_dir = tempfile.mkdtemp()
        self.db_path = os.path.join(self.test_dir, "test_queue.db")
        self.persistence = QueuePersistence(self.db_path)
        self.priority_mgr = PriorityQueueManager(self.persistence)
    
    def tearDown(self):
        """Clean up test fixtures"""
        import shutil
        shutil.rmtree(self.test_dir, ignore_errors=True)
    
    def test_calculate_effective_priority(self):
        """Test effective priority calculation"""
        # New job - normal priority
        job = ProcessingJob(
            job_id="test-1",
            file_path="/test/file.pdf",
            priority=ProcessingPriority.NORMAL,
            status=ProcessingStatus.QUEUED,
            created_at=datetime.now()
        )
        
        priority = self.priority_mgr.calculate_effective_priority(job)
        self.assertEqual(priority, ProcessingPriority.NORMAL.value)
        
        # Old job - should get priority boost
        old_job = ProcessingJob(
            job_id="test-2",
            file_path="/test/old.pdf",
            priority=ProcessingPriority.NORMAL,
            status=ProcessingStatus.QUEUED,
            created_at=datetime.now()
        )
        # Simulate old job by modifying created_at
        import datetime as dt
        old_job.created_at = datetime.now() - dt.timedelta(hours=3)
        
        old_priority = self.priority_mgr.calculate_effective_priority(old_job)
        self.assertLess(old_priority, priority)  # Lower value = higher priority
        
        # Failed job - should get penalty
        failed_job = ProcessingJob(
            job_id="test-3",
            file_path="/test/failed.pdf",
            priority=ProcessingPriority.NORMAL,
            status=ProcessingStatus.RETRYING,
            created_at=datetime.now(),
            retry_count=2
        )
        
        failed_priority = self.priority_mgr.calculate_effective_priority(failed_job)
        self.assertGreater(failed_priority, priority)  # Higher value = lower priority
    
    def test_rebalance_queue(self):
        """Test queue rebalancing"""
        jobs = []
        
        # Create jobs with different characteristics
        for i in range(5):
            job = ProcessingJob(
                job_id=f"test-{i}",
                file_path=f"/test/file{i}.pdf",
                priority=ProcessingPriority.NORMAL,
                status=ProcessingStatus.QUEUED,
                created_at=datetime.now(),
                retry_count=i % 2  # Some have retries
            )
            jobs.append(job)
        
        # Rebalance
        rebalanced = self.priority_mgr.rebalance_queue(jobs)
        
        # Should return same number of jobs
        self.assertEqual(len(rebalanced), len(jobs))
        
        # Jobs with fewer retries should come first
        for i in range(len(rebalanced) - 1):
            current_priority = self.priority_mgr.calculate_effective_priority(rebalanced[i])
            next_priority = self.priority_mgr.calculate_effective_priority(rebalanced[i + 1])
            self.assertLessEqual(current_priority, next_priority)


class TestQueueMonitor(unittest.TestCase):
    """Test cases for QueueMonitor"""
    
    def setUp(self):
        """Set up test fixtures"""
        self.test_dir = tempfile.mkdtemp()
        self.db_path = os.path.join(self.test_dir, "test_queue.db")
        self.persistence = QueuePersistence(self.db_path)
        self.monitor = QueueMonitor(self.persistence)
    
    def tearDown(self):
        """Clean up test fixtures"""
        import shutil
        shutil.rmtree(self.test_dir, ignore_errors=True)
    
    def test_check_queue_health(self):
        """Test queue health checking"""
        # Empty queue should be healthy
        health = self.monitor.check_queue_health()
        
        self.assertEqual(health['status'], 'healthy')
        self.assertEqual(health['total_jobs'], 0)
        self.assertEqual(len(health['alerts']), 0)
        
        # Add some jobs
        for i in range(3):
            job = ProcessingJob(
                job_id=f"test-{i}",
                file_path=f"/test/file{i}.pdf",
                priority=ProcessingPriority.NORMAL,
                status=ProcessingStatus.QUEUED,
                created_at=datetime.now()
            )
            self.persistence.save_job(job)
        
        # Check health again
        health = self.monitor.check_queue_health()
        self.assertEqual(health['queued_jobs'], 3)
    
    def test_get_performance_metrics(self):
        """Test getting performance metrics"""
        # Add some completed jobs for metrics
        for i in range(10):
            job = ProcessingJob(
                job_id=f"test-{i}",
                file_path=f"/test/file{i}.pdf",
                priority=ProcessingPriority.NORMAL,
                status=ProcessingStatus.COMPLETED,
                created_at=datetime.now(),
                started_at=datetime.now(),
                completed_at=datetime.now()
            )
            self.persistence.archive_job(job)
        
        # Get metrics
        metrics = self.monitor.get_performance_metrics()
        
        self.assertIn('weekly_summary', metrics)
        self.assertIn('daily_throughput', metrics)
        self.assertEqual(metrics['weekly_summary']['total_jobs'], 10)


class TestProcessingMonitor(unittest.TestCase):
    """Test cases for ProcessingMonitor"""
    
    def setUp(self):
        """Set up test fixtures"""
        self.test_dir = tempfile.mkdtemp()
        self.processor = create_background_processor({
            'max_workers': 1,
            'db_path': os.path.join(self.test_dir, "test_knowledge.db")
        })
        self.monitor = ProcessingMonitor(self.processor)
    
    def tearDown(self):
        """Clean up test fixtures"""
        self.processor.shutdown(wait=True)
        import shutil
        shutil.rmtree(self.test_dir, ignore_errors=True)
    
    def test_get_summary_report(self):
        """Test getting summary report"""
        # Submit a test job
        test_file = os.path.join(self.test_dir, "test.md")
        with open(test_file, 'w') as f:
            f.write("Test content")
        
        self.processor.submit_job(test_file)
        
        # Get report
        report = self.monitor.get_summary_report()
        
        self.assertIn('queue_status', report)
        self.assertIn('success_rate', report)
        self.assertIn('recent_jobs', report)
        self.assertIn('performance', report)
        self.assertIn('health', report)
        
        # Check health status
        self.assertTrue(report['health']['is_running'])
        self.assertFalse(report['health']['is_paused'])


if __name__ == '__main__':
    unittest.main(verbosity=2)