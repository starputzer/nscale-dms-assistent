"""
System monitoring module for tracking system metrics
"""
import psutil
import asyncio
from typing import Dict, Any
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


async def get_system_metrics() -> Dict[str, Any]:
    """Get current system metrics"""
    try:
        # CPU usage
        cpu_percent = psutil.cpu_percent(interval=0.1)
        cpu_count = psutil.cpu_count()
        
        # Memory usage
        memory = psutil.virtual_memory()
        memory_percent = memory.percent
        memory_used = memory.used / (1024 ** 3)  # Convert to GB
        memory_total = memory.total / (1024 ** 3)  # Convert to GB
        
        # Disk usage
        disk = psutil.disk_usage('/')
        disk_percent = disk.percent
        disk_used = disk.used / (1024 ** 3)  # Convert to GB
        disk_total = disk.total / (1024 ** 3)  # Convert to GB
        
        # Network I/O
        net_io = psutil.net_io_counters()
        bytes_sent = net_io.bytes_sent / (1024 ** 2)  # Convert to MB
        bytes_recv = net_io.bytes_recv / (1024 ** 2)  # Convert to MB
        
        # Process info
        process = psutil.Process()
        process_memory = process.memory_info().rss / (1024 ** 2)  # Convert to MB
        process_cpu = process.cpu_percent(interval=0.1)
        
        return {
            "timestamp": datetime.utcnow().isoformat(),
            "cpu": {
                "percent": cpu_percent,
                "count": cpu_count,
                "process_percent": process_cpu
            },
            "memory": {
                "percent": memory_percent,
                "used_gb": round(memory_used, 2),
                "total_gb": round(memory_total, 2),
                "process_mb": round(process_memory, 2)
            },
            "disk": {
                "percent": disk_percent,
                "used_gb": round(disk_used, 2),
                "total_gb": round(disk_total, 2)
            },
            "network": {
                "bytes_sent_mb": round(bytes_sent, 2),
                "bytes_recv_mb": round(bytes_recv, 2)
            }
        }
    except Exception as e:
        logger.error(f"Error getting system metrics: {e}")
        return {
            "timestamp": datetime.utcnow().isoformat(),
            "error": str(e)
        }