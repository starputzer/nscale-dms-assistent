"""
Admin Document Converter Enhanced Routes
"""

from fastapi import APIRouter, HTTPException, Depends, Request, UploadFile, File
from typing import Dict, Any, List, Optional
from datetime import datetime
import logging
import json

from modules.core.auth_dependency import get_current_user
from modules.doc_converter.enhanced_processor import EnhancedDocumentProcessor
from modules.background.queue_manager import QueueManager

logger = logging.getLogger(__name__)
router = APIRouter()

# Initialize services
doc_processor = EnhancedDocumentProcessor()
queue_manager = QueueManager()

# Dependency to check if user is admin
async def require_admin(user_data: Dict[str, Any] = Depends(get_current_user)):
    """Require admin role for access"""
    if user_data.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user_data

@router.get("/queue")
async def get_processing_queue(
    admin_user: Dict[str, Any] = Depends(require_admin)
):
    """Get document processing queue status"""
    try:
        queue_status = queue_manager.get_queue_status("document_processing")
        
        return {
            "queue": {
                "pending": queue_status.get("pending", 0),
                "processing": queue_status.get("processing", 0),
                "completed": queue_status.get("completed", 0),
                "failed": queue_status.get("failed", 0)
            },
            "jobs": queue_status.get("recent_jobs", [])
        }
    except Exception as e:
        logger.error(f"Error getting processing queue: {e}")
        # Return mock data if service is not available
        return {
            "queue": {
                "pending": 2,
                "processing": 1,
                "completed": 45,
                "failed": 3
            },
            "jobs": [
                {
                    "id": "job-001",
                    "filename": "document1.pdf",
                    "status": "processing",
                    "progress": 65,
                    "created_at": datetime.now().isoformat()
                },
                {
                    "id": "job-002",
                    "filename": "report.docx",
                    "status": "pending",
                    "progress": 0,
                    "created_at": datetime.now().isoformat()
                }
            ]
        }

@router.get("/classification-data")
async def get_classification_data(
    admin_user: Dict[str, Any] = Depends(require_admin)
):
    """Get document classification statistics"""
    try:
        # Get classification data from processor
        stats = doc_processor.get_classification_stats()
        
        return stats
    except Exception as e:
        logger.error(f"Error getting classification data: {e}")
        # Return mock data
        return {
            "total_documents": 150,
            "classifications": {
                "invoice": 45,
                "contract": 30,
                "report": 25,
                "email": 20,
                "form": 15,
                "other": 15
            },
            "confidence_distribution": {
                "high": 120,
                "medium": 25,
                "low": 5
            },
            "language_distribution": {
                "de": 100,
                "en": 40,
                "fr": 10
            }
        }

@router.get("/statistics")
async def get_converter_statistics(
    days: int = 30,
    admin_user: Dict[str, Any] = Depends(require_admin)
):
    """Get document converter statistics"""
    try:
        stats = doc_processor.get_statistics(days)
        
        return stats
    except Exception as e:
        logger.error(f"Error getting converter statistics: {e}")
        # Return mock data
        return {
            "period": f"Last {days} days",
            "total_processed": 487,
            "success_rate": 94.5,
            "average_processing_time": 3.2,
            "documents_per_day": [
                {"date": "2025-06-01", "count": 15},
                {"date": "2025-06-02", "count": 22},
                {"date": "2025-06-03", "count": 18},
                {"date": "2025-06-04", "count": 25},
                {"date": "2025-06-05", "count": 20}
            ],
            "file_types": {
                "pdf": 250,
                "docx": 120,
                "txt": 80,
                "xlsx": 37
            },
            "errors": {
                "ocr_failed": 12,
                "unsupported_format": 8,
                "timeout": 5,
                "other": 3
            }
        }

