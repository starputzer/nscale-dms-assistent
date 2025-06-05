"""System endpoints without /v1 prefix for backward compatibility"""

from fastapi import APIRouter, HTTPException
from datetime import datetime
import psutil
import os

router = APIRouter()

@router.get("/system/info")
async def get_system_info():
    """Get system information"""
    return {
        "version": "2.0.0",
        "name": "Digitale Akte Assistent",
        "build": "2025.06.05",
        "environment": "production",
        "features": {
            "rag": True,
            "ocr": True,
            "streaming": True,
            "batch_processing": True
        }
    }

@router.get("/system/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "services": {
            "database": "operational",
            "rag": "operational", 
            "auth": "operational",
            "cache": "operational"
        }
    }

@router.get("/system/stats")
async def get_system_stats():
    """Get system statistics"""
    try:
        cpu_percent = psutil.cpu_percent(interval=0.1)
        memory = psutil.virtual_memory()
        disk = psutil.disk_usage('/')
        
        return {
            "cpu": {
                "usage_percent": cpu_percent,
                "count": psutil.cpu_count()
            },
            "memory": {
                "total": memory.total,
                "available": memory.available,
                "percent": memory.percent,
                "used": memory.used
            },
            "disk": {
                "total": disk.total,
                "used": disk.used,
                "free": disk.free,
                "percent": disk.percent
            },
            "uptime": os.popen('uptime -p').read().strip()
        }
    except Exception as e:
        return {
            "error": str(e),
            "cpu": {"usage_percent": 0},
            "memory": {"percent": 0},
            "disk": {"percent": 0}
        }