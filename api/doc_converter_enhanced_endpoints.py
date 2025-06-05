"""
Enhanced Document Converter API Endpoints
Advanced document conversion with intelligent classification and RAG optimization
"""

from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form, BackgroundTasks
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
import hashlib
import json
import os
import random
from pathlib import Path

from modules.core.logging import LogManager
from modules.core.auth_dependency import get_current_user, get_admin_user as require_admin
from modules.core.db import DBManager
from modules.background.job_manager import BackgroundJobManager

# Initialize components
logger = LogManager.setup_logging(__name__)

db_manager = DBManager()
job_manager = BackgroundJobManager()

router = APIRouter()

# Pydantic models
class DocumentStatistics(BaseModel):
    totalDocuments: int
    classifiedDocuments: int
    ragProcessed: int
    avgProcessingTime: float

class DocumentType(BaseModel):
    type_id: str
    name: str
    count: int
    percentage: float

class ContentCategory(BaseModel):
    category_id: str
    name: str
    icon: str
    count: int
    color: str

class ProcessingStrategy(BaseModel):
    strategy_id: str
    name: str
    count: int
    avgProcessingTime: float
    successRate: float

class ClassificationData(BaseModel):
    documentTypes: Dict[str, int]
    contentCategories: Dict[str, ContentCategory]
    processingStrategies: Dict[str, ProcessingStrategy]

class QueueItem(BaseModel):
    id: str
    filename: str
    uploadTime: datetime
    fileSize: int
    status: str
    priority: int
    estimatedTime: int
    category: Optional[str] = None
    classification: Optional[Dict[str, Any]] = None

class DocumentConversion(BaseModel):
    id: str
    filename: str
    timestamp: datetime
    type: str
    category: str
    processingTime: float
    status: str
    fileSize: int
    fileHash: str
    classification: Dict[str, Any]
    metadata: Optional[Dict[str, Any]] = None

class ConverterSettings(BaseModel):
    maxFileSize: int
    concurrentJobs: int
    autoClassification: bool
    ragProcessing: bool
    allowedFormats: List[str]
    minQualityScore: float
    retryFailed: bool

class ProcessingResult(BaseModel):
    success: bool
    fileId: str
    message: str
    classification: Optional[Dict[str, Any]] = None
    processingTime: float

# Helper functions
def calculate_file_hash(file_path: str) -> str:
    """Calculate SHA-256 hash of a file"""
    sha256_hash = hashlib.sha256()
    with open(file_path, "rb") as f:
        for byte_block in iter(lambda: f.read(4096), b""):
            sha256_hash.update(byte_block)
    return sha256_hash.hexdigest()

def classify_document(file_path: str, filename: str) -> Dict[str, Any]:
    """Classify document based on content and structure"""
    # In a real implementation, this would use ML models
    extension = Path(filename).suffix.lower()
    
    # Simulate classification
    doc_types = ["technical", "legal", "financial", "general", "medical", "educational"]
    categories = ["manual", "report", "contract", "invoice", "presentation", "spreadsheet"]
    structures = ["structured", "semi-structured", "unstructured"]
    languages = ["de", "en", "fr", "es"]
    strategies = ["standard", "ocr_enhanced", "table_extraction", "nlp_enhanced"]
    
    return {
        "type": random.choice(doc_types),
        "category": random.choice(categories),
        "structure": random.choice(structures),
        "language": random.choice(languages),
        "strategy": random.choice(strategies),
        "confidence": round(random.uniform(0.7, 0.99), 2),
        "qualityScore": round(random.uniform(0.6, 1.0), 2)
    }

