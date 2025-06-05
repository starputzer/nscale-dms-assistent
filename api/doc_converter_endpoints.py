"""
Document Converter API Endpoints
Provides endpoints for document conversion statistics and management
"""

from fastapi import APIRouter, HTTPException, Depends, File, UploadFile, BackgroundTasks, Request
from fastapi.responses import JSONResponse
from typing import List, Dict, Any, Optional
from datetime import datetime
import os
import uuid
from pathlib import Path

from modules.core.logging import LogManager
from modules.core.auth_dependency import get_admin_user as require_admin, get_current_user
from modules.doc_converter.integrated_document_processor import IntegratedDocumentProcessor
from modules.doc_converter.database import get_db
from modules.retrieval.document_store import DocumentStore
from modules.auth.user_model import UserManager

# Initialize user manager
user_manager = UserManager()

async def get_current_user(request: Request) -> Dict[str, Any]:
    """Get current user from auth header"""
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    token = auth_header.split("Bearer ")[1]
    user_data = user_manager.verify_token(token)
    
    if not user_data:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    
    return user_data

logger = LogManager.setup_logging(__name__)
router = APIRouter()

# Initialize components
doc_processor = IntegratedDocumentProcessor()
doc_store = DocumentStore()
db = get_db()

@router.get("/statistics")
async def get_statistics(current_user=Depends(get_current_user)):
    """Get document converter statistics"""
    try:
        # Get statistics from database
        db_stats = db.get_statistics()
        
        # Get document store statistics
        total_documents = len(doc_store.documents)
        
        # Get metadata statistics
        classification_data = db.get_classification_data()
        classified_documents = sum(classification_data['contentCategories'].get(cat, {}).get('documents', 0) 
                                 for cat in classification_data['contentCategories'])
        
        return {
            "totalDocuments": total_documents + db_stats['total_processed'],
            "classifiedDocuments": classified_documents,
            "ragProcessed": total_documents,  # All documents in doc_store are RAG processed
            "avgProcessingTime": round(db_stats['avg_processing_time'], 2)
        }
    except Exception as e:
        logger.error(f"Error getting statistics: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/classification")
async def get_classification_data(current_user=Depends(get_current_user)):
    """Get document classification data"""
    try:
        # Get classification data from database
        return db.get_classification_data()
    except Exception as e:
        logger.error(f"Error getting classification data: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/queue")
async def get_queue_items(current_user=Depends(get_current_user)):
    """Get current conversion queue"""
    queue_items = db.get_queue_items()
    return {
        "items": queue_items,
        "total": len(queue_items),
        "paused": False
    }

@router.get("/recent")
async def get_recent_conversions(
    limit: int = 10,
    current_user=Depends(get_current_user)
):
    """Get recent document conversions"""
    conversions = db.get_recent_conversions(limit)
    return {
        "conversions": conversions,
        "total": len(conversions)
    }

@router.post("/upload")
async def upload_documents(
    background_tasks: BackgroundTasks,
    files: List[UploadFile] = File(...),
    current_user=Depends(get_current_user)
):
    """Upload documents for conversion"""
    uploaded_files = []
    
    try:
        upload_dir = Path("/opt/nscale-assist/data/uploads")
        upload_dir.mkdir(parents=True, exist_ok=True)
        
        for file in files:
            # Generate unique filename
            file_id = str(uuid.uuid4())
            file_extension = Path(file.filename).suffix
            unique_filename = f"{file_id}{file_extension}"
            file_path = upload_dir / unique_filename
            
            # Save file
            content = await file.read()
            with open(file_path, "wb") as f:
                f.write(content)
            
            # Add to queue
            queue_item = {
                "id": file_id,
                "filename": file.filename,
                "path": str(file_path),
                "type": file_extension.replace(".", ""),
                "size": len(content),
                "status": "pending",
                "progress": 0,
                "created_at": datetime.now().isoformat(),
                "user_id": current_user.get("id")
            }
            
            # Add to database
            db.add_to_queue(queue_item)
            uploaded_files.append(queue_item)
            
            # Schedule background processing
            background_tasks.add_task(process_document, file_id, str(file_path))
        
        return {
            "success": True,
            "message": f"{len(uploaded_files)} Dokumente zur Warteschlange hinzugefügt",
            "files": uploaded_files
        }
    except Exception as e:
        logger.error(f"Error uploading documents: {e}")
        raise HTTPException(status_code=500, detail=str(e))

