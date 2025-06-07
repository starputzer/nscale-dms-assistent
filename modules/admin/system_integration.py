from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from typing import Dict, Any, List, Optional
import logging
from datetime import datetime

# Import all the new modules
from modules.core.email_service import email_service
from modules.background.job_retry_manager import job_manager, JobStatus
from modules.core.hot_reload_config import config_manager
from modules.doc_converter.workflow_engine import workflow_engine
from modules.core.auth_dependency import get_admin_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/admin/system", tags=["admin-system"])

# Email Service Endpoints

@router.get("/email/status")
async def get_email_service_status(admin_user: dict = Depends(get_admin_user)):
    """Get email service status and configuration"""
    is_configured = bool(email_service.smtp_host and email_service.smtp_user)
    
    return {
        "configured": is_configured,
        "smtp_host": email_service.smtp_host,
        "smtp_port": email_service.smtp_port,
        "from_email": email_service.from_email,
        "use_tls": email_service.use_tls,
        "connection_test": email_service.test_connection() if is_configured else False
    }

@router.post("/email/test")
async def test_email_service(test_email: str, admin_user: dict = Depends(get_admin_user)):
    """Send a test email"""
    if not email_service.test_connection():
        raise HTTPException(status_code=503, detail="Email service not configured or unreachable")
    
    success = await email_service.send_email(
        to_email=test_email,
        subject="Test Email from nscale Assist",
        body="<h2>Test Email</h2><p>This is a test email from nscale Assist admin panel.</p>"
    )
    
    return {"success": success, "message": "Test email sent" if success else "Failed to send email"}

@router.post("/email/configure")
async def configure_email_service(config: Dict[str, Any], admin_user: dict = Depends(get_admin_user)):
    """Update email service configuration"""
    # Update configuration
    email_service.smtp_host = config.get('smtp_host', email_service.smtp_host)
    email_service.smtp_port = config.get('smtp_port', email_service.smtp_port)
    email_service.smtp_user = config.get('smtp_user', email_service.smtp_user)
    email_service.smtp_pass = config.get('smtp_pass', email_service.smtp_pass)
    email_service.from_email = config.get('from_email', email_service.from_email)
    email_service.use_tls = config.get('use_tls', email_service.use_tls)
    
    # Test connection
    connection_ok = email_service.test_connection()
    
    # Persist to config
    await config_manager.set('email.smtp_host', email_service.smtp_host)
    await config_manager.set('email.smtp_port', email_service.smtp_port)
    await config_manager.set('email.from_email', email_service.from_email)
    await config_manager.set('email.use_tls', email_service.use_tls)
    
    return {
        "success": True,
        "connection_test": connection_ok,
        "message": "Email configuration updated"
    }

# Background Jobs Endpoints

@router.get("/jobs")
async def get_background_jobs(
    status: Optional[str] = None,
    job_type: Optional[str] = None,
    limit: int = 100,
    admin_user: dict = Depends(get_admin_user)
):
    """Get background jobs"""
    job_status = JobStatus(status) if status else None
    jobs = await job_manager.get_jobs(status=job_status, job_type=job_type, limit=limit)
    
    return {
        "jobs": [job.to_dict() for job in jobs],
        "total": len(jobs)
    }

@router.get("/jobs/statistics")
async def get_job_statistics(admin_user: dict = Depends(get_admin_user)):
    """Get job processing statistics"""
    stats = await job_manager.get_statistics()
    return stats

@router.post("/jobs/{job_id}/cancel")
async def cancel_job(job_id: str, admin_user: dict = Depends(get_admin_user)):
    """Cancel a background job"""
    success = await job_manager.cancel_job(job_id)
    if not success:
        raise HTTPException(status_code=404, detail="Job not found or cannot be cancelled")
    
    return {"success": True, "message": "Job cancelled"}

