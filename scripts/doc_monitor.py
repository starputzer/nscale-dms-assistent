#!/usr/bin/env python3
"""
Documentation Monitoring System
Real-time monitoring of documentation changes with metrics tracking and alerting
"""

import os
import sys
import json
import time
import hashlib
import logging
import sqlite3
import asyncio
import smtplib
import datetime
import threading
from pathlib import Path
from typing import Dict, List, Tuple, Optional, Set
from dataclasses import dataclass, asdict
from collections import defaultdict
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler, FileSystemEvent

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('/opt/nscale-assist/logs/doc_monitor.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)


@dataclass
class DocumentMetrics:
    """Document quality metrics"""
    file_path: str
    word_count: int
    link_count: int
    broken_links: List[str]
    last_modified: float
    file_size: int
    readability_score: float
    headers_count: int
    code_blocks_count: int
    images_count: int
    timestamp: float


@dataclass
class Alert:
    """Alert data structure"""
    severity: str  # 'critical', 'warning', 'info'
    type: str
    message: str
    file_path: Optional[str]
    timestamp: float
    details: Dict


class DocumentMonitor(FileSystemEventHandler):
    """Monitors documentation changes in real-time"""
    
    def __init__(self, config_path: str):
        self.config = self._load_config(config_path)
        self.db_path = self.config.get('database_path', '/opt/nscale-assist/data/doc_metrics.db')
        self.watched_paths = self.config.get('watched_paths', ['/opt/nscale-assist/docs'])
        self.file_patterns = self.config.get('file_patterns', ['*.md', '*.rst', '*.txt'])
        self.alerts: List[Alert] = []
        self.metrics_cache: Dict[str, DocumentMetrics] = {}
        self._init_database()
        self._init_monitoring()
        
    def _load_config(self, config_path: str) -> Dict:
        """Load configuration from file"""
        try:
            with open(config_path, 'r') as f:
                return json.load(f)
        except Exception as e:
            logger.error(f"Failed to load config: {e}")
            return self._get_default_config()
    
    def _get_default_config(self) -> Dict:
        """Return default configuration"""
        return {
            'watched_paths': ['/opt/nscale-assist/docs'],
            'file_patterns': ['*.md', '*.rst', '*.txt'],
            'thresholds': {
                'min_word_count': 50,
                'max_broken_links': 2,
                'max_days_without_update': 180,
                'min_readability_score': 40.0,
                'max_file_size_mb': 10
            },
            'alert_settings': {
                'email_enabled': False,
                'email_recipients': [],
                'smtp_server': 'localhost',
                'smtp_port': 587,
                'rate_limit_minutes': 60
            },
            'metrics_retention_days': 90
        }
    
    def _init_database(self):
        """Initialize SQLite database for metrics storage"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Create tables
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS document_metrics (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                file_path TEXT NOT NULL,
                word_count INTEGER,
                link_count INTEGER,
                broken_links TEXT,
                last_modified REAL,
                file_size INTEGER,
                readability_score REAL,
                headers_count INTEGER,
                code_blocks_count INTEGER,
                images_count INTEGER,
                timestamp REAL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS alerts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                severity TEXT NOT NULL,
                type TEXT NOT NULL,
                message TEXT NOT NULL,
                file_path TEXT,
                timestamp REAL,
                details TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        cursor.execute('''
            CREATE INDEX IF NOT EXISTS idx_metrics_file_path 
            ON document_metrics(file_path)
        ''')
        
        cursor.execute('''
            CREATE INDEX IF NOT EXISTS idx_metrics_timestamp 
            ON document_metrics(timestamp)
        ''')
        
        conn.commit()
        conn.close()
        logger.info("Database initialized")
    
    def _init_monitoring(self):
        """Initialize file system monitoring"""
        self.observer = Observer()
        for path in self.watched_paths:
            if os.path.exists(path):
                self.observer.schedule(self, path, recursive=True)
                logger.info(f"Monitoring: {path}")
            else:
                logger.warning(f"Path not found: {path}")
    
    def on_modified(self, event: FileSystemEvent):
        """Handle file modification events"""
        if not event.is_directory and self._should_monitor_file(event.src_path):
            logger.info(f"File modified: {event.src_path}")
            self._analyze_document(event.src_path)
    
    def on_created(self, event: FileSystemEvent):
        """Handle file creation events"""
        if not event.is_directory and self._should_monitor_file(event.src_path):
            logger.info(f"File created: {event.src_path}")
            self._analyze_document(event.src_path)
    
    def on_deleted(self, event: FileSystemEvent):
        """Handle file deletion events"""
        if not event.is_directory and self._should_monitor_file(event.src_path):
            logger.info(f"File deleted: {event.src_path}")
            self._create_alert(
                severity='warning',
                alert_type='file_deleted',
                message=f"Documentation file deleted: {event.src_path}",
                file_path=event.src_path
            )
    
    def _should_monitor_file(self, file_path: str) -> bool:
        """Check if file should be monitored based on patterns"""
        path = Path(file_path)
        for pattern in self.file_patterns:
            if path.match(pattern):
                return True
        return False
    
    def _analyze_document(self, file_path: str):
        """Analyze document and collect metrics"""
        try:
            metrics = self._collect_metrics(file_path)
            self._store_metrics(metrics)
            self._check_thresholds(metrics)
            self.metrics_cache[file_path] = metrics
        except Exception as e:
            logger.error(f"Failed to analyze {file_path}: {e}")
            self._create_alert(
                severity='warning',
                alert_type='analysis_failed',
                message=f"Failed to analyze document: {str(e)}",
                file_path=file_path
            )
    
    def _collect_metrics(self, file_path: str) -> DocumentMetrics:
        """Collect metrics from a document"""
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Basic metrics
        word_count = len(content.split())
        file_size = os.path.getsize(file_path)
        last_modified = os.path.getmtime(file_path)
        
        # Analyze content
        links = self._extract_links(content)
        broken_links = self._check_broken_links(links, file_path)
        headers_count = content.count('\n#')
        code_blocks_count = content.count('```')
        images_count = content.count('![')
        
        # Calculate readability (simplified Flesch score)
        readability_score = self._calculate_readability(content)
        
        return DocumentMetrics(
            file_path=file_path,
            word_count=word_count,
            link_count=len(links),
            broken_links=broken_links,
            last_modified=last_modified,
            file_size=file_size,
            readability_score=readability_score,
            headers_count=headers_count,
            code_blocks_count=code_blocks_count,
            images_count=images_count,
            timestamp=time.time()
        )
    
    def _extract_links(self, content: str) -> List[str]:
        """Extract all links from markdown content"""
        import re
        # Match markdown links [text](url)
        markdown_links = re.findall(r'\[([^\]]+)\]\(([^)]+)\)', content)
        # Match raw URLs
        raw_urls = re.findall(r'https?://[^\s<>"{}|\\^`\[\]]+', content)
        
        links = [link[1] for link in markdown_links] + raw_urls
        return list(set(links))
    
    def _check_broken_links(self, links: List[str], base_path: str) -> List[str]:
        """Check for broken links (simplified version)"""
        broken = []
        base_dir = os.path.dirname(base_path)
        
        for link in links:
            if link.startswith(('http://', 'https://')):
                # Skip external links for now (could add HTTP checking)
                continue
            elif link.startswith('#'):
                # Skip anchor links
                continue
            else:
                # Check local file links
                if link.startswith('/'):
                    full_path = link
                else:
                    full_path = os.path.join(base_dir, link)
                
                if not os.path.exists(full_path):
                    broken.append(link)
        
        return broken
    
    def _calculate_readability(self, content: str) -> float:
        """Calculate readability score (simplified Flesch Reading Ease)"""
        sentences = content.split('.')
        words = content.split()
        
        if not sentences or not words:
            return 0.0
        
        avg_sentence_length = len(words) / len(sentences)
        avg_syllables_per_word = 1.5  # Simplified estimate
        
        score = 206.835 - 1.015 * avg_sentence_length - 84.6 * avg_syllables_per_word
        return max(0, min(100, score))
    
    def _store_metrics(self, metrics: DocumentMetrics):
        """Store metrics in database"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO document_metrics (
                file_path, word_count, link_count, broken_links,
                last_modified, file_size, readability_score,
                headers_count, code_blocks_count, images_count, timestamp
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            metrics.file_path,
            metrics.word_count,
            metrics.link_count,
            json.dumps(metrics.broken_links),
            metrics.last_modified,
            metrics.file_size,
            metrics.readability_score,
            metrics.headers_count,
            metrics.code_blocks_count,
            metrics.images_count,
            metrics.timestamp
        ))
        
        conn.commit()
        conn.close()
    
    def _check_thresholds(self, metrics: DocumentMetrics):
        """Check metrics against configured thresholds"""
        thresholds = self.config.get('thresholds', {})
        
        # Check word count
        min_words = thresholds.get('min_word_count', 50)
        if metrics.word_count < min_words:
            self._create_alert(
                severity='warning',
                alert_type='low_content',
                message=f"Document has only {metrics.word_count} words (minimum: {min_words})",
                file_path=metrics.file_path
            )
        
        # Check broken links
        max_broken = thresholds.get('max_broken_links', 2)
        if len(metrics.broken_links) > max_broken:
            self._create_alert(
                severity='critical',
                alert_type='broken_links',
                message=f"Document has {len(metrics.broken_links)} broken links",
                file_path=metrics.file_path,
                details={'broken_links': metrics.broken_links}
            )
        
        # Check file size
        max_size_mb = thresholds.get('max_file_size_mb', 10)
        file_size_mb = metrics.file_size / (1024 * 1024)
        if file_size_mb > max_size_mb:
            self._create_alert(
                severity='warning',
                alert_type='large_file',
                message=f"Document size ({file_size_mb:.2f}MB) exceeds limit ({max_size_mb}MB)",
                file_path=metrics.file_path
            )
        
        # Check readability
        min_readability = thresholds.get('min_readability_score', 40.0)
        if metrics.readability_score < min_readability:
            self._create_alert(
                severity='info',
                alert_type='low_readability',
                message=f"Document readability score ({metrics.readability_score:.1f}) is below threshold ({min_readability})",
                file_path=metrics.file_path
            )
    
    def _create_alert(self, severity: str, alert_type: str, message: str, 
                     file_path: Optional[str] = None, details: Optional[Dict] = None):
        """Create and store an alert"""
        alert = Alert(
            severity=severity,
            type=alert_type,
            message=message,
            file_path=file_path,
            timestamp=time.time(),
            details=details or {}
        )
        
        self.alerts.append(alert)
        self._store_alert(alert)
        
        # Send notifications if configured
        if severity == 'critical':
            self._send_notification(alert)
        
        logger.warning(f"Alert created: {severity} - {message}")
    
    def _store_alert(self, alert: Alert):
        """Store alert in database"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO alerts (severity, type, message, file_path, timestamp, details)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (
            alert.severity,
            alert.type,
            alert.message,
            alert.file_path,
            alert.timestamp,
            json.dumps(alert.details)
        ))
        
        conn.commit()
        conn.close()
    
    def _send_notification(self, alert: Alert):
        """Send email notification for critical alerts"""
        alert_settings = self.config.get('alert_settings', {})
        
        if not alert_settings.get('email_enabled', False):
            return
        
        recipients = alert_settings.get('email_recipients', [])
        if not recipients:
            return
        
        try:
            msg = MIMEMultipart()
            msg['Subject'] = f"[Doc Monitor] Critical Alert: {alert.type}"
            msg['From'] = 'doc-monitor@nscale-assist.local'
            msg['To'] = ', '.join(recipients)
            
            body = f"""
