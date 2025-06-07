"""
System Monitoring Module

Includes:
- System monitoring routes
- Model health check routes
"""

from fastapi import APIRouter
from .routes import router as system_router
from .health_routes import router as health_router

# Create a combined router
router = APIRouter()

# Include both routers
router.include_router(system_router, prefix="/monitoring", tags=["monitoring"])
router.include_router(health_router, tags=["health"])

__all__ = ['router']