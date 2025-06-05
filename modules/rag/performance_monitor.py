"""
Performance Monitoring for RAG System
Tracks metrics, identifies bottlenecks, and provides optimization recommendations
"""

import time
import psutil
import threading
from typing import Dict, List, Optional, Any, Callable
from datetime import datetime, timedelta
from collections import defaultdict, deque
import json
import statistics

from ..core.logging import LogManager
from ..core.config import Config

logger = LogManager.setup_logging(__name__)


class PerformanceMetrics:
    """Container for performance metrics"""
    
    def __init__(self):
        self.timestamp = datetime.now()
        self.cpu_percent = 0.0
        self.memory_percent = 0.0
        self.disk_io_read = 0
        self.disk_io_write = 0
        self.network_io_sent = 0
        self.network_io_recv = 0
        self.active_threads = 0
        self.open_files = 0
        
        # RAG-specific metrics
        self.queries_per_second = 0.0
        self.avg_query_time = 0.0
        self.cache_hit_rate = 0.0
        self.embedding_queue_size = 0
        self.processing_queue_size = 0
        self.error_rate = 0.0
        
    def to_dict(self) -> Dict[str, Any]:
        """Convert metrics to dictionary"""
        return {
            'timestamp': self.timestamp.isoformat(),
            'system': {
                'cpu_percent': self.cpu_percent,
                'memory_percent': self.memory_percent,
                'disk_io': {
                    'read_bytes': self.disk_io_read,
                    'write_bytes': self.disk_io_write
                },
                'network_io': {
                    'sent_bytes': self.network_io_sent,
                    'recv_bytes': self.network_io_recv
                },
                'active_threads': self.active_threads,
                'open_files': self.open_files
            },
            'rag': {
                'queries_per_second': self.queries_per_second,
                'avg_query_time_ms': self.avg_query_time,
                'cache_hit_rate': self.cache_hit_rate,
                'embedding_queue_size': self.embedding_queue_size,
                'processing_queue_size': self.processing_queue_size,
                'error_rate': self.error_rate
            }
        }


class MetricCollector:
    """Collects various system and application metrics"""
    
    def __init__(self):
        self.process = psutil.Process()
        self.last_disk_io = None
        self.last_network_io = None
        
    def collect_system_metrics(self, metrics: PerformanceMetrics):
        """Collect system-level metrics"""
        # CPU and Memory
        metrics.cpu_percent = self.process.cpu_percent(interval=0.1)
        metrics.memory_percent = self.process.memory_percent()
        
        # Thread and file counts
        metrics.active_threads = self.process.num_threads()
        try:
            metrics.open_files = len(self.process.open_files())
        except:
            metrics.open_files = 0
            
        # Disk I/O
        try:
            disk_io = psutil.disk_io_counters()
            if disk_io and self.last_disk_io:
                metrics.disk_io_read = disk_io.read_bytes - self.last_disk_io.read_bytes
                metrics.disk_io_write = disk_io.write_bytes - self.last_disk_io.write_bytes
            self.last_disk_io = disk_io
        except:
            pass
            
        # Network I/O
        try:
            net_io = psutil.net_io_counters()
            if net_io and self.last_network_io:
                metrics.network_io_sent = net_io.bytes_sent - self.last_network_io.bytes_sent
                metrics.network_io_recv = net_io.bytes_recv - self.last_network_io.bytes_recv
            self.last_network_io = net_io
        except:
            pass