@router.post("/jobs/{job_id}/retry")
async def retry_job(job_id: str, admin_user: dict = Depends(get_admin_user)):
    """Retry a failed job"""
    success = await job_manager.retry_job(job_id)
    if not success:
        raise HTTPException(status_code=404, detail="Job not found or cannot be retried")
    
    return {"success": True, "message": "Job queued for retry"}

@router.post("/jobs/create")
async def create_job(
    job_data: Dict[str, Any],
    background_tasks: BackgroundTasks,
    admin_user: dict = Depends(get_admin_user)
):
    """Create a new background job"""
    job = await job_manager.create_job(
        job_type=job_data['type'],
        payload=job_data.get('payload', {}),
        user_id=admin_user['id'],
        priority=job_data.get('priority', 5)
    )
    
    # Start processing if not already running
    if not job_manager.is_running:
        background_tasks.add_task(job_manager.start_processing)
    
    return {"job": job.to_dict()}

# Hot Reload Configuration Endpoints

@router.get("/config")
async def get_configuration(
    key_path: Optional[str] = None,
    admin_user: dict = Depends(get_admin_user)
):
    """Get configuration values"""
    if key_path:
        value = config_manager.get(key_path)
        return {"key": key_path, "value": value}
    else:
        return {"config": config_manager.config}

@router.put("/config")
async def update_configuration(
    config_update: Dict[str, Any],
    admin_user: dict = Depends(get_admin_user)
):
    """Update configuration with hot reload"""
    key_path = config_update['key']
    value = config_update['value']
    persist = config_update.get('persist', True)
    
    await config_manager.set(key_path, value, persist)
    
    return {
        "success": True,
        "key": key_path,
        "value": value,
        "message": "Configuration updated and will be hot-reloaded"
    }

@router.get("/config/history")
async def get_config_history(
    key_path: Optional[str] = None,
    admin_user: dict = Depends(get_admin_user)
):
    """Get configuration change history"""
    history = config_manager.get_change_history(key_path)
    
    return {
        "history": [
            {
                "timestamp": change.timestamp.isoformat(),
                "key_path": change.key_path,
                "old_value": change.old_value,
                "new_value": change.new_value
            }
            for change in history
        ],
        "total": len(history)
    }

@router.post("/config/validate")
async def validate_configuration(
    schema: Dict[str, Any],
    admin_user: dict = Depends(get_admin_user)
):
    """Validate configuration against schema"""
    errors = config_manager.validate_config(schema)
    
    return {
        "valid": len(errors) == 0,
        "errors": errors
    }

# Workflow Engine Endpoints

@router.get("/workflows")
async def get_workflows(admin_user: dict = Depends(get_admin_user)):
    """Get all document processing workflows"""
    workflows = []
    for workflow_id, workflow in workflow_engine.workflows.items():
        workflows.append({
            "id": workflow.id,
            "name": workflow.name,
            "description": workflow.description,
            "steps_count": len(workflow.steps),
            "created_at": workflow.created_at.isoformat(),
            "updated_at": workflow.updated_at.isoformat(),
            "tags": workflow.tags
        })
    
    return {"workflows": workflows, "total": len(workflows)}

@router.post("/workflows")
async def create_workflow(
    workflow_data: Dict[str, Any],
    admin_user: dict = Depends(get_admin_user)
):
    """Create a new workflow"""
    workflow = workflow_engine.create_workflow(
        name=workflow_data['name'],
        description=workflow_data['description'],
        steps=workflow_data['steps'],
        entry_point=workflow_data['entry_point']
    )
    
    return {
        "success": True,
        "workflow": workflow_engine.export_workflow(workflow.id)
    }

@router.get("/workflows/{workflow_id}")
async def get_workflow(
    workflow_id: str,
    admin_user: dict = Depends(get_admin_user)
):
    """Get workflow details"""
    try:
        workflow_data = workflow_engine.export_workflow(workflow_id)
        return workflow_data
    except ValueError:
        raise HTTPException(status_code=404, detail="Workflow not found")

