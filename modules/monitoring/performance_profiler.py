import logging
import time
import psutil
import asyncio
import cProfile
import pstats
import io
import tracemalloc
import functools
import threading
from typing import Dict, List, Any, Optional, Callable
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from collections import defaultdict, deque
import json

logger = logging.getLogger(__name__)

@dataclass
class PerformanceMetric:
    """Single performance measurement"""
    name: str
    start_time: float
    end_time: Optional[float] = None
    duration: Optional[float] = None
    memory_start: Optional[int] = None
    memory_end: Optional[int] = None
    memory_delta: Optional[int] = None
    cpu_percent: Optional[float] = None
    exception: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    def complete(self):
        """Mark metric as complete"""
        self.end_time = time.time()
        self.duration = self.end_time - self.start_time
        if self.memory_start and tracemalloc.is_tracing():
            self.memory_end = tracemalloc.get_traced_memory()[0]
            self.memory_delta = self.memory_end - self.memory_start

@dataclass
class PerformanceReport:
    """Performance analysis report"""
    timestamp: datetime
    total_duration: float
    metrics: List[PerformanceMetric]
    bottlenecks: List[Dict[str, Any]]
    recommendations: List[str]
    system_stats: Dict[str, Any]
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'timestamp': self.timestamp.isoformat(),
            'total_duration': self.total_duration,
            'metrics_count': len(self.metrics),
            'bottlenecks': self.bottlenecks,
            'recommendations': self.recommendations,
            'system_stats': self.system_stats,
            'top_slowest': [
                {
                    'name': m.name,
                    'duration': m.duration,
                    'memory_delta_mb': m.memory_delta / 1024 / 1024 if m.memory_delta else 0
                }
                for m in sorted(self.metrics, key=lambda x: x.duration or 0, reverse=True)[:10]
            ]
        }

