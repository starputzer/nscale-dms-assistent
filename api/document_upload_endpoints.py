"""
Document Upload API Endpoints
Handles document upload, conversion, and indexing for the live system
"""

from fastapi import APIRouter, HTTPException, File, UploadFile, BackgroundTasks, Depends
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from datetime import datetime
import os
import time
import uuid
from pathlib import Path
import aiofiles
import mimetypes

from modules.core.logging import LogManager
from modules.core.config import Config
from modules.doc_converter.integrated_document_processor import IntegratedDocumentProcessor
from modules.background.processor import BackgroundProcessor, ProcessingPriority
from modules.rag.optimized_rag_engine import OptimizedRAGEngine
from modules.core.auth_dependency import get_current_user, get_admin_user as require_admin

# Initialize components
logger = LogManager.setup_logging(__name__)
doc_processor = IntegratedDocumentProcessor()
background_processor = BackgroundProcessor()
rag_engine = OptimizedRAGEngine()


# Pydantic models
class DocumentInfo(BaseModel):
    id: str
    filename: str
    fileType: str
    size: int
    uploadedAt: int
    status: str
    processedChunks: Optional[int] = None
    processingTime: Optional[float] = None
    error: Optional[str] = None

class DocumentListResponse(BaseModel):
    documents: List[DocumentInfo]
    total: int

class ProcessingStatus(BaseModel):
    documentId: str
    status: str
    progress: int
    message: str
    startedAt: int
    estimatedCompletion: Optional[int] = None

# API Router
router = APIRouter()

# Supported file types
SUPPORTED_EXTENSIONS = {'.pdf', '.docx', '.doc', '.txt', '.html', '.htm', '.md', '.rtf'}
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50 MB