@router.post("/workflows/{workflow_id}/execute")
async def execute_workflow(
    workflow_id: str,
    context: Dict[str, Any],
    background_tasks: BackgroundTasks,
    admin_user: dict = Depends(get_admin_user)
):
    """Execute a workflow"""
    if workflow_id not in workflow_engine.workflows:
        raise HTTPException(status_code=404, detail="Workflow not found")
    
    # Add user context
    context['user_id'] = admin_user['id']
    context['workflow_id'] = workflow_id
    
    # Execute in background
    background_tasks.add_task(
        workflow_engine.execute_workflow,
        workflow_id,
        context
    )
    
    return {
        "success": True,
        "message": "Workflow execution started",
        "workflow_id": workflow_id
    }

@router.get("/workflows/executions")
async def get_workflow_executions(
    workflow_id: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = 100,
    admin_user: dict = Depends(get_admin_user)
):
    """Get workflow executions"""
    executions = []
    
    for exec_id, execution in workflow_engine.executions.items():
        if workflow_id and execution.workflow_id != workflow_id:
            continue
        if status and execution.status.value != status:
            continue
        
        executions.append({
            "id": execution.id,
            "workflow_id": execution.workflow_id,
            "status": execution.status.value,
            "started_at": execution.started_at.isoformat(),
            "completed_at": execution.completed_at.isoformat() if execution.completed_at else None,
            "current_step": execution.current_step,
            "errors_count": len(execution.errors)
        })
        
        if len(executions) >= limit:
            break
    
    return {"executions": executions, "total": len(executions)}

# System Integration Status

@router.get("/integration-status")
async def get_integration_status(admin_user: dict = Depends(get_admin_user)):
    """Get status of all system integrations"""
    return {
        "email_service": {
            "enabled": bool(email_service.smtp_host),
            "configured": email_service.test_connection(),
            "provider": email_service.smtp_host
        },
        "job_manager": {
            "enabled": True,
            "running": job_manager.is_running,
            "stats": await job_manager.get_statistics()
        },
        "config_manager": {
            "enabled": True,
            "watching": config_manager.observer.is_alive() if hasattr(config_manager, 'observer') else False,
            "config_files": len(config_manager.config_files),
            "callbacks_registered": len(config_manager.change_callbacks)
        },
        "workflow_engine": {
            "enabled": True,
            "workflows": len(workflow_engine.workflows),
            "handlers": len(workflow_engine.handlers),
            "active_executions": sum(1 for e in workflow_engine.executions.values() 
                                     if e.status == StepStatus.RUNNING)
        }
    }

# Register sample handlers for background jobs

async def sample_email_job_handler(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Sample job handler for sending emails"""
    recipients = payload.get('recipients', [])
    subject = payload.get('subject', 'Test Email')
    body = payload.get('body', 'This is a test email.')
    
    success_count = 0
    for recipient in recipients:
        if await email_service.send_email(recipient, subject, body):
            success_count += 1
    
    return {
        'sent': success_count,
        'total': len(recipients),
        'success_rate': (success_count / len(recipients) * 100) if recipients else 0
    }

async def sample_cleanup_job_handler(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Sample job handler for cleanup tasks"""
    import shutil
    from pathlib import Path
    
    temp_dir = payload.get('temp_dir', '/tmp/nscale-assist')
    max_age_days = payload.get('max_age_days', 7)
    
    cleaned_files = 0
    cleaned_size = 0
    
    if Path(temp_dir).exists():
        cutoff_time = datetime.now().timestamp() - (max_age_days * 24 * 60 * 60)
        
        for file_path in Path(temp_dir).rglob('*'):
            if file_path.is_file() and file_path.stat().st_mtime < cutoff_time:
                file_size = file_path.stat().st_size
                file_path.unlink()
                cleaned_files += 1
                cleaned_size += file_size
    
    return {
        'cleaned_files': cleaned_files,
        'cleaned_size_mb': round(cleaned_size / (1024 * 1024), 2)
    }

# Register handlers on module load
job_manager.register_handler('send_email', sample_email_job_handler)
job_manager.register_handler('cleanup_temp', sample_cleanup_job_handler)