class PerformanceProfiler:
    """Advanced performance profiling system"""
    
    def __init__(self):
        # Metrics storage
        self.metrics: Dict[str, deque] = defaultdict(lambda: deque(maxlen=1000))
        
        # Active profilers
        self.active_profilers: Dict[str, cProfile.Profile] = {}
        
        # Memory tracking
        self.memory_snapshots: deque = deque(maxlen=100)
        
        # Thresholds for bottleneck detection
        self.thresholds = {
            'slow_request_ms': 1000,  # 1 second
            'high_memory_mb': 100,     # 100 MB allocation
            'high_cpu_percent': 80,    # 80% CPU
        }
        
        # Performance history
        self.reports: deque = deque(maxlen=50)
        
        # Real-time metrics
        self.realtime_metrics = {
            'requests_per_second': 0,
            'avg_response_time': 0,
            'active_requests': 0,
            'memory_usage_mb': 0,
            'cpu_percent': 0
        }
        
        # Start background monitoring
        self._start_monitoring()
    
    def _start_monitoring(self):
        """Start background system monitoring"""
        def monitor():
            while True:
                try:
                    # Update system metrics
                    process = psutil.Process()
                    self.realtime_metrics['cpu_percent'] = process.cpu_percent(interval=1)
                    self.realtime_metrics['memory_usage_mb'] = process.memory_info().rss / 1024 / 1024
                    
                    # Calculate request metrics
                    recent_metrics = []
                    cutoff_time = time.time() - 60  # Last minute
                    
                    for metric_list in self.metrics.values():
                        recent_metrics.extend([
                            m for m in metric_list 
                            if m.start_time > cutoff_time and m.duration
                        ])
                    
                    if recent_metrics:
                        self.realtime_metrics['requests_per_second'] = len(recent_metrics) / 60
                        self.realtime_metrics['avg_response_time'] = (
                            sum(m.duration for m in recent_metrics) / len(recent_metrics) * 1000
                        )
                    
                    time.sleep(5)  # Update every 5 seconds
                    
                except Exception as e:
                    logger.error(f"Monitoring error: {str(e)}")
                    time.sleep(10)
        
        monitor_thread = threading.Thread(target=monitor, daemon=True)
        monitor_thread.start()
    
    def profile(self, name: str = None):
        """Decorator for profiling functions"""
        def decorator(func):
            nonlocal name
            if not name:
                name = f"{func.__module__}.{func.__name__}"
            
            @functools.wraps(func)
            async def async_wrapper(*args, **kwargs):
                metric = self._start_metric(name)
                try:
                    result = await func(*args, **kwargs)
                    self._complete_metric(metric)
                    return result
                except Exception as e:
                    metric.exception = str(e)
                    self._complete_metric(metric)
                    raise
            
            @functools.wraps(func)
            def sync_wrapper(*args, **kwargs):
                metric = self._start_metric(name)
                try:
                    result = func(*args, **kwargs)
                    self._complete_metric(metric)
                    return result
                except Exception as e:
                    metric.exception = str(e)
                    self._complete_metric(metric)
                    raise
            
            return async_wrapper if asyncio.iscoroutinefunction(func) else sync_wrapper
        
        return decorator
    
    def _start_metric(self, name: str) -> PerformanceMetric:
        """Start a performance metric"""
        metric = PerformanceMetric(
            name=name,
            start_time=time.time()
        )
        
        # Track memory if enabled
        if tracemalloc.is_tracing():
            metric.memory_start = tracemalloc.get_traced_memory()[0]
        
        # Track CPU
        try:
            metric.cpu_percent = psutil.Process().cpu_percent()
        except:
            pass
        
        return metric
    
    def _complete_metric(self, metric: PerformanceMetric):
        """Complete and store a metric"""
        metric.complete()
        self.metrics[metric.name].append(metric)
        
        # Check for bottlenecks
        if metric.duration and metric.duration * 1000 > self.thresholds['slow_request_ms']:
            logger.warning(f"Slow operation detected: {metric.name} took {metric.duration:.2f}s")
        
        if metric.memory_delta and metric.memory_delta / 1024 / 1024 > self.thresholds['high_memory_mb']:
            logger.warning(
                f"High memory usage: {metric.name} allocated "
                f"{metric.memory_delta / 1024 / 1024:.2f}MB"
            )
    
    def start_profiling(self, session_id: str):
        """Start detailed profiling for a session"""
        if session_id in self.active_profilers:
            logger.warning(f"Profiler already active for session {session_id}")
            return
        
        profiler = cProfile.Profile()
        profiler.enable()
        self.active_profilers[session_id] = profiler
        
        # Enable memory tracking
        if not tracemalloc.is_tracing():
            tracemalloc.start()
        
        logger.info(f"Started profiling session {session_id}")
    
    def stop_profiling(self, session_id: str) -> Optional[str]:
        """Stop profiling and return results"""
        if session_id not in self.active_profilers:
            logger.warning(f"No active profiler for session {session_id}")
            return None
        
        profiler = self.active_profilers.pop(session_id)
        profiler.disable()
        
        # Generate stats
        s = io.StringIO()
        ps = pstats.Stats(profiler, stream=s).sort_stats('cumulative')
        ps.print_stats(30)  # Top 30 functions
        
        return s.getvalue()
    
    def analyze_performance(self, time_range_minutes: int = 60) -> PerformanceReport:
        """Analyze performance over time range"""
        cutoff_time = time.time() - (time_range_minutes * 60)
        
        # Collect relevant metrics
        all_metrics = []
        for metric_list in self.metrics.values():
            all_metrics.extend([
                m for m in metric_list 
                if m.start_time > cutoff_time
            ])
        
        if not all_metrics:
            return PerformanceReport(
                timestamp=datetime.now(),
                total_duration=0,
                metrics=[],
                bottlenecks=[],
                recommendations=[],
                system_stats=self.get_system_stats()
            )
        
        # Identify bottlenecks
        bottlenecks = self._identify_bottlenecks(all_metrics)
        
        # Generate recommendations
        recommendations = self._generate_recommendations(all_metrics, bottlenecks)
        
        # Create report
        report = PerformanceReport(
            timestamp=datetime.now(),
            total_duration=time_range_minutes * 60,
            metrics=all_metrics,
            bottlenecks=bottlenecks,
            recommendations=recommendations,
            system_stats=self.get_system_stats()
        )
        
        self.reports.append(report)
        return report
    
    def _identify_bottlenecks(self, metrics: List[PerformanceMetric]) -> List[Dict[str, Any]]:
        """Identify performance bottlenecks"""
        bottlenecks = []
        
        # Group by operation name
        operation_stats = defaultdict(lambda: {
            'count': 0,
            'total_duration': 0,
            'total_memory': 0,
            'errors': 0
        })
        
        for metric in metrics:
            stats = operation_stats[metric.name]
            stats['count'] += 1
            if metric.duration:
                stats['total_duration'] += metric.duration
            if metric.memory_delta:
                stats['total_memory'] += metric.memory_delta
            if metric.exception:
                stats['errors'] += 1
        
        # Find bottlenecks
        for operation, stats in operation_stats.items():
            avg_duration = stats['total_duration'] / stats['count'] if stats['count'] > 0 else 0
            
            # Slow operations
            if avg_duration * 1000 > self.thresholds['slow_request_ms']:
                bottlenecks.append({
                    'type': 'slow_operation',
                    'operation': operation,
                    'avg_duration_ms': avg_duration * 1000,
                    'count': stats['count'],
                    'impact': 'high' if avg_duration * 1000 > 2000 else 'medium'
                })
            
            # Memory intensive operations
            avg_memory = stats['total_memory'] / stats['count'] if stats['count'] > 0 else 0
            if avg_memory / 1024 / 1024 > self.thresholds['high_memory_mb']:
                bottlenecks.append({
                    'type': 'high_memory',
                    'operation': operation,
                    'avg_memory_mb': avg_memory / 1024 / 1024,
                    'count': stats['count'],
                    'impact': 'high' if avg_memory / 1024 / 1024 > 200 else 'medium'
                })
            
            # Error prone operations
            error_rate = stats['errors'] / stats['count'] if stats['count'] > 0 else 0
            if error_rate > 0.1:  # >10% error rate
                bottlenecks.append({
                    'type': 'high_error_rate',
                    'operation': operation,
                    'error_rate': error_rate,
                    'count': stats['count'],
                    'impact': 'high' if error_rate > 0.5 else 'medium'
                })
        
        return sorted(bottlenecks, key=lambda x: x['impact'], reverse=True)
    
    def _generate_recommendations(self, metrics: List[PerformanceMetric], 
                                bottlenecks: List[Dict[str, Any]]) -> List[str]:
        """Generate performance recommendations"""
        recommendations = []
        
        # Analyze bottlenecks
        slow_ops = [b for b in bottlenecks if b['type'] == 'slow_operation']
        memory_ops = [b for b in bottlenecks if b['type'] == 'high_memory']
        error_ops = [b for b in bottlenecks if b['type'] == 'high_error_rate']
        
        # Slow operations recommendations
        if slow_ops:
            recommendations.append(
                f"Optimize slow operations: {', '.join(op['operation'] for op in slow_ops[:3])}. "
                "Consider adding caching, database indexing, or async processing."
            )
        
        # Memory recommendations
        if memory_ops:
            recommendations.append(
                f"Reduce memory usage in: {', '.join(op['operation'] for op in memory_ops[:3])}. "
                "Consider streaming large data, pagination, or more efficient data structures."
            )
        
        # Error rate recommendations
        if error_ops:
            recommendations.append(
                f"Fix error-prone operations: {', '.join(op['operation'] for op in error_ops[:3])}. "
                "Add better error handling, input validation, and retry logic."
            )
        
        # System-level recommendations
        system_stats = self.get_system_stats()
        
        if system_stats['memory']['percent'] > 80:
            recommendations.append(
                "System memory usage is high. Consider scaling vertically or "
                "optimizing memory-intensive operations."
            )
        
        if system_stats['cpu']['percent'] > 80:
            recommendations.append(
                "CPU usage is high. Consider horizontal scaling or "
                "optimizing CPU-intensive operations."
            )
        
        # General recommendations based on patterns
        total_requests = len(metrics)
        if total_requests > 10000:
            avg_duration = sum(m.duration or 0 for m in metrics) / total_requests
            if avg_duration > 0.5:  # >500ms average
                recommendations.append(
                    "Average response time is high. Implement request caching, "
                    "connection pooling, and consider using a CDN."
                )
        
        return recommendations
    
    def get_system_stats(self) -> Dict[str, Any]:
        """Get current system statistics"""
        try:
            cpu_percent = psutil.cpu_percent(interval=0.1)
            memory = psutil.virtual_memory()
            disk = psutil.disk_usage('/')
            
            # Network stats
            net_io = psutil.net_io_counters()
            
            # Process stats
            process = psutil.Process()
            process_memory = process.memory_info()
            
            return {
                'cpu': {
                    'percent': cpu_percent,
                    'count': psutil.cpu_count()
                },
                'memory': {
                    'total_gb': memory.total / 1024 / 1024 / 1024,
                    'available_gb': memory.available / 1024 / 1024 / 1024,
                    'percent': memory.percent
                },
                'disk': {
                    'total_gb': disk.total / 1024 / 1024 / 1024,
                    'free_gb': disk.free / 1024 / 1024 / 1024,
                    'percent': disk.percent
                },
                'network': {
                    'bytes_sent': net_io.bytes_sent,
                    'bytes_recv': net_io.bytes_recv,
                    'packets_sent': net_io.packets_sent,
                    'packets_recv': net_io.packets_recv
                },
                'process': {
                    'memory_mb': process_memory.rss / 1024 / 1024,
                    'threads': process.num_threads(),
                    'cpu_percent': process.cpu_percent()
                }
            }
        except Exception as e:
            logger.error(f"Error getting system stats: {str(e)}")
            return {}
    
    def get_realtime_metrics(self) -> Dict[str, Any]:
        """Get real-time performance metrics"""
        return self.realtime_metrics.copy()
    
    def export_report(self, report: PerformanceReport, format: str = 'json') -> str:
        """Export performance report"""
        if format == 'json':
            return json.dumps(report.to_dict(), indent=2)
        
        elif format == 'html':
            # Generate HTML report
            html = f"""
            <html>
            <head>
                <title>Performance Report - {report.timestamp}</title>
                <style>
                    body {{ font-family: Arial, sans-serif; margin: 20px; }}
                    .metric {{ background: #f0f0f0; padding: 10px; margin: 10px 0; }}
                    .bottleneck {{ background: #ffe0e0; padding: 10px; margin: 10px 0; }}
                    .recommendation {{ background: #e0f0ff; padding: 10px; margin: 10px 0; }}
                </style>
            </head>
            <body>
                <h1>Performance Report</h1>
                <p>Generated: {report.timestamp}</p>
                
                <h2>System Stats</h2>
                <pre>{json.dumps(report.system_stats, indent=2)}</pre>
                
                <h2>Top Bottlenecks</h2>
                {''.join(f'<div class="bottleneck">{json.dumps(b, indent=2)}</div>' 
                        for b in report.bottlenecks[:5])}
                
                <h2>Recommendations</h2>
                {''.join(f'<div class="recommendation">{r}</div>' for r in report.recommendations)}
                
                <h2>Slowest Operations</h2>
                <table border="1">
                    <tr><th>Operation</th><th>Duration (ms)</th><th>Memory (MB)</th></tr>
                    {''.join(f'<tr><td>{m["name"]}</td><td>{m["duration"]*1000:.2f}</td>'
                            f'<td>{m.get("memory_delta_mb", 0):.2f}</td></tr>'
                            for m in report.to_dict()["top_slowest"])}
                </table>
            </body>
            </html>
            """
            return html
        
        else:
            raise ValueError(f"Unsupported format: {format}")

# Global performance profiler
performance_profiler = PerformanceProfiler()