Critical Alert in Documentation System

Type: {alert.type}
File: {alert.file_path or 'N/A'}
Message: {alert.message}
Time: {datetime.datetime.fromtimestamp(alert.timestamp).strftime('%Y-%m-%d %H:%M:%S')}

Details:
{json.dumps(alert.details, indent=2)}

---
This is an automated message from the Documentation Monitoring System
            """
            
            msg.attach(MIMEText(body, 'plain'))
            
            # Send email (simplified, would need proper SMTP config)
            logger.info(f"Alert notification would be sent to: {recipients}")
            
        except Exception as e:
            logger.error(f"Failed to send notification: {e}")
    
    def start(self):
        """Start monitoring"""
        logger.info("Starting documentation monitor...")
        self.observer.start()
        
        # Schedule periodic tasks
        self._schedule_periodic_tasks()
        
        try:
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            self.observer.stop()
            logger.info("Monitoring stopped")
        
        self.observer.join()
    
    def _schedule_periodic_tasks(self):
        """Schedule periodic maintenance tasks"""
        def run_periodic():
            while True:
                try:
                    # Clean old metrics
                    self._clean_old_metrics()
                    
                    # Check for stale documents
                    self._check_stale_documents()
                    
                    # Generate summary report
                    self._generate_summary_report()
                    
                except Exception as e:
                    logger.error(f"Error in periodic task: {e}")
                
                # Run every hour
                time.sleep(3600)
        
        thread = threading.Thread(target=run_periodic, daemon=True)
        thread.start()
    
    def _clean_old_metrics(self):
        """Clean metrics older than retention period"""
        retention_days = self.config.get('metrics_retention_days', 90)
        cutoff_time = time.time() - (retention_days * 24 * 3600)
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            DELETE FROM document_metrics WHERE timestamp < ?
        ''', (cutoff_time,))
        
        deleted_count = cursor.rowcount
        conn.commit()
        conn.close()
        
        if deleted_count > 0:
            logger.info(f"Cleaned {deleted_count} old metric records")
    
    def _check_stale_documents(self):
        """Check for documents that haven't been updated recently"""
        thresholds = self.config.get('thresholds', {})
        max_days = thresholds.get('max_days_without_update', 180)
        cutoff_time = time.time() - (max_days * 24 * 3600)
        
        for path in self.watched_paths:
            if not os.path.exists(path):
                continue
                
            for root, dirs, files in os.walk(path):
                for file in files:
                    if self._should_monitor_file(file):
                        file_path = os.path.join(root, file)
                        mtime = os.path.getmtime(file_path)
                        
                        if mtime < cutoff_time:
                            days_old = (time.time() - mtime) / (24 * 3600)
                            self._create_alert(
                                severity='info',
                                alert_type='stale_document',
                                message=f"Document hasn't been updated in {days_old:.0f} days",
                                file_path=file_path
                            )
    
    def _generate_summary_report(self):
        """Generate hourly summary report"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Get metrics from last hour
        hour_ago = time.time() - 3600
        
        cursor.execute('''
            SELECT 
                COUNT(DISTINCT file_path) as files_modified,
                AVG(word_count) as avg_word_count,
                AVG(readability_score) as avg_readability,
                SUM(CASE WHEN json_array_length(broken_links) > 0 THEN 1 ELSE 0 END) as files_with_broken_links
            FROM document_metrics
            WHERE timestamp > ?
        ''', (hour_ago,))
        
        metrics = cursor.fetchone()
        
        # Get alert counts
        cursor.execute('''
            SELECT severity, COUNT(*) as count
            FROM alerts
            WHERE timestamp > ?
            GROUP BY severity
        ''', (hour_ago,))
        
        alert_counts = {row[0]: row[1] for row in cursor.fetchall()}
        
        conn.close()
        
        logger.info(f"""