# Endpoints
@router.get("/statistics", response_model=DocumentStatistics)
async def get_statistics(user: Dict[str, Any] = Depends(require_admin)):
    """Get document converter statistics"""
    try:
        with db_manager.get_session() as conn:
            cursor = conn.cursor()
        
        # Get total documents
        cursor.execute("SELECT COUNT(*) FROM documents")
        total_documents = cursor.fetchone()[0]
        
        # Get classified documents (those with classification data)
        cursor.execute("SELECT COUNT(*) FROM documents WHERE metadata LIKE '%classification%'")
        classified_documents = cursor.fetchone()[0]
        
        # Get RAG processed documents
        cursor.execute("SELECT COUNT(*) FROM documents WHERE metadata LIKE '%rag_processed%true%'")
        rag_processed = cursor.fetchone()[0]
        
        # Calculate average processing time (mock for now)
        avg_processing_time = 3.7  # seconds
        
        return DocumentStatistics(
            totalDocuments=total_documents,
            classifiedDocuments=classified_documents,
            ragProcessed=rag_processed,
            avgProcessingTime=avg_processing_time
        )
    except Exception as e:
        logger.error(f"Error getting statistics: {e}")
        # Return default values on error
        return DocumentStatistics(
            totalDocuments=0,
            classifiedDocuments=0,
            ragProcessed=0,
            avgProcessingTime=0
        )

@router.get("/classification-data", response_model=ClassificationData)
async def get_classification_data(user: Dict[str, Any] = Depends(require_admin)):
    """Get document classification overview data"""
    try:
        # In a real implementation, this would aggregate from database
        document_types = {
            "technical": 156,
            "legal": 89,
            "financial": 123,
            "general": 234,
            "medical": 45,
            "educational": 78
        }
        
        content_categories = {
            "manual": ContentCategory(
                category_id="manual",
                name="Handbücher",
                icon="fas fa-book",
                count=145,
                color="#3b82f6"
            ),
            "report": ContentCategory(
                category_id="report",
                name="Berichte",
                icon="fas fa-file-alt",
                count=189,
                color="#10b981"
            ),
            "contract": ContentCategory(
                category_id="contract",
                name="Verträge",
                icon="fas fa-file-contract",
                count=78,
                color="#f59e0b"
            ),
            "invoice": ContentCategory(
                category_id="invoice",
                name="Rechnungen",
                icon="fas fa-file-invoice",
                count=234,
                color="#ef4444"
            ),
            "presentation": ContentCategory(
                category_id="presentation",
                name="Präsentationen",
                icon="fas fa-file-powerpoint",
                count=56,
                color="#8b5cf6"
            ),
            "spreadsheet": ContentCategory(
                category_id="spreadsheet",
                name="Tabellen",
                icon="fas fa-file-excel",
                count=23,
                color="#06b6d4"
            )
        }
        
        processing_strategies = {
            "standard": ProcessingStrategy(
                strategy_id="standard",
                name="Standard",
                count=456,
                avgProcessingTime=2.3,
                successRate=0.95
            ),
            "ocr_enhanced": ProcessingStrategy(
                strategy_id="ocr_enhanced",
                name="OCR-erweitert",
                count=123,
                avgProcessingTime=5.8,
                successRate=0.88
            ),
            "table_extraction": ProcessingStrategy(
                strategy_id="table_extraction",
                name="Tabellen-Extraktion",
                count=89,
                avgProcessingTime=4.2,
                successRate=0.92
            ),
            "nlp_enhanced": ProcessingStrategy(
                strategy_id="nlp_enhanced",
                name="NLP-erweitert",
                count=57,
                avgProcessingTime=3.5,
                successRate=0.94
            )
        }
        
        return ClassificationData(
            documentTypes=document_types,
            contentCategories=content_categories,
            processingStrategies=processing_strategies
        )
    except Exception as e:
        logger.error(f"Error getting classification data: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/queue", response_model=List[QueueItem])
async def get_queue_items(user: Dict[str, Any] = Depends(require_admin)):
    """Get current processing queue"""
    try:
        # Get jobs from background job manager
        jobs = job_manager.get_all_jobs()
        
        queue_items = []
        for job in jobs:
            if job.job_type == "document_conversion":
                queue_items.append(QueueItem(
                    id=job.id,
                    filename=job.data.get("filename", "Unknown"),
                    uploadTime=job.created_at,
                    fileSize=job.data.get("file_size", 0),
                    status=job.status,
                    priority=job.data.get("priority", 5),
                    estimatedTime=job.data.get("estimated_time", 60),
                    category=job.data.get("category"),
                    classification=job.data.get("classification")
                ))
        
        return queue_items
    except Exception as e:
        logger.error(f"Error getting queue items: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/recent", response_model=List[DocumentConversion])
