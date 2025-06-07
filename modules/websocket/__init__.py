"""WebSocket module for real-time features"""

from .websocket_manager import manager, ConnectionManager, RateLimiter, authenticate_websocket
from .websocket_routes import (
    router,
    notify_document_processing_start,
    notify_document_processing_complete,
    notify_job_status_change,
    notify_system_alert,
    notify_user_activity,
    startup_websocket_tasks
)

__all__ = [
    "manager",
    "ConnectionManager",
    "RateLimiter",
    "authenticate_websocket",
    "router",
    "notify_document_processing_start",
    "notify_document_processing_complete",
    "notify_job_status_change",
    "notify_system_alert",
    "notify_user_activity",
    "startup_websocket_tasks"
]