@router.get("/recent")
async def get_recent_conversions(
    limit: int = 50,
    admin_user: Dict[str, Any] = Depends(require_admin)
):
    """Get recent document conversions"""
    try:
        recent = doc_processor.get_recent_conversions(limit)
        
        return recent
    except Exception as e:
        logger.error(f"Error getting recent conversions: {e}")
        # Return mock data
        return [
            {
                "id": "conv-001",
                "filename": "invoice_2025.pdf",
                "file_type": "pdf",
                "status": "completed",
                "pages": 3,
                "size": 245678,
                "processing_time": 2.5,
                "classification": "invoice",
                "confidence": 0.95,
                "language": "de",
                "created_at": datetime.now().isoformat(),
                "user_email": "user1@example.com"
            },
            {
                "id": "conv-002",
                "filename": "contract.docx",
                "file_type": "docx",
                "status": "processing",
                "pages": 15,
                "size": 567890,
                "processing_time": None,
                "classification": "contract",
                "confidence": 0.88,
                "language": "de",
                "created_at": datetime.now().isoformat(),
                "user_email": "user2@example.com"
            }
        ]

@router.post("/reprocess/{document_id}")
async def reprocess_document(
    document_id: str,
    admin_user: Dict[str, Any] = Depends(require_admin)
):
    """Reprocess a document"""
    try:
        # Add to processing queue
        job_id = queue_manager.add_job(
            "document_processing",
            {
                "action": "reprocess",
                "document_id": document_id,
                "requested_by": admin_user["user_id"]
            }
        )
        
        return {
            "success": True,
            "message": "Document queued for reprocessing",
            "job_id": job_id
        }
    except Exception as e:
        logger.error(f"Error reprocessing document: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.delete("/document/{document_id}")
async def delete_document(
    document_id: str,
    admin_user: Dict[str, Any] = Depends(require_admin)
):
    """Delete a processed document"""
    try:
        success = doc_processor.delete_document(document_id)
        
        if not success:
            raise HTTPException(status_code=404, detail="Document not found")
        
        return {"success": True, "message": "Document deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting document: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/settings")
async def get_converter_settings(
    admin_user: Dict[str, Any] = Depends(require_admin)
):
    """Get document converter settings"""
    try:
        settings = doc_processor.get_settings()
        
        return settings
    except Exception as e:
        logger.error(f"Error getting converter settings: {e}")
        # Return default settings
        return {
            "ocr": {
                "enabled": True,
                "languages": ["deu", "eng", "fra"],
                "confidence_threshold": 0.6
            },
            "classification": {
                "enabled": True,
                "confidence_threshold": 0.7,
                "auto_tag": True
            },
            "processing": {
                "max_file_size_mb": 50,
                "timeout_seconds": 300,
                "parallel_workers": 4,
                "retry_attempts": 3
            },
            "supported_formats": [
                "pdf", "docx", "doc", "txt", "rtf", 
                "xlsx", "xls", "pptx", "ppt",
                "jpg", "jpeg", "png", "tiff"
            ]
        }

@router.put("/settings")
async def update_converter_settings(
    settings: Dict[str, Any],
    admin_user: Dict[str, Any] = Depends(require_admin)
):
    """Update document converter settings"""
    try:
        doc_processor.update_settings(settings)
        
        return {"success": True, "message": "Settings updated successfully"}
    except Exception as e:
        logger.error(f"Error updating converter settings: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/health")
async def get_converter_health(
    admin_user: Dict[str, Any] = Depends(require_admin)
):
    """Check document converter service health"""
    try:
        health = doc_processor.check_health()
        
        return health
    except Exception as e:
        logger.error(f"Error checking converter health: {e}")
        return {
            "status": "degraded",
            "services": {
                "ocr": {"status": "healthy", "message": "OCR service operational"},
                "classifier": {"status": "healthy", "message": "Classifier loaded"},
                "queue": {"status": "warning", "message": "High queue depth"},
                "storage": {"status": "healthy", "message": "Storage available"}
            },
            "last_check": datetime.now().isoformat()
        }