async def process_document(file_id: str, file_path: str):
    """Background task to process uploaded document"""
    try:
        # Get queue item from database
        queue_items = db.get_queue_items()
        queue_item = next((item for item in queue_items if item["id"] == file_id), None)
        if not queue_item:
            logger.error(f"Queue item {file_id} not found")
            return
        
        # Update status in database
        db.update_queue_item(file_id, {
            "status": "processing",
            "started_at": datetime.now().isoformat()
        })
        
        # Process document with IntegratedDocumentProcessor
        start_time = datetime.now()
        result = doc_processor.process_document(file_path)
        
        # Add document to DocumentStore
        if 'content' in result and result['content']:
            # Create a Document object for the document store
            from modules.retrieval.document_store import Document
            doc = Document(
                text=result['content'],
                filename=result.get('filename', os.path.basename(file_path)),
                metadata=result.get('metadata', {})
            )
            
            # Process the document (chunking)
            doc.process(use_semantic_chunking=True)
            
            # Add to document store
            doc_store.documents[result.get('id', file_id)] = doc
            doc_store.chunks.extend(doc.chunks)
            
            logger.info(f"Document {file_id} added to document store with {len(doc.chunks)} chunks")
        
        # Calculate processing time
        processing_time = (datetime.now() - start_time).total_seconds()
        
        # Prepare result data
        result_data = {
            "chunks": len(doc.chunks) if 'doc' in locals() else 0,
            "content_length": len(result.get("content", "")),
            "metadata": result.get("metadata", {}),
            "doc_store_id": result.get('id', file_id)
        }
        
        # Update queue item in database
        db.update_queue_item(file_id, {
            "status": "completed",
            "progress": 100,
            "completed_at": datetime.now().isoformat()
        })
        
        # Add to history
        history_item = {
            "id": queue_item["id"],
            "filename": queue_item["filename"],
            "filepath": queue_item.get("path", queue_item.get("filepath", "")),  # Support both 'path' and 'filepath'
            "file_type": queue_item.get("type", ""),
            "file_size": queue_item.get("size", 0),
            "status": "completed",
            "processing_time": processing_time,
            "created_at": queue_item.get("created_at"),
            "completed_at": datetime.now().isoformat(),
            "user_id": queue_item.get("user_id"),
            "result": result_data
        }
        db.add_to_history(history_item)
        
        # Remove from queue
        db.remove_from_queue(file_id)
        
        # Save document metadata
        if 'doc' in locals():
            db.save_document_metadata({
                "doc_id": result.get('id', file_id),
                "filename": result.get('filename', os.path.basename(file_path)),
                "file_type": result.get('metadata', {}).get('file_type', queue_item.get("type", "")),
                "file_size": queue_item.get("size", 0),
                "file_hash": result.get('metadata', {}).get('file_hash'),
                "content_hash": result.get('metadata', {}).get('content_hash'),
                "category": result.get('metadata', {}).get('category', 'general'),
                "classification": result.get('metadata', {}).get('classification', {}),
                "processing_strategy": result.get('metadata', {}).get('processing_strategy', 'standard'),
                "confidence_score": result.get('metadata', {}).get('confidence_score'),
                "language": result.get('metadata', {}).get('language', 'de'),
                "chunks_count": len(doc.chunks),
                "doc_store_id": result.get('id', file_id)
            })
        
        logger.info(f"Document {file_id} processed successfully in {processing_time:.2f}s")
        
    except Exception as e:
        import traceback
        logger.error(f"Error processing document {file_id}: {e}")
        logger.error(f"Traceback: {traceback.format_exc()}")
        
        # Update queue item with error
        if 'queue_item' in locals() and queue_item:
            # Update in database
            db.update_queue_item(file_id, {
                "status": "failed",
                "error": str(e),
                "completed_at": datetime.now().isoformat()
            })
            
            # Add to history
            history_item = {
                "id": queue_item["id"],
                "filename": queue_item["filename"],
                "filepath": queue_item.get("path", queue_item.get("filepath", "")),
                "file_type": queue_item.get("type", ""),
                "file_size": queue_item.get("size", 0),
                "status": "failed",
                "error": str(e),
                "created_at": queue_item.get("created_at"),
                "completed_at": datetime.now().isoformat(),
                "user_id": queue_item.get("user_id"),
                "processing_time": (datetime.now() - start_time).total_seconds() if 'start_time' in locals() else 0
            }
            db.add_to_history(history_item)
            
            # Remove from queue
            db.remove_from_queue(file_id)

@router.delete("/queue/{item_id}")
async def remove_from_queue(
    item_id: str,
    current_user=Depends(get_current_user)
):
    """Remove item from conversion queue"""
    # Remove from database
    if not db.remove_from_queue(item_id):
        raise HTTPException(status_code=404, detail="Queue item not found")
    
    return {
        "success": True,
        "message": "Item removed from queue"
    }

@router.post("/queue/pause")
async def pause_queue(user: Dict[str, Any] = Depends(require_admin)):
    """Pause document conversion queue"""
    # In production, this would pause background workers
    return {
        "success": True,
        "message": "Queue paused",
        "paused": True
    }

@router.post("/queue/resume")
async def resume_queue(user: Dict[str, Any] = Depends(require_admin)):
    """Resume document conversion queue"""
    # In production, this would resume background workers
    return {
        "success": True,
        "message": "Queue resumed",
        "paused": False
    }

@router.get("/settings")
async def get_converter_settings(current_user=Depends(get_current_user)):
    """Get document converter settings"""
    return {
        "autoClassification": True,
        "ocrEnabled": True,
        "languageDetection": True,
        "maxFileSize": 50 * 1024 * 1024,  # 50MB
        "allowedFormats": [
            ".pdf", ".docx", ".doc", ".xlsx", ".xls",
            ".pptx", ".ppt", ".txt", ".html", ".md"
        ],
        "processingThreads": 2,
        "chunkSize": 1000,
        "overlapSize": 200
    }

@router.put("/settings")
async def update_converter_settings(
    settings: Dict[str, Any],
    user: Dict[str, Any] = Depends(require_admin)
):
    """Update document converter settings"""
    # In production, save to database/config
    return {
        "success": True,
        "message": "Settings updated",
        "settings": settings
    }