@router.post("/documents/upload")
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """Upload a new document for processing"""
    try:
        # Validate file
        if not file.filename:
            raise HTTPException(status_code=400, detail="No filename provided")
        
        # Check file extension
        file_ext = Path(file.filename).suffix.lower()
        if file_ext not in SUPPORTED_EXTENSIONS:
            raise HTTPException(
                status_code=400, 
                detail=f"Unsupported file type. Supported types: {', '.join(SUPPORTED_EXTENSIONS)}"
            )
        
        # Check file size
        file_size = 0
        temp_file = Path(f"/tmp/{uuid.uuid4()}_{file.filename}")
        
        try:
            # Save file temporarily and check size
            async with aiofiles.open(temp_file, 'wb') as f:
                while chunk := await file.read(1024 * 1024):  # Read in 1MB chunks
                    file_size += len(chunk)
                    if file_size > MAX_FILE_SIZE:
                        raise HTTPException(
                            status_code=413,
                            detail=f"File too large. Maximum size: {MAX_FILE_SIZE / 1024 / 1024}MB"
                        )
                    await f.write(chunk)
            
            # Generate document ID
            doc_id = str(uuid.uuid4())
            
            # Create permanent storage path
            upload_dir = Path(Config.APP_DIR) / "data" / "uploads" / doc_id
            upload_dir.mkdir(parents=True, exist_ok=True)
            
            # Move file to permanent location
            permanent_path = upload_dir / file.filename
            temp_file.rename(permanent_path)
            
            # Create document record
            document_info = {
                'id': doc_id,
                'filename': file.filename,
                'file_type': file_ext,
                'size': file_size,
                'uploaded_at': int(time.time() * 1000),
                'uploaded_by': current_user['id'],
                'status': 'pending',
                'path': str(permanent_path)
            }
            
            # Save document metadata
            metadata_path = upload_dir / 'metadata.json'
            import json
            with open(metadata_path, 'w') as f:
                json.dump(document_info, f, indent=2)
            
            # Submit for background processing
            job_id = background_processor.submit_job(
                str(permanent_path),
                ProcessingPriority.HIGH,
                metadata={
                    'document_id': doc_id,
                    'user_id': current_user['id'],
                    'auto_index': True
                }
            )
            
            logger.info(f"Document uploaded: {doc_id} - {file.filename} (Job: {job_id})")
            
            return {
                "success": True,
                "documentId": doc_id,
                "jobId": job_id,
                "message": "Document uploaded successfully and queued for processing"
            }
            
        finally:
            # Clean up temp file if it still exists
            if temp_file.exists():
                temp_file.unlink()
                
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error uploading document: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/documents", response_model=DocumentListResponse)
async def list_documents(
    skip: int = 0,
    limit: int = 20,
    status: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """List all documents for the current user"""
    try:
        documents = []
        uploads_dir = Path(Config.APP_DIR) / "data" / "uploads"
        
        if uploads_dir.exists():
            for doc_dir in uploads_dir.iterdir():
                if doc_dir.is_dir():
                    metadata_path = doc_dir / 'metadata.json'
                    if metadata_path.exists():
                        import json
                        with open(metadata_path, 'r') as f:
                            doc_info = json.load(f)
                            
                        # Filter by user
                        if doc_info.get('uploaded_by') == current_user['id']:
                            # Filter by status if specified
                            if status is None or doc_info.get('status') == status:
                                documents.append(DocumentInfo(
                                    id=doc_info['id'],
                                    filename=doc_info['filename'],
                                    fileType=doc_info['file_type'],
                                    size=doc_info['size'],
                                    uploadedAt=doc_info['uploaded_at'],
                                    status=doc_info['status'],
                                    processedChunks=doc_info.get('processed_chunks'),
                                    processingTime=doc_info.get('processing_time'),
                                    error=doc_info.get('error')
                                ))
        
        # Sort by upload date (newest first)
        documents.sort(key=lambda x: x.uploadedAt, reverse=True)
        
        # Apply pagination
        total = len(documents)
        documents = documents[skip:skip + limit]
        
        return DocumentListResponse(documents=documents, total=total)
        
    except Exception as e:
        logger.error(f"Error listing documents: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/documents/{document_id}")
async def get_document(
    document_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get document details"""
    try:
        doc_dir = Path(Config.APP_DIR) / "data" / "uploads" / document_id
        metadata_path = doc_dir / 'metadata.json'
        
        if not metadata_path.exists():
            raise HTTPException(status_code=404, detail="Document not found")
        
        import json
        with open(metadata_path, 'r') as f:
            doc_info = json.load(f)
        
        # Check ownership
        if doc_info.get('uploaded_by') != current_user['id']:
            raise HTTPException(status_code=403, detail="Access denied")
        
        return doc_info
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting document: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/documents/{document_id}")
async def delete_document(
    document_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete a document"""
    try:
        doc_dir = Path(Config.APP_DIR) / "data" / "uploads" / document_id
        metadata_path = doc_dir / 'metadata.json'
        
        if not metadata_path.exists():
            raise HTTPException(status_code=404, detail="Document not found")
        
        import json
        with open(metadata_path, 'r') as f:
            doc_info = json.load(f)
        
        # Check ownership
        if doc_info.get('uploaded_by') != current_user['id']:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Remove from RAG index
        rag_engine.remove_document(document_id)
        
        # Delete files
        import shutil
        shutil.rmtree(doc_dir)
        
        logger.info(f"Document deleted: {document_id}")
        
        return {"success": True, "message": "Document deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting document: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/documents/reindex")
async def trigger_reindex(
    background_tasks: BackgroundTasks,
    document_ids: Optional[List[str]] = None,
    current_user: dict = Depends(get_current_user)
):
    """Trigger reindexing of documents"""
    try:
        if document_ids:
            # Reindex specific documents
            for doc_id in document_ids:
                # Verify ownership
                doc_dir = Path(Config.APP_DIR) / "data" / "uploads" / doc_id
                metadata_path = doc_dir / 'metadata.json'
                
                if metadata_path.exists():
                    import json
                    with open(metadata_path, 'r') as f:
                        doc_info = json.load(f)
                    
                    if doc_info.get('uploaded_by') == current_user['id']:
                        # Submit for reprocessing
                        job_id = background_processor.submit_job(
                            doc_info['path'],
                            ProcessingPriority.NORMAL,
                            metadata={
                                'document_id': doc_id,
                                'user_id': current_user['id'],
                                'reindex': True
                            }
                        )
                        logger.info(f"Document queued for reindexing: {doc_id}")
        else:
            # Reindex all documents for user
            uploads_dir = Path(Config.APP_DIR) / "data" / "uploads"
            job_ids = []
            
            if uploads_dir.exists():
                for doc_dir in uploads_dir.iterdir():
                    if doc_dir.is_dir():
                        metadata_path = doc_dir / 'metadata.json'
                        if metadata_path.exists():
                            import json
                            with open(metadata_path, 'r') as f:
                                doc_info = json.load(f)
                            
                            if doc_info.get('uploaded_by') == current_user['id']:
                                job_id = background_processor.submit_job(
                                    doc_info['path'],
                                    ProcessingPriority.LOW,
                                    metadata={
                                        'document_id': doc_info['id'],
                                        'user_id': current_user['id'],
                                        'reindex': True
                                    }
                                )
                                job_ids.append(job_id)
            
            logger.info(f"Queued {len(job_ids)} documents for reindexing")
        
        return {
            "success": True,
            "message": "Reindexing triggered successfully"
        }
        
    except Exception as e:
        logger.error(f"Error triggering reindex: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/documents/{document_id}/status")
async def get_processing_status(
    document_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get document processing status"""
    try:
        # Check document ownership
        doc_dir = Path(Config.APP_DIR) / "data" / "uploads" / document_id
        metadata_path = doc_dir / 'metadata.json'
        
        if not metadata_path.exists():
            raise HTTPException(status_code=404, detail="Document not found")
        
        import json
        with open(metadata_path, 'r') as f:
            doc_info = json.load(f)
        
        if doc_info.get('uploaded_by') != current_user['id']:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Get job status from background processor
        jobs = background_processor.get_queue_status()
        
        # Find job for this document
        for job in jobs.get('jobs', []):
            if job.get('metadata', {}).get('document_id') == document_id:
                return ProcessingStatus(
                    documentId=document_id,
                    status=job['status'],
                    progress=job.get('progress', 0),
                    message=job.get('message', ''),
                    startedAt=int(job['created_at'] * 1000),
                    estimatedCompletion=int((job['created_at'] + 300) * 1000)  # Estimate 5 minutes
                )
        
        # If no active job, return document status
        return ProcessingStatus(
            documentId=document_id,
            status=doc_info['status'],
            progress=100 if doc_info['status'] == 'completed' else 0,
            message='Processing complete' if doc_info['status'] == 'completed' else 'Waiting',
            startedAt=doc_info['uploaded_at']
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting processing status: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# WebSocket endpoint for real-time status updates
from fastapi import WebSocket, WebSocketDisconnect
import asyncio

@router.websocket("/ws/documents/status")
async def websocket_status(websocket: WebSocket):
    """WebSocket for real-time document processing status"""
    await websocket.accept()
    try:
        while True:
            # Send status updates every 2 seconds
            await asyncio.sleep(2)
            
            # Get current processing status
            queue_status = background_processor.get_queue_status()
            
            await websocket.send_json({
                "type": "status_update",
                "data": {
                    "active": queue_status['active'],
                    "queued": queue_status['queued'],
                    "completed": queue_status['stats'].get('total_processed', 0),
                    "failed": queue_status['stats'].get('total_failed', 0)
                }
            })
            
    except WebSocketDisconnect:
        logger.info("WebSocket client disconnected")
    except Exception as e:
        logger.error(f"WebSocket error: {str(e)}")
        await websocket.close()

# Health check
@router.get("/documents/health")
async def health_check():
    """Check document upload service health"""
    try:
        # Check if upload directory is accessible
        uploads_dir = Path(Config.APP_DIR) / "data" / "uploads"
        uploads_dir.mkdir(parents=True, exist_ok=True)
        
        # Check background processor
        queue_status = background_processor.get_queue_status()
        
        return {
            "status": "healthy",
            "service": "document-upload",
            "uploads_directory": str(uploads_dir),
            "queue_active": queue_status['active'],
            "queue_size": queue_status['queued']
        }
        
    except Exception as e:
        return {
            "status": "unhealthy",
            "service": "document-upload",
            "error": str(e)
        }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8006)