"""
WebSocket routes for real-time features
Provides endpoints for system monitoring, background jobs, and document processing
"""
import asyncio
import json
import logging
from typing import Dict, Any, Optional
from datetime import datetime
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, HTTPException, status
from pydantic import BaseModel, ValidationError
import psutil
import os

from modules.websocket.websocket_manager import manager, rate_limiter, authenticate_websocket
from modules.core.auth_dependency import get_current_user, verify_admin
from modules.core.db import get_db
from modules.monitoring.system_monitor import get_system_metrics
from modules.background.job_manager import job_manager
from modules.doc_converter.document_processor import document_processor
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ws", tags=["websocket"])


class WebSocketMessage(BaseModel):
    """Base WebSocket message model"""
    type: str
    data: Optional[Dict[str, Any]] = None
    timestamp: Optional[str] = None
    
    class Config:
        extra = "allow"


@router.websocket("/connect")
async def websocket_endpoint(websocket: WebSocket):
    """Main WebSocket endpoint with authentication"""
    user_info = None
    user_id = None
    
    try:
        # Authenticate user
        user_info = await authenticate_websocket(websocket)
        if not user_info:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Authentication failed")
            return
            
        user_id = user_info["user_id"]
        
        # Connect user
        await manager.connect(websocket, user_id, metadata=user_info)
        
        # Auto-join rooms based on user role
        if user_info.get("role") == "admin":
            await manager.join_room(user_id, "admin")
            await manager.join_room(user_id, "system_monitoring")
            await manager.join_room(user_id, "background_jobs")
            
        # Main message loop
        while True:
            try:
                # Receive message
                raw_message = await websocket.receive_text()
                
                # Check rate limit
                if not await rate_limiter.check_rate_limit(user_id):
                    await websocket.send_json({
                        "type": "error",
                        "error": "Rate limit exceeded",
                        "timestamp": datetime.utcnow().isoformat()
                    })
                    continue
                    
                # Parse message
                try:
                    message_data = json.loads(raw_message)
                    message = WebSocketMessage(**message_data)
                except (json.JSONDecodeError, ValidationError) as e:
                    await websocket.send_json({
                        "type": "error",
                        "error": f"Invalid message format: {str(e)}",
                        "timestamp": datetime.utcnow().isoformat()
                    })
                    continue
                    
                # Handle message
                await handle_websocket_message(user_id, user_info, message)
                
            except WebSocketDisconnect:
                logger.info(f"WebSocket disconnected: user_id={user_id}")
                break
            except Exception as e:
                logger.error(f"WebSocket error for user {user_id}: {e}")
                await websocket.send_json({
                    "type": "error",
                    "error": str(e),
                    "timestamp": datetime.utcnow().isoformat()
                })
                
    except Exception as e:
        logger.error(f"WebSocket connection error: {e}")
    finally:
        if user_id:
            await manager.disconnect(user_id)


async def handle_websocket_message(user_id: str, user_info: Dict[str, Any], message: WebSocketMessage):
    """Handle incoming WebSocket messages"""
    
    handlers = {
        "ping": handle_ping,
        "join_room": handle_join_room,
        "leave_room": handle_leave_room,
        "subscribe_system_metrics": handle_subscribe_system_metrics,
        "unsubscribe_system_metrics": handle_unsubscribe_system_metrics,
        "subscribe_job_updates": handle_subscribe_job_updates,
        "unsubscribe_job_updates": handle_unsubscribe_job_updates,
        "subscribe_document_updates": handle_subscribe_document_updates,
        "unsubscribe_document_updates": handle_unsubscribe_document_updates,
        "get_active_jobs": handle_get_active_jobs,
        "get_active_documents": handle_get_active_documents,
        "broadcast_admin": handle_broadcast_admin,
    }
    
    handler = handlers.get(message.type)
    if handler:
        await handler(user_id, user_info, message)
    else:
        await manager.send_personal_message({
            "type": "error",
            "error": f"Unknown message type: {message.type}",
            "timestamp": datetime.utcnow().isoformat()
        }, user_id)


async def handle_ping(user_id: str, user_info: Dict[str, Any], message: WebSocketMessage):
    """Handle ping messages"""
    await manager.send_personal_message({
        "type": "pong",
        "timestamp": datetime.utcnow().isoformat()
    }, user_id)


async def handle_join_room(user_id: str, user_info: Dict[str, Any], message: WebSocketMessage):
    """Handle room join requests"""
    room = message.data.get("room") if message.data else None
    if not room:
        await manager.send_personal_message({
            "type": "error",
            "error": "Room name required",
            "timestamp": datetime.utcnow().isoformat()
        }, user_id)
        return
        
    # Check permissions for restricted rooms
    restricted_rooms = ["admin", "system_monitoring", "background_jobs"]
    if room in restricted_rooms and user_info.get("role") != "admin":
        await manager.send_personal_message({
            "type": "error",
            "error": "Insufficient permissions",
            "timestamp": datetime.utcnow().isoformat()
        }, user_id)
        return
        
    await manager.join_room(user_id, room)