async def get_recent_conversions(
    limit: int = 100,
    offset: int = 0,
    user: Dict[str, Any] = Depends(require_admin)
):
    """Get recent document conversions"""
    try:
        with db_manager.get_session() as conn:
            cursor = conn.cursor()
        
        # Get recent documents
        cursor.execute("""
            SELECT id, filename, created_at, file_size, metadata 
            FROM documents 
            ORDER BY created_at DESC 
            LIMIT ? OFFSET ?
        """, (limit, offset))
        
        conversions = []
        for row in cursor.fetchall():
            doc_id, filename, created_at, file_size, metadata_str = row
            
            # Parse metadata
            try:
                metadata = json.loads(metadata_str) if metadata_str else {}
            except:
                metadata = {}
            
            # Extract classification info
            classification = metadata.get("classification", {})
            if not classification:
                classification = classify_document("", filename)
            
            conversions.append(DocumentConversion(
                id=str(doc_id),
                filename=filename,
                timestamp=datetime.fromtimestamp(created_at),
                type=classification.get("type", "unknown"),
                category=classification.get("category", "general"),
                processingTime=metadata.get("processing_time", 0),
                status=metadata.get("status", "success"),
                fileSize=file_size,
                fileHash=metadata.get("file_hash", ""),
                classification=classification,
                metadata=metadata
            ))
        
        return conversions
    except Exception as e:
        logger.error(f"Error getting recent conversions: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/settings", response_model=ConverterSettings)
async def get_settings(user: Dict[str, Any] = Depends(require_admin)):
    """Get converter settings"""
    try:
        # Load from config file or database
        settings_file = "data/converter_settings.json"
        if os.path.exists(settings_file):
            with open(settings_file, 'r') as f:
                settings = json.load(f)
        else:
            # Default settings
            settings = {
                "maxFileSize": 50,
                "concurrentJobs": 3,
                "autoClassification": True,
                "ragProcessing": True,
                "allowedFormats": ['pdf', 'docx', 'txt', 'html', 'md', 'xlsx', 'pptx'],
                "minQualityScore": 0.7,
                "retryFailed": True
            }
        
        return ConverterSettings(**settings)
    except Exception as e:
        logger.error(f"Error getting settings: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/settings")
async def update_settings(settings: ConverterSettings, user: Dict[str, Any] = Depends(require_admin)):
    """Update converter settings"""
    try:
        # Save to config file
        settings_file = "data/converter_settings.json"
        os.makedirs("data", exist_ok=True)
        
        with open(settings_file, 'w') as f:
            json.dump(settings.dict(), f, indent=2)
        
        return {"success": True, "message": "Einstellungen wurden gespeichert"}
    except Exception as e:
        logger.error(f"Error updating settings: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/process", response_model=List[ProcessingResult])
async def process_documents(
    background_tasks: BackgroundTasks,
    files: List[UploadFile] = File(...),
    options: str = Form("{}"),
    user: Dict[str, Any] = Depends(require_admin)
):
    """Process uploaded documents"""
    try:
        # Parse options
        try:
            upload_options = json.loads(options)
        except:
            upload_options = {}
        
        results = []
        upload_dir = Path("data/uploads")
        upload_dir.mkdir(parents=True, exist_ok=True)
        
        for file in files:
            # Save file
            file_path = upload_dir / f"{datetime.now().timestamp()}_{file.filename}"
            
            with open(file_path, "wb") as f:
                content = await file.read()
                f.write(content)
            
            # Calculate hash
            file_hash = calculate_file_hash(str(file_path))
            
            # Classify document
            classification = classify_document(str(file_path), file.filename)
            
            # Create background job
            job_data = {
                "filename": file.filename,
                "file_path": str(file_path),
                "file_size": file_path.stat().st_size,
                "file_hash": file_hash,
                "classification": classification,
                "options": upload_options,
                "priority": upload_options.get("priority", 5),
                "estimated_time": int(file_path.stat().st_size / 1024 / 10)  # Rough estimate
            }
            
            job = job_manager.create_job(
                job_type="document_conversion",
                data=job_data
            )
            
            # Add to background tasks
            background_tasks.add_task(process_document_task, job.id)
            
            results.append(ProcessingResult(
                success=True,
                fileId=job.id,
                message=f"Dokument '{file.filename}' wurde zur Verarbeitung hinzugefügt",
                classification=classification,
                processingTime=0  # Will be updated when processing completes
            ))
        
        return results
    except Exception as e:
        logger.error(f"Error processing documents: {e}")
        raise HTTPException(status_code=500, detail=str(e))