class PerformanceMonitor:
    """Main performance monitoring system"""
    
    def __init__(self, 
                 collect_interval: int = 5,
                 history_size: int = 1000):
        self.collect_interval = collect_interval
        self.history_size = history_size
        
        # Metrics storage
        self.metrics_history = deque(maxlen=history_size)
        self.current_metrics = PerformanceMetrics()
        
        # Metric collectors
        self.system_collector = MetricCollector()
        self.custom_collectors: Dict[str, Callable] = {}
        
        # Performance tracking
        self.operation_timings: Dict[str, deque] = defaultdict(lambda: deque(maxlen=100))
        self.error_counts: Dict[str, int] = defaultdict(int)
        self.cache_stats = {'hits': 0, 'misses': 0}
        
        # Monitoring thread
        self.is_monitoring = False
        self.monitor_thread: Optional[threading.Thread] = None
        
        # Alert thresholds
        self.thresholds = {
            'cpu_percent': 80.0,
            'memory_percent': 85.0,
            'query_time_ms': 1000.0,
            'error_rate': 0.05,
            'queue_size': 100
        }
        
        # Alert callbacks
        self.alert_callbacks: List[Callable] = []
        
    def add_custom_collector(self, name: str, collector: Callable):
        """Add custom metric collector"""
        self.custom_collectors[name] = collector
        
    def add_alert_callback(self, callback: Callable):
        """Add callback for performance alerts"""
        self.alert_callbacks.append(callback)
        
    def start(self):
        """Start performance monitoring"""
        if self.is_monitoring:
            logger.warning("Performance monitor is already running")
            return
            
        self.is_monitoring = True
        self.monitor_thread = threading.Thread(target=self._monitor_loop, daemon=True)
        self.monitor_thread.start()
        logger.info("Performance monitor started")
        
    def stop(self):
        """Stop performance monitoring"""
        self.is_monitoring = False
        if self.monitor_thread:
            self.monitor_thread.join(timeout=5)
            self.monitor_thread = None
        logger.info("Performance monitor stopped")
        
    def _monitor_loop(self):
        """Main monitoring loop"""
        while self.is_monitoring:
            try:
                # Collect metrics
                metrics = PerformanceMetrics()
                
                # System metrics
                self.system_collector.collect_system_metrics(metrics)
                
                # RAG metrics
                self._collect_rag_metrics(metrics)
                
                # Custom metrics
                for name, collector in self.custom_collectors.items():
                    try:
                        collector(metrics)
                    except Exception as e:
                        logger.error(f"Error in custom collector {name}: {str(e)}")
                
                # Store metrics
                self.current_metrics = metrics
                self.metrics_history.append(metrics)
                
                # Check for alerts
                self._check_alerts(metrics)
                
                # Sleep until next collection
                time.sleep(self.collect_interval)
                
            except Exception as e:
                logger.error(f"Error in performance monitor loop: {str(e)}")
                
    def _collect_rag_metrics(self, metrics: PerformanceMetrics):
        """Collect RAG-specific metrics"""
        # Query performance
        if self.operation_timings.get('query'):
            recent_queries = list(self.operation_timings['query'])
            metrics.avg_query_time = statistics.mean(recent_queries) if recent_queries else 0
            
            # Calculate QPS based on recent history
            if len(self.metrics_history) > 0:
                time_window = 60  # seconds
                recent_time = datetime.now() - timedelta(seconds=time_window)
                recent_count = sum(1 for m in self.metrics_history 
                                 if m.timestamp > recent_time)
                metrics.queries_per_second = recent_count / time_window
        
        # Cache performance
        total_cache_ops = self.cache_stats['hits'] + self.cache_stats['misses']
        if total_cache_ops > 0:
            metrics.cache_hit_rate = self.cache_stats['hits'] / total_cache_ops
            
        # Error rate
        total_ops = sum(self.error_counts.values())
        if total_ops > 0:
            recent_errors = sum(count for op, count in self.error_counts.items()
                              if 'error' in op.lower())
            metrics.error_rate = recent_errors / total_ops
            
    def _check_alerts(self, metrics: PerformanceMetrics):
        """Check metrics against thresholds and trigger alerts"""
        alerts = []
        
        # System alerts
        if metrics.cpu_percent > self.thresholds['cpu_percent']:
            alerts.append({
                'type': 'cpu',
                'severity': 'warning',
                'message': f'CPU usage high: {metrics.cpu_percent:.1f}%',
                'value': metrics.cpu_percent,
                'threshold': self.thresholds['cpu_percent']
            })
            
        if metrics.memory_percent > self.thresholds['memory_percent']:
            alerts.append({
                'type': 'memory',
                'severity': 'warning',
                'message': f'Memory usage high: {metrics.memory_percent:.1f}%',
                'value': metrics.memory_percent,
                'threshold': self.thresholds['memory_percent']
            })
            
        # Performance alerts
        if metrics.avg_query_time > self.thresholds['query_time_ms']:
            alerts.append({
                'type': 'query_time',
                'severity': 'warning',
                'message': f'Query time high: {metrics.avg_query_time:.0f}ms',
                'value': metrics.avg_query_time,
                'threshold': self.thresholds['query_time_ms']
            })
            
        if metrics.error_rate > self.thresholds['error_rate']:
            alerts.append({
                'type': 'error_rate',
                'severity': 'error',
                'message': f'Error rate high: {metrics.error_rate:.1%}',
                'value': metrics.error_rate,
                'threshold': self.thresholds['error_rate']
            })
            
        # Queue alerts
        if metrics.embedding_queue_size > self.thresholds['queue_size']:
            alerts.append({
                'type': 'queue',
                'severity': 'warning',
                'message': f'Embedding queue large: {metrics.embedding_queue_size} items',
                'value': metrics.embedding_queue_size,
                'threshold': self.thresholds['queue_size']
            })
            
        # Trigger callbacks
        for alert in alerts:
            logger.warning(f"Performance alert: {alert['message']}")
            for callback in self.alert_callbacks:
                try:
                    callback(alert)
                except Exception as e:
                    logger.error(f"Error in alert callback: {str(e)}")
                    
    def record_operation(self, operation: str, duration_ms: float):
        """Record operation timing"""
        self.operation_timings[operation].append(duration_ms)
        
    def record_cache_hit(self):
        """Record cache hit"""
        self.cache_stats['hits'] += 1
        
    def record_cache_miss(self):
        """Record cache miss"""
        self.cache_stats['misses'] += 1
        
    def record_error(self, operation: str):
        """Record operation error"""
        self.error_counts[f"{operation}_error"] += 1
        
    def get_current_metrics(self) -> Dict[str, Any]:
        """Get current performance metrics"""
        return self.current_metrics.to_dict()
        
    def get_metrics_history(self, 
                          minutes: int = 60) -> List[Dict[str, Any]]:
        """Get metrics history for specified time window"""
        cutoff_time = datetime.now() - timedelta(minutes=minutes)
        return [
            m.to_dict() for m in self.metrics_history
            if m.timestamp > cutoff_time
        ]
        
    def get_performance_report(self) -> Dict[str, Any]:
        """Generate comprehensive performance report"""
        if not self.metrics_history:
            return {'error': 'No metrics collected yet'}
            
        # Calculate aggregates
        recent_metrics = list(self.metrics_history)[-20:]  # Last 20 samples
        
        report = {
            'timestamp': datetime.now().isoformat(),
            'summary': {
                'uptime_minutes': len(self.metrics_history) * self.collect_interval / 60,
                'samples_collected': len(self.metrics_history)
            },
            'system': {
                'cpu': {
                    'current': self.current_metrics.cpu_percent,
                    'average': statistics.mean(m.cpu_percent for m in recent_metrics),
                    'max': max(m.cpu_percent for m in recent_metrics)
                },
                'memory': {
                    'current': self.current_metrics.memory_percent,
                    'average': statistics.mean(m.memory_percent for m in recent_metrics),
                    'max': max(m.memory_percent for m in recent_metrics)
                }
            },
            'performance': {
                'queries_per_second': self.current_metrics.queries_per_second,
                'avg_query_time_ms': self.current_metrics.avg_query_time,
                'cache_hit_rate': self.current_metrics.cache_hit_rate,
                'error_rate': self.current_metrics.error_rate
            },
            'bottlenecks': self._identify_bottlenecks(),
            'recommendations': self._generate_recommendations()
        }
        
        return report
        
    def _identify_bottlenecks(self) -> List[Dict[str, Any]]:
        """Identify performance bottlenecks"""
        bottlenecks = []
        
        if not self.metrics_history:
            return bottlenecks
            
        recent_metrics = list(self.metrics_history)[-20:]
        
        # CPU bottleneck
        avg_cpu = statistics.mean(m.cpu_percent for m in recent_metrics)
        if avg_cpu > 70:
            bottlenecks.append({
                'type': 'cpu',
                'severity': 'high' if avg_cpu > 85 else 'medium',
                'description': f'High CPU usage: {avg_cpu:.1f}% average',
                'impact': 'Slow query processing and response times'
            })
            
        # Memory bottleneck
        avg_memory = statistics.mean(m.memory_percent for m in recent_metrics)
        if avg_memory > 75:
            bottlenecks.append({
                'type': 'memory',
                'severity': 'high' if avg_memory > 90 else 'medium',
                'description': f'High memory usage: {avg_memory:.1f}% average',
                'impact': 'Risk of out-of-memory errors and swapping'
            })
            
        # Query performance bottleneck
        if self.current_metrics.avg_query_time > 500:
            bottlenecks.append({
                'type': 'query_performance',
                'severity': 'high' if self.current_metrics.avg_query_time > 1000 else 'medium',
                'description': f'Slow query times: {self.current_metrics.avg_query_time:.0f}ms average',
                'impact': 'Poor user experience and timeouts'
            })
            
        # Cache performance
        if self.current_metrics.cache_hit_rate < 0.5:
            bottlenecks.append({
                'type': 'cache',
                'severity': 'medium',
                'description': f'Low cache hit rate: {self.current_metrics.cache_hit_rate:.1%}',
                'impact': 'Increased computation and response times'
            })
            
        return bottlenecks
        
    def _generate_recommendations(self) -> List[Dict[str, Any]]:
        """Generate performance optimization recommendations"""
        recommendations = []
        bottlenecks = self._identify_bottlenecks()
        
        for bottleneck in bottlenecks:
            if bottleneck['type'] == 'cpu':
                recommendations.append({
                    'priority': 'high',
                    'category': 'infrastructure',
                    'recommendation': 'Scale up CPU resources or optimize compute-intensive operations',
                    'actions': [
                        'Increase number of CPU cores',
                        'Optimize embedding generation',
                        'Implement request throttling',
                        'Use more efficient models'
                    ]
                })
                
            elif bottleneck['type'] == 'memory':
                recommendations.append({
                    'priority': 'high',
                    'category': 'infrastructure',
                    'recommendation': 'Increase memory or optimize memory usage',
                    'actions': [
                        'Increase system RAM',
                        'Reduce cache sizes',
                        'Implement memory-efficient data structures',
                        'Enable garbage collection tuning'
                    ]
                })
                
            elif bottleneck['type'] == 'query_performance':
                recommendations.append({
                    'priority': 'high',
                    'category': 'optimization',
                    'recommendation': 'Optimize query processing pipeline',
                    'actions': [
                        'Increase cache size and TTL',
                        'Optimize vector similarity search',
                        'Reduce chunk sizes',
                        'Implement query result pagination'
                    ]
                })
                
            elif bottleneck['type'] == 'cache':
                recommendations.append({
                    'priority': 'medium',
                    'category': 'configuration',
                    'recommendation': 'Improve cache effectiveness',
                    'actions': [
                        'Increase cache size',
                        'Implement smarter cache eviction',
                        'Pre-warm cache with common queries',
                        'Analyze and optimize cache keys'
                    ]
                })
                
        # General recommendations
        if not recommendations:
            recommendations.append({
                'priority': 'low',
                'category': 'monitoring',
                'recommendation': 'System performing well - continue monitoring',
                'actions': [
                    'Set up automated alerts',
                    'Establish performance baselines',
                    'Plan for future scaling needs'
                ]
            })
            
        return recommendations
        
    def export_metrics(self, filepath: str):
        """Export metrics history to file"""
        try:
            data = {
                'export_time': datetime.now().isoformat(),
                'metrics': [m.to_dict() for m in self.metrics_history],
                'report': self.get_performance_report()
            }
            
            with open(filepath, 'w') as f:
                json.dump(data, f, indent=2)
                
            logger.info(f"Exported metrics to {filepath}")
            
        except Exception as e:
            logger.error(f"Error exporting metrics: {str(e)}")


# Context manager for timing operations
class TimedOperation:
    """Context manager for timing operations"""
    
    def __init__(self, monitor: PerformanceMonitor, operation: str):
        self.monitor = monitor
        self.operation = operation
        self.start_time = None
        
    def __enter__(self):
        self.start_time = time.time()
        return self
        
    def __exit__(self, exc_type, exc_val, exc_tb):
        duration_ms = (time.time() - self.start_time) * 1000
        self.monitor.record_operation(self.operation, duration_ms)
        
        # Record error if exception occurred
        if exc_type is not None:
            self.monitor.record_error(self.operation)


# Global instance
_performance_monitor: Optional[PerformanceMonitor] = None


def get_performance_monitor() -> PerformanceMonitor:
    """Get or create global performance monitor instance"""
    global _performance_monitor
    
    if _performance_monitor is None:
        _performance_monitor = PerformanceMonitor()
        _performance_monitor.start()
        
    return _performance_monitor