async def handle_leave_room(user_id: str, user_info: Dict[str, Any], message: WebSocketMessage):
    """Handle room leave requests"""
    room = message.data.get("room") if message.data else None
    if not room:
        await manager.send_personal_message({
            "type": "error",
            "error": "Room name required",
            "timestamp": datetime.utcnow().isoformat()
        }, user_id)
        return
        
    await manager.leave_room(user_id, room)


async def handle_subscribe_system_metrics(user_id: str, user_info: Dict[str, Any], message: WebSocketMessage):
    """Subscribe to system metrics updates"""
    if user_info.get("role") != "admin":
        await manager.send_personal_message({
            "type": "error",
            "error": "Admin access required",
            "timestamp": datetime.utcnow().isoformat()
        }, user_id)
        return
        
    await manager.join_room(user_id, "system_metrics")
    
    # Send initial metrics
    metrics = await get_system_metrics()
    await manager.send_personal_message({
        "type": "system_metrics",
        "data": metrics,
        "timestamp": datetime.utcnow().isoformat()
    }, user_id)


async def handle_unsubscribe_system_metrics(user_id: str, user_info: Dict[str, Any], message: WebSocketMessage):
    """Unsubscribe from system metrics updates"""
    await manager.leave_room(user_id, "system_metrics")


async def handle_subscribe_job_updates(user_id: str, user_info: Dict[str, Any], message: WebSocketMessage):
    """Subscribe to background job updates"""
    if user_info.get("role") != "admin":
        await manager.send_personal_message({
            "type": "error",
            "error": "Admin access required",
            "timestamp": datetime.utcnow().isoformat()
        }, user_id)
        return
        
    await manager.join_room(user_id, "job_updates")
    
    # Send current job status
    jobs = await job_manager.get_active_jobs()
    await manager.send_personal_message({
        "type": "job_status",
        "data": {"jobs": jobs},
        "timestamp": datetime.utcnow().isoformat()
    }, user_id)


async def handle_unsubscribe_job_updates(user_id: str, user_info: Dict[str, Any], message: WebSocketMessage):
    """Unsubscribe from job updates"""
    await manager.leave_room(user_id, "job_updates")


async def handle_subscribe_document_updates(user_id: str, user_info: Dict[str, Any], message: WebSocketMessage):
    """Subscribe to document processing updates"""
    # Users can subscribe to their own document updates
    room = f"document_updates_{user_id}"
    await manager.join_room(user_id, room)
    
    # Admins also get all document updates
    if user_info.get("role") == "admin":
        await manager.join_room(user_id, "all_document_updates")


async def handle_unsubscribe_document_updates(user_id: str, user_info: Dict[str, Any], message: WebSocketMessage):
    """Unsubscribe from document updates"""
    room = f"document_updates_{user_id}"
    await manager.leave_room(user_id, room)
    
    if user_info.get("role") == "admin":
        await manager.leave_room(user_id, "all_document_updates")


async def handle_get_active_jobs(user_id: str, user_info: Dict[str, Any], message: WebSocketMessage):
    """Get list of active background jobs"""
    if user_info.get("role") != "admin":
        await manager.send_personal_message({
            "type": "error",
            "error": "Admin access required",
            "timestamp": datetime.utcnow().isoformat()
        }, user_id)
        return
        
    jobs = await job_manager.get_active_jobs()
    await manager.send_personal_message({
        "type": "active_jobs",
        "data": {"jobs": jobs},
        "timestamp": datetime.utcnow().isoformat()
    }, user_id)


async def handle_get_active_documents(user_id: str, user_info: Dict[str, Any], message: WebSocketMessage):
    """Get list of documents being processed"""
    # Get documents for user or all if admin
    if user_info.get("role") == "admin":
        documents = await document_processor.get_all_active_documents()
    else:
        documents = await document_processor.get_user_active_documents(user_id)
        
    await manager.send_personal_message({
        "type": "active_documents",
        "data": {"documents": documents},
        "timestamp": datetime.utcnow().isoformat()
    }, user_id)


async def handle_broadcast_admin(user_id: str, user_info: Dict[str, Any], message: WebSocketMessage):
    """Broadcast message to all admin users"""
    if user_info.get("role") != "admin":
        await manager.send_personal_message({
            "type": "error",
            "error": "Admin access required",
            "timestamp": datetime.utcnow().isoformat()
        }, user_id)
        return
        
    broadcast_data = message.data or {}
    await manager.send_to_room({
        "type": "admin_broadcast",
        "from_user": user_id,
        "data": broadcast_data,
        "timestamp": datetime.utcnow().isoformat()
    }, "admin")


# Background tasks for periodic updates
async def system_metrics_broadcaster():
    """Periodically broadcast system metrics"""
    while True:
        try:
            await asyncio.sleep(5)  # Every 5 seconds
            
            # Check if anyone is subscribed
            room_count = await manager.get_room_count("system_metrics")
            if room_count > 0:
                metrics = await get_system_metrics()
                await manager.send_to_room({
                    "type": "system_metrics",
                    "data": metrics,
                    "timestamp": datetime.utcnow().isoformat()
                }, "system_metrics")
                
        except Exception as e:
            logger.error(f"System metrics broadcast error: {e}")


async def job_status_broadcaster():
    """Broadcast job status updates"""
    while True:
        try:
            await asyncio.sleep(2)  # Every 2 seconds
            
            # Check if anyone is subscribed
            room_count = await manager.get_room_count("job_updates")
            if room_count > 0:
                # Get job updates from job manager
                updates = await job_manager.get_job_updates()
                if updates:
                    await manager.send_to_room({
                        "type": "job_updates",
                        "data": {"updates": updates},
                        "timestamp": datetime.utcnow().isoformat()
                    }, "job_updates")
                    
        except Exception as e:
            logger.error(f"Job status broadcast error: {e}")


# Event handlers for external notifications
async def notify_document_processing_start(user_id: str, document_id: str, filename: str):
    """Notify when document processing starts"""
    notification = {
        "type": "document_processing_start",
        "data": {
            "document_id": document_id,
            "filename": filename,
            "status": "processing"
        },
        "timestamp": datetime.utcnow().isoformat()
    }
    
    # Notify user
    await manager.send_to_room(notification, f"document_updates_{user_id}")
    
    # Notify admins
    await manager.send_to_room(notification, "all_document_updates")


async def notify_document_processing_complete(user_id: str, document_id: str, filename: str, success: bool, error: Optional[str] = None):
    """Notify when document processing completes"""
    notification = {
        "type": "document_processing_complete",
        "data": {
            "document_id": document_id,
            "filename": filename,
            "status": "completed" if success else "failed",
            "success": success,
            "error": error
        },
        "timestamp": datetime.utcnow().isoformat()
    }
    
    # Notify user
    await manager.send_to_room(notification, f"document_updates_{user_id}")
    
    # Notify admins
    await manager.send_to_room(notification, "all_document_updates")


async def notify_job_status_change(job_id: str, status: str, progress: Optional[float] = None, error: Optional[str] = None):
    """Notify when background job status changes"""
    notification = {
        "type": "job_status_change",
        "data": {
            "job_id": job_id,
            "status": status,
            "progress": progress,
            "error": error
        },
        "timestamp": datetime.utcnow().isoformat()
    }
    
    await manager.send_to_room(notification, "job_updates")


async def notify_system_alert(alert_type: str, severity: str, message: str, details: Optional[Dict[str, Any]] = None):
    """Send system alert to admins"""
    notification = {
        "type": "system_alert",
        "data": {
            "alert_type": alert_type,
            "severity": severity,
            "message": message,
            "details": details or {}
        },
        "timestamp": datetime.utcnow().isoformat()
    }
    
    await manager.send_to_room(notification, "admin")


async def notify_user_activity(user_id: str, activity_type: str, details: Optional[Dict[str, Any]] = None):
    """Notify about user activity"""
    notification = {
        "type": "user_activity",
        "data": {
            "user_id": user_id,
            "activity_type": activity_type,
            "details": details or {}
        },
        "timestamp": datetime.utcnow().isoformat()
    }
    
    await manager.send_to_room(notification, "admin")


# Initialize background tasks on startup
async def startup_websocket_tasks():
    """Start background tasks for WebSocket functionality"""
    # Start broadcasters
    asyncio.create_task(system_metrics_broadcaster())
    asyncio.create_task(job_status_broadcaster())
    
    # Start periodic cleanup
    from modules.websocket.websocket_manager import periodic_cleanup
    asyncio.create_task(periodic_cleanup())
    
    logger.info("WebSocket background tasks started")


# Health check endpoint
@router.get("/health")
async def websocket_health_check():
    """Check WebSocket service health"""
    total_connections = await manager.get_total_connections()
    all_connections = await manager.get_all_connections()
    
    return {
        "status": "healthy",
        "total_connections": total_connections,
        "connections": all_connections,
        "timestamp": datetime.utcnow().isoformat()
    }