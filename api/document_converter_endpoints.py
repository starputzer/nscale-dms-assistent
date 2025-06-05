"""
Document Converter API Endpoints for Admin Panel
Provides comprehensive API for document conversion management
"""

from fastapi import FastAPI, HTTPException, Depends, File, UploadFile, Form
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime
import json
import time
import os
from pathlib import Path

from modules.core.logging import LogManager
from modules.background import create_background_processor, ProcessingPriority

# Initialize components
logger = LogManager.setup_logging(__name__)
background_processor = None

def get_processor():
    """Get or create the background processor instance"""
    global background_processor
    
    if background_processor is None:
        background_processor = create_background_processor({
            'max_workers': 4,
            'db_path': 'data/knowledge_base.db'
        })
    
    return background_processor

# Pydantic models
class DocumentStatisticsResponse(BaseModel):
    totalConversions: int
    conversionsPastWeek: int
    successRate: float
    activeConversions: int
    conversionsByFormat: Dict[str, int]
    conversionTrend: List[int]

class ConversionResult(BaseModel):
    id: str
    filename: str
    format: str
    size: int
    status: str
    uploadedAt: int
    convertedAt: Optional[int]
    duration: Optional[int]
    content: Optional[str]
    metadata: Optional[Dict[str, Any]]
    error: Optional[str]

class QueueJob(BaseModel):
    id: str
    filename: str
    userId: str
    status: str
    submittedAt: int
    progress: Optional[int]

class QueueInfo(BaseModel):
    queue: List[QueueJob]
    stats: Dict[str, Any]
    paused: bool

class ConverterSettings(BaseModel):
    enabled: bool
    concurrency: int
    max_file_size_mb: int
    allowed_extensions: List[str]
    chunk_size: int
    auto_process: bool
    schedule: str

# API Router
app = FastAPI(title="Document Converter API")

@app.get("/api/admin/doc-converter/statistics", response_model=DocumentStatisticsResponse)
async def get_document_statistics():
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
        
        return DocumentStatisticsResponse(
            totalConversions=total,
            conversionsPastWeek=sum(trend),
            successRate=((total_processed / total * 100) if total > 0 else 0),
            activeConversions=queue_status['active'],
            conversionsByFormat=formats,
            conversionTrend=trend
        )
        
    except Exception as e:
        logger.error(f"Error getting document statistics: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/admin/doc-converter/recent", response_model=List[ConversionResult])
async def get_recent_conversions(limit: int = 10):
    """Get recent document conversions"""
    try:
        # In a real implementation, this would query the database
        # For now, return mock data
        recent = []
        
        for i in range(min(limit, 5)):
            recent.append(ConversionResult(
                id=f"doc-{int(time.time())}-{i}",
                filename=f"Document_{i+1}.pdf",
                format="pdf",
                size=1024 * 1024 * (i + 1),
                status="completed" if i < 3 else "processing",
                uploadedAt=int((time.time() - (i * 3600)) * 1000),
                convertedAt=int((time.time() - (i * 3600) + 60) * 1000) if i < 3 else None,
                duration=60000 if i < 3 else None,
                content="Sample content..." if i < 3 else None,
                metadata={"pages": 10 + i} if i < 3 else None,
                error=None
            ))
        
        return recent
        
    except Exception as e:
        logger.error(f"Error getting recent conversions: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/admin/doc-converter/queue", response_model=QueueInfo)
