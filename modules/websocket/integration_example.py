"""
Example of WebSocket integration with existing endpoints
Shows how to send real-time notifications when events occur
"""

from modules.websocket import (
    notify_document_processing_start,
    notify_document_processing_complete,
    notify_job_status_change,
    notify_system_alert,
    notify_user_activity
)


# Example 1: Document Upload Integration
async def handle_document_upload(file, user_id: str, document_id: str):
    """Example of integrating WebSocket notifications with document upload"""
    
    # Notify that processing has started
    await notify_document_processing_start(
        user_id=user_id,
        document_id=document_id,
        filename=file.filename
    )
    
    try:
        # Your document processing logic here
        # ... process the document ...
        result = await process_document(file)
        
        # Notify success
        await notify_document_processing_complete(
            user_id=user_id,
            document_id=document_id,
            filename=file.filename,
            success=True
        )
        
        return result
        
    except Exception as e:
        # Notify failure
        await notify_document_processing_complete(
            user_id=user_id,
            document_id=document_id,
            filename=file.filename,
            success=False,
            error=str(e)
        )
        raise


# Example 2: Background Job Integration
async def start_background_task(job_id: str, task_name: str):
    """Example of integrating WebSocket notifications with background jobs"""
    
    # Notify job started
    await notify_job_status_change(
        job_id=job_id,
        status="running",
        progress=0.0
    )
    
    try:
        # Simulate progress updates
        for i in range(0, 101, 10):
            await asyncio.sleep(1)  # Simulate work
            
            # Send progress update
            await notify_job_status_change(
                job_id=job_id,
                status="running",
                progress=float(i)
            )
        
        # Notify completion
        await notify_job_status_change(
            job_id=job_id,
            status="completed",
            progress=100.0
        )
        
    except Exception as e:
        # Notify failure
        await notify_job_status_change(
            job_id=job_id,
            status="failed",
            error=str(e)
        )


# Example 3: System Monitoring Integration
async def check_system_health():
    """Example of sending system alerts via WebSocket"""
    
    # Check disk space
    disk_usage = get_disk_usage()
    if disk_usage > 90:
        await notify_system_alert(
            alert_type="disk_space",
            severity="critical",
            message=f"Disk usage critical: {disk_usage}%",
            details={
                "usage_percent": disk_usage,
                "threshold": 90
            }
        )
    
    # Check memory
    memory_usage = get_memory_usage()
    if memory_usage > 85:
        await notify_system_alert(
            alert_type="memory",
            severity="warning",
            message=f"High memory usage: {memory_usage}%",
            details={
                "usage_percent": memory_usage,
                "threshold": 85
            }
        )


# Example 4: User Activity Tracking
async def track_user_login(user_id: str, email: str):
    """Example of tracking user activity via WebSocket"""
    
    await notify_user_activity(
        user_id=user_id,
        activity_type="login",
        details={
            "email": email,
            "ip_address": get_client_ip(),
            "user_agent": get_user_agent()
        }
    )


# Example 5: Real-time Chat Updates
async def send_chat_message_with_notification(session_id: str, user_id: str, message: str):
    """Example of sending real-time chat notifications"""
    
    # Save message to database
    message_id = save_message_to_db(session_id, user_id, message)
    
    # Send WebSocket notification to all users in the chat
    from modules.websocket import manager
    
    await manager.send_to_room(
        {
            "type": "new_message",
            "data": {
                "session_id": session_id,
                "message_id": message_id,
                "user_id": user_id,
                "content": message,
                "timestamp": datetime.utcnow().isoformat()
            }
        },
        room=f"chat_{session_id}"
    )


# Example 6: Admin Dashboard Updates
async def update_admin_statistics():
    """Example of pushing real-time statistics to admin dashboard"""
    
    from modules.websocket import manager
    
    # Get latest statistics
    stats = {
        "total_users": get_total_users(),
        "active_sessions": get_active_sessions(),
        "documents_processed": get_documents_processed_today(),
        "system_load": get_system_load()
    }
    
    # Send to all admins
    await manager.send_to_room(
        {
            "type": "statistics_update",
            "data": stats,
            "timestamp": datetime.utcnow().isoformat()
        },
        room="admin"
    )


# Integration with FastAPI endpoints
from fastapi import APIRouter, UploadFile, File, Depends
from modules.core.auth_dependency import get_current_user

router = APIRouter()

@router.post("/upload-with-notifications")
async def upload_file_with_ws(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """Example endpoint that sends WebSocket notifications"""
    
    document_id = str(uuid.uuid4())
    
    # This will send real-time notifications
    result = await handle_document_upload(
        file=file,
        user_id=current_user["user_id"],
        document_id=document_id
    )
    
    return {"document_id": document_id, "result": result}