Hourly Summary Report:
- Files modified: {metrics[0] or 0}
- Average word count: {metrics[1] or 0:.0f}
- Average readability: {metrics[2] or 0:.1f}
- Files with broken links: {metrics[3] or 0}
- Alerts: Critical={alert_counts.get('critical', 0)}, Warning={alert_counts.get('warning', 0)}, Info={alert_counts.get('info', 0)}
        """)
    
    def get_metrics_history(self, file_path: str, days: int = 7) -> List[DocumentMetrics]:
        """Get metrics history for a specific file"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cutoff_time = time.time() - (days * 24 * 3600)
        
        cursor.execute('''
            SELECT * FROM document_metrics
            WHERE file_path = ? AND timestamp > ?
            ORDER BY timestamp DESC
        ''', (file_path, cutoff_time))
        
        metrics = []
        for row in cursor.fetchall():
            metrics.append(DocumentMetrics(
                file_path=row[1],
                word_count=row[2],
                link_count=row[3],
                broken_links=json.loads(row[4]),
                last_modified=row[5],
                file_size=row[6],
                readability_score=row[7],
                headers_count=row[8],
                code_blocks_count=row[9],
                images_count=row[10],
                timestamp=row[11]
            ))
        
        conn.close()
        return metrics
    
    def detect_anomalies(self, file_path: str) -> List[str]:
        """Detect anomalies in document metrics"""
        history = self.get_metrics_history(file_path, days=30)
        
        if len(history) < 5:
            return []
        
        anomalies = []
        
        # Check for sudden word count changes
        word_counts = [m.word_count for m in history]
        avg_word_count = sum(word_counts) / len(word_counts)
        latest_word_count = history[0].word_count
        
        if abs(latest_word_count - avg_word_count) > avg_word_count * 0.5:
            anomalies.append(f"Significant word count change: {latest_word_count} vs average {avg_word_count:.0f}")
        
        # Check for readability drops
        readability_scores = [m.readability_score for m in history]
        avg_readability = sum(readability_scores) / len(readability_scores)
        latest_readability = history[0].readability_score
        
        if latest_readability < avg_readability * 0.8:
            anomalies.append(f"Readability score dropped: {latest_readability:.1f} vs average {avg_readability:.1f}")
        
        # Check for sudden increase in broken links
        if len(history[0].broken_links) > 0 and len(history[1].broken_links) == 0:
            anomalies.append(f"New broken links detected: {history[0].broken_links}")
        
        return anomalies


def main():
    """Main entry point"""
    import argparse
    
    parser = argparse.ArgumentParser(description='Documentation Monitoring System')
    parser.add_argument('--config', default='/opt/nscale-assist/app/scripts/doc_monitor_config.json',
                       help='Path to configuration file')
    parser.add_argument('--init-config', action='store_true',
                       help='Initialize default configuration file')
    
    args = parser.parse_args()
    
    if args.init_config:
        # Create default config file
        default_config = DocumentMonitor(args.config)._get_default_config()
        with open(args.config, 'w') as f:
            json.dump(default_config, f, indent=2)
        logger.info(f"Created default configuration at {args.config}")
        return
    
    # Start monitoring
    monitor = DocumentMonitor(args.config)
    monitor.start()


if __name__ == '__main__':
    main()