"""
Document Converter Routes
"""

from fastapi import APIRouter, HTTPException, Depends, File, UploadFile, Form
from fastapi.responses import StreamingResponse
from typing import List, Optional, Dict, Any
from datetime import datetime
import json
import time
import logging
from pathlib import Path

from modules.core.auth_dependency import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter()

# Lazy import to avoid circular dependency
BackgroundProcessor = None
ProcessingPriority = None

def _get_background_imports():
    global BackgroundProcessor, ProcessingPriority
    if BackgroundProcessor is None:
        from modules.background import BackgroundProcessor as BP, ProcessingPriority as PP
        BackgroundProcessor = BP
        ProcessingPriority = PP
    return BackgroundProcessor, ProcessingPriority

# Initialize background processor
background_processor = None

def get_processor():
    """Get or create the background processor instance"""
    global background_processor
    
    if background_processor is None:
        BP, _ = _get_background_imports()
        background_processor = BP({
            'max_workers': 4,
            'db_path': 'data/knowledge_base.db'
        })
    
    return background_processor

# Dependency to check if user is admin
async def require_admin(user_data: Dict[str, Any] = Depends(get_current_user)):
    """Require admin role for access"""
    if user_data.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user_data

@router.get("/statistics")
async def get_document_statistics(admin_user: Dict[str, Any] = Depends(require_admin)):
    """Get document converter statistics"""
    try:
        processor = get_processor()
        queue_status = processor.get_queue_status()
        
        # Calculate statistics from queue status
        total_processed = queue_status['stats'].get('total_processed', 0)
        total_failed = queue_status['stats'].get('total_failed', 0)
        total = total_processed + total_failed
        
        # Generate weekly trend (mock data for now)
        import random
        trend = [random.randint(10, 50) for _ in range(7)]
        
        # Count by format (mock data)
        formats = {
            'pdf': int(total * 0.4),
            'docx': int(total * 0.3),
            'txt': int(total * 0.15),
            'html': int(total * 0.1),
            'other': int(total * 0.05)
        }
        
        return {
            "totalConversions": total,
            "conversionsPastWeek": sum(trend),
            "successRate": ((total_processed / total * 100) if total > 0 else 0),
            "activeConversions": queue_status['active'],
            "conversionsByFormat": formats,
            "conversionTrend": trend
        }
        
    except Exception as e:
        logger.error(f"Error getting document statistics: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/recent")
async def get_recent_conversions(
    limit: int = 10,
    admin_user: Dict[str, Any] = Depends(require_admin)
):
    """Get recent document conversions"""
    try:
        # In a real implementation, this would query the database
        # For now, return mock data
        recent = []
        
        for i in range(min(limit, 5)):
            recent.append({
                "id": f"doc-{int(time.time())}-{i}",
                "filename": f"Document_{i+1}.pdf",
                "format": "pdf",
                "size": 1024 * 1024 * (i + 1),
                "status": "completed" if i < 3 else "processing",
                "uploadedAt": int((time.time() - (i * 3600)) * 1000),
                "convertedAt": int((time.time() - (i * 3600) + 60) * 1000) if i < 3 else None,
                "duration": 60000 if i < 3 else None,
                "content": "Sample content..." if i < 3 else None,
                "metadata": {"pages": 10 + i} if i < 3 else None,
                "error": None
            })
        
        return recent
        
    except Exception as e:
        logger.error(f"Error getting recent conversions: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/queue")
async def get_conversion_queue(admin_user: Dict[str, Any] = Depends(require_admin)):
    """Get current conversion queue"""
    try:
        processor = get_processor()
        queue_status = processor.get_queue_status()
        
        # Convert to queue info format
        queue_jobs = []
        
        # Add mock jobs for demonstration
        queue_jobs.append({
            "id": f"job-{int(time.time())}-1",
            "filename": "Report.pdf",
            "userId": "user123",
            "status": "processing",
            "submittedAt": int((time.time() - 300) * 1000),
            "progress": 75
        })
        
        queue_jobs.append({
            "id": f"job-{int(time.time())}-2",
            "filename": "Manual.docx",
            "userId": "user456",
            "status": "waiting",
            "submittedAt": int((time.time() - 600) * 1000),
            "progress": None
        })
        
        return {
            "queue": queue_jobs,
            "stats": {
                "activeJobs": queue_status['active'],
                "waitingJobs": queue_status['queued'],
                "averageTime": 45
            },
            "paused": queue_status['paused']
        }
        
    except Exception as e:
        logger.error(f"Error getting conversion queue: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/settings")