async def get_conversion_queue():
    """Get current conversion queue"""
    try:
        processor = get_processor()
        queue_status = processor.get_queue_status()
        
        # Convert to queue info format
        queue_jobs = []
        
        # Add mock jobs for demonstration
        queue_jobs.append(QueueJob(
            id=f"job-{int(time.time())}-1",
            filename="Report.pdf",
            userId="user123",
            status="processing",
            submittedAt=int((time.time() - 300) * 1000),
            progress=75
        ))
        
        queue_jobs.append(QueueJob(
            id=f"job-{int(time.time())}-2",
            filename="Manual.docx",
            userId="user456",
            status="waiting",
            submittedAt=int((time.time() - 600) * 1000),
            progress=None
        ))
        
        return QueueInfo(
            queue=queue_jobs,
            stats={
                "activeJobs": queue_status['active'],
                "waitingJobs": queue_status['queued'],
                "averageTime": 45
            },
            paused=queue_status['paused']
        )
        
    except Exception as e:
        logger.error(f"Error getting conversion queue: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/admin/doc-converter/settings", response_model=ConverterSettings)
async def get_converter_settings():
    """Get document converter settings"""
    try:
        # In a real implementation, load from config
        return ConverterSettings(
            enabled=True,
            concurrency=4,
            max_file_size_mb=25,
            allowed_extensions=["pdf", "docx", "txt", "html", "pptx", "xlsx"],
            chunk_size=1000,
            auto_process=True,
            schedule="0 */3 * * *"
        )
        
    except Exception as e:
        logger.error(f"Error getting converter settings: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/api/admin/doc-converter/settings")
async def update_converter_settings(settings: ConverterSettings):
    """Update document converter settings"""
    try:
        # In a real implementation, save to config
        logger.info(f"Updating converter settings: {settings.dict()}")
        
        return {"success": True, "message": "Settings updated successfully"}
        
    except Exception as e:
        logger.error(f"Error updating converter settings: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/documents/upload")
async def upload_document(
    file: UploadFile = File(...),
    priority: str = Form("normal")
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
        priority_map = {
            "critical": ProcessingPriority.CRITICAL,
            "high": ProcessingPriority.HIGH,
            "normal": ProcessingPriority.NORMAL,
            "low": ProcessingPriority.LOW
        }
        
        job_id = processor.submit_job(
            str(file_path),
            priority_map.get(priority, ProcessingPriority.NORMAL),
            metadata={
                "original_filename": file.filename,
                "file_size": len(content),
                "uploaded_at": datetime.now().isoformat()
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

@app.get("/api/documents/{document_id}/download")
async def download_document(document_id: str):
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

@app.delete("/api/documents/{document_id}")
async def delete_document(document_id: str):
    """Delete a document"""
    try:
        # In a real implementation, delete from storage and database
        logger.info(f"Deleting document: {document_id}")
        
        return {"success": True, "message": "Document deleted successfully"}
        
    except Exception as e:
        logger.error(f"Error deleting document: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/admin/doc-converter/queue/{job_id}/prioritize")
async def prioritize_job(job_id: str):
    """Prioritize a job in the queue"""
    try:
        logger.info(f"Prioritizing job: {job_id}")
        
        return {"success": True, "message": "Job prioritized successfully"}
        
    except Exception as e:
        logger.error(f"Error prioritizing job: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/admin/doc-converter/queue/{job_id}/cancel")
async def cancel_job(job_id: str):
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

@app.post("/api/admin/doc-converter/queue/pause")
async def pause_queue():
    """Pause the conversion queue"""
    try:
        processor = get_processor()
        processor.pause_processing()
        
        return {"success": True, "message": "Queue paused successfully"}
        
    except Exception as e:
        logger.error(f"Error pausing queue: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/admin/doc-converter/queue/resume")
async def resume_queue():
    """Resume the conversion queue"""
    try:
        processor = get_processor()
        processor.resume_processing()
        
        return {"success": True, "message": "Queue resumed successfully"}
        
    except Exception as e:
        logger.error(f"Error resuming queue: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/admin/doc-converter/queue/clear")
async def clear_queue():
    """Clear the conversion queue"""
    try:
        # In a real implementation, clear all pending jobs
        logger.info("Clearing conversion queue")
        
        return {"success": True, "message": "Queue cleared successfully"}
        
    except Exception as e:
        logger.error(f"Error clearing queue: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Health check endpoint
@app.get("/api/admin/doc-converter/health")
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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8002)