async def process_document_task(job_id: str):
    """Background task to process a document"""
    try:
        job = job_manager.get_job(job_id)
        if not job:
            return
        
        # Update job status
        job_manager.update_job_status(job_id, "processing")
        
        # Simulate processing
        import asyncio
        await asyncio.sleep(random.uniform(2, 5))
        
        # In a real implementation, this would:
        # 1. Extract text from document
        # 2. Process with NLP
        # 3. Generate embeddings
        # 4. Store in vector database
        # 5. Update document metadata
        
        # Mark as completed
        job_manager.update_job_status(job_id, "completed", progress=100)
        
    except Exception as e:
        logger.error(f"Error in document processing task: {e}")
        job_manager.update_job_status(job_id, "failed", error=str(e))

@router.get("/document/{document_id}")
async def get_document_details(document_id: str, user: Dict[str, Any] = Depends(require_admin)):
    """Get detailed information about a specific document"""
    try:
        with db_manager.get_session() as conn:
            cursor = conn.cursor()
        
        cursor.execute("""
            SELECT id, filename, created_at, file_size, metadata 
            FROM documents 
            WHERE id = ?
        """, (document_id,))
        
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Dokument nicht gefunden")
        
        doc_id, filename, created_at, file_size, metadata_str = row
        
        # Parse metadata
        try:
            metadata = json.loads(metadata_str) if metadata_str else {}
        except:
            metadata = {}
        
        # Get or generate classification
        classification = metadata.get("classification", {})
        if not classification:
            classification = classify_document("", filename)
        
        return {
            "id": str(doc_id),
            "filename": filename,
            "fileSize": file_size,
            "fileHash": metadata.get("file_hash", ""),
            "timestamp": datetime.fromtimestamp(created_at).isoformat(),
            "classification": classification,
            "metadata": metadata,
            "extractedText": metadata.get("extracted_text", ""),
            "processingLog": metadata.get("processing_log", [])
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting document details: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/retry/{document_id}")
async def retry_conversion(
    document_id: str,
    background_tasks: BackgroundTasks,
    user: Dict[str, Any] = Depends(require_admin)
):
    """Retry a failed document conversion"""
    try:
        # In a real implementation, this would:
        # 1. Find the failed job
        # 2. Reset its status
        # 3. Re-queue for processing
        
        # For now, create a new job
        job = job_manager.create_job(
            job_type="document_conversion",
            data={
                "document_id": document_id,
                "retry": True,
                "priority": 8  # Higher priority for retries
            }
        )
        
        background_tasks.add_task(process_document_task, job.id)
        
        return {
            "success": True,
            "message": "Dokumentkonvertierung wurde erneut gestartet",
            "jobId": job.id
        }
    except Exception as e:
        logger.error(f"Error retrying conversion: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/queue/pause")
async def pause_queue(user: Dict[str, Any] = Depends(require_admin)):
    """Pause document processing queue"""
    try:
        job_manager.pause_processing()
        return {"success": True, "message": "Warteschlange wurde pausiert"}
    except Exception as e:
        logger.error(f"Error pausing queue: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/queue/resume")
async def resume_queue(user: Dict[str, Any] = Depends(require_admin)):
    """Resume document processing queue"""
    try:
        job_manager.resume_processing()
        return {"success": True, "message": "Warteschlange wurde fortgesetzt"}
    except Exception as e:
        logger.error(f"Error resuming queue: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/queue/{job_id}")
async def remove_from_queue(job_id: str, user: Dict[str, Any] = Depends(require_admin)):
    """Remove a job from the processing queue"""
    try:
        success = job_manager.cancel_job(job_id)
        if success:
            return {"success": True, "message": "Job wurde aus der Warteschlange entfernt"}
        else:
            raise HTTPException(status_code=404, detail="Job nicht gefunden")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error removing job from queue: {e}")
        raise HTTPException(status_code=500, detail=str(e))