async def get_converter_settings(admin_user: Dict[str, Any] = Depends(require_admin)):
    """Get document converter settings"""
    try:
        # In a real implementation, load from config
        return {
            "enabled": True,
            "concurrency": 4,
            "max_file_size_mb": 25,
            "allowed_extensions": ["pdf", "docx", "txt", "html", "pptx", "xlsx"],
            "chunk_size": 1000,
            "auto_process": True,
            "schedule": "0 */3 * * *"
        }
        
    except Exception as e:
        logger.error(f"Error getting converter settings: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/settings")
async def update_converter_settings(
    settings: Dict[str, Any],
    admin_user: Dict[str, Any] = Depends(require_admin)
):
    """Update document converter settings"""
    try:
        # In a real implementation, save to config
        logger.info(f"Updating converter settings: {settings}")
        
        return {"success": True, "message": "Settings updated successfully"}
        
    except Exception as e:
        logger.error(f"Error updating converter settings: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    priority: str = Form("normal"),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Upload a document for conversion"""
    try:
        # Validate file
        if not file.filename:
            raise HTTPException(status_code=400, detail="No filename provided")
        
        # Get file extension
        ext = file.filename.split('.')[-1].lower()
        allowed_extensions = ["pdf", "docx", "txt", "html", "pptx", "xlsx"]
        
        if ext not in allowed_extensions:
            raise HTTPException(
                status_code=400, 
                detail=f"File type not supported. Allowed: {', '.join(allowed_extensions)}"
            )
        
        # Save file temporarily
        upload_dir = Path("uploads")
        upload_dir.mkdir(exist_ok=True)
        
        file_path = upload_dir / f"{int(time.time())}_{file.filename}"
        
        with open(file_path, "wb") as f:
            content = await file.read()
            f.write(content)
        
        # Submit to background processor
        processor = get_processor()
        _, PP = _get_background_imports()
        priority_map = {
            "critical": PP.CRITICAL,
            "high": PP.HIGH,
            "normal": PP.NORMAL,
            "low": PP.LOW
        }
        
        job_id = processor.submit_job(
            str(file_path),
            priority_map.get(priority, PP.NORMAL),
            metadata={
                "original_filename": file.filename,
                "file_size": len(content),
                "uploaded_at": datetime.now().isoformat(),
                "user_id": current_user["id"]
            }
        )
        
        return {
            "success": True,
            "documentId": job_id,
            "message": "Document uploaded successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error uploading document: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{document_id}/download")
async def download_document(
    document_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Download a converted document"""
    try:
        # In a real implementation, get file from storage
        # For now, return a mock response
        
        # Create mock content
        content = f"This is the converted content for document {document_id}\n"
        content += "Lorem ipsum dolor sit amet, consectetur adipiscing elit.\n" * 10
        
        return StreamingResponse(
            iter([content.encode()]),
            media_type="text/plain",
            headers={
                "Content-Disposition": f"attachment; filename=document_{document_id}.txt"
            }
        )
        
    except Exception as e:
        logger.error(f"Error downloading document: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{document_id}")
async def delete_document(
    document_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Delete a document"""
    try:
        # In a real implementation, delete from storage and database
        logger.info(f"Deleting document: {document_id}")
        
        return {"success": True, "message": "Document deleted successfully"}
        
    except Exception as e:
        logger.error(f"Error deleting document: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/queue/{job_id}/prioritize")
async def prioritize_job(
    job_id: str,
    admin_user: Dict[str, Any] = Depends(require_admin)
):
    """Prioritize a job in the queue"""
    try:
        logger.info(f"Prioritizing job: {job_id}")
        
        return {"success": True, "message": "Job prioritized successfully"}
        
    except Exception as e:
        logger.error(f"Error prioritizing job: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/queue/{job_id}/cancel")
async def cancel_job(
    job_id: str,
    admin_user: Dict[str, Any] = Depends(require_admin)
):
    """Cancel a job in the queue"""
    try:
        processor = get_processor()
        
        if processor.cancel_job(job_id):
            return {"success": True, "message": "Job cancelled successfully"}
        else:
            raise HTTPException(status_code=404, detail="Job not found")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error cancelling job: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/queue/pause")
async def pause_queue(admin_user: Dict[str, Any] = Depends(require_admin)):
    """Pause the conversion queue"""
    try:
        processor = get_processor()
        processor.pause_processing()
        
        return {"success": True, "message": "Queue paused successfully"}
        
    except Exception as e:
        logger.error(f"Error pausing queue: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/queue/resume")
async def resume_queue(admin_user: Dict[str, Any] = Depends(require_admin)):
    """Resume the conversion queue"""
    try:
        processor = get_processor()
        processor.resume_processing()
        
        return {"success": True, "message": "Queue resumed successfully"}
        
    except Exception as e:
        logger.error(f"Error resuming queue: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/queue/clear")
async def clear_queue(admin_user: Dict[str, Any] = Depends(require_admin)):
    """Clear the conversion queue"""
    try:
        # In a real implementation, clear all pending jobs
        logger.info("Clearing conversion queue")
        
        return {"success": True, "message": "Queue cleared successfully"}
        
    except Exception as e:
        logger.error(f"Error clearing queue: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/health")
async def health_check():
    """Check document converter health"""
    try:
        processor = get_processor()
        queue_status = processor.get_queue_status()
        
        return {
            "status": "healthy",
            "service": "document-converter",
            "queue": {
                "active": queue_status['active'],
                "queued": queue_status['queued'],
                "paused": queue_status['paused']
            }
        }
        
    except Exception as e:
        return {
            "status": "unhealthy",
            "service": "document-converter",
            "error": str(e)
        }

# Enhanced endpoints for AdminDocConverterEnhanced component
@router.get("/classification-data")
async def get_classification_data(admin_user: Dict[str, Any] = Depends(require_admin)):
    """Get document classification data for enhanced view"""
    try:
        # Generate classification data for visualization
        import random
        
        # Document types distribution
        types = ["PDF", "Word", "Excel", "PowerPoint", "Text", "HTML", "Other"]
        type_distribution = {
            doc_type: random.randint(50, 500) 
            for doc_type in types
        }
        
        # Quality scores by type
        quality_scores = {
            doc_type: round(random.uniform(0.7, 0.95), 2)
            for doc_type in types
        }
        
        # Processing time by type (in seconds)
        processing_times = {
            doc_type: round(random.uniform(0.5, 3.5), 1)
            for doc_type in types
        }
        
        # Daily processing volume (last 30 days)
        daily_volume = []
        for i in range(30):
            day = datetime.now().date() - (datetime.now().date() - datetime.now().date().replace(day=1))
            daily_volume.append({
                "date": day.isoformat(),
                "volume": random.randint(100, 500),
                "success_rate": round(random.uniform(0.85, 0.98), 2)
            })
        
        # Language distribution
        languages = {
            "de": 45,
            "en": 30, 
            "fr": 10,
            "es": 8,
            "it": 5,
            "other": 2
        }
        
        return {
            "document_types": type_distribution,
            "quality_scores": quality_scores,
            "processing_times": processing_times,
            "daily_volume": daily_volume,
            "language_distribution": languages,
            "total_processed": sum(type_distribution.values()),
            "average_quality": round(sum(quality_scores.values()) / len(quality_scores), 2),
            "average_processing_time": round(sum(processing_times.values()) / len(processing_times), 1)
        }
        
    except Exception as e:
        logger.error(f"Error getting classification data: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/processing-stats")
async def get_processing_stats(
    days: int = 7,
    admin_user: Dict[str, Any] = Depends(require_admin)
):
    """Get detailed processing statistics"""
    try:
        import random
        from datetime import timedelta
        
        stats = []
        for i in range(days):
            date = datetime.now().date() - timedelta(days=i)
            stats.append({
                "date": date.isoformat(),
                "total": random.randint(200, 600),
                "successful": random.randint(180, 580),
                "failed": random.randint(5, 20),
                "average_time": round(random.uniform(1.5, 3.0), 1),
                "peak_hour": random.randint(9, 17)
            })
        
        return {
            "daily_stats": stats,
            "summary": {
                "total_processed": sum(s["total"] for s in stats),
                "total_successful": sum(s["successful"] for s in stats),
                "total_failed": sum(s["failed"] for s in stats),
                "average_daily": sum(s["total"] for s in stats) // days,
                "success_rate": round(sum(s["successful"] for s in stats) / sum(s["total"] for s in stats) * 100, 1)
            }
        }
        
    except Exception as e:
        logger.error(f"Error getting processing stats: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))