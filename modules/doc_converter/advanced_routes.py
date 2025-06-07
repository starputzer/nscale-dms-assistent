"""
Advanced document processing routes for the Document Converter module.
Provides endpoints for document analysis, OCR status, and processing statistics.
"""

from fastapi import APIRouter, HTTPException, Depends, File, UploadFile
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
import random
from pydantic import BaseModel

from ..core.auth_dependency import get_current_user

router = APIRouter(tags=["advanced-documents"])


class DocumentAnalysisRequest(BaseModel):
    """Request model for document analysis"""
    document_id: Optional[str] = None
    analysis_type: Optional[str] = "full"
    extract_entities: Optional[bool] = True
    detect_language: Optional[bool] = True


class ProcessingStats(BaseModel):
    """Document processing statistics"""
    total_processed: int
    successful: int
    failed: int
    average_processing_time: float
    processing_by_type: Dict[str, int]
    last_24h_activity: List[Dict[str, Any]]


class ExtractionPattern(BaseModel):
    """Text extraction pattern configuration"""
    pattern_id: str
    name: str
    regex: str
    description: str
    category: str
    enabled: bool
    match_count: int


class OCRStatus(BaseModel):
    """OCR processing status information"""
    total_documents: int
    ocr_enabled: bool
    ocr_queue_size: int
    processing_rate: float
    supported_languages: List[str]
    recent_ocr_jobs: List[Dict[str, Any]]


class DocumentTemplate(BaseModel):
    """Document template configuration"""
    template_id: str
    name: str
    description: str
    file_type: str
    fields: List[Dict[str, str]]
    created_at: datetime
    usage_count: int


@router.get("/processing-stats", response_model=ProcessingStats)
async def get_processing_stats(current_user: dict = Depends(get_current_user)):
    """
    Get document processing statistics including success rates,
    processing times, and activity over the last 24 hours.
    """
    try:
        # Generate mock statistics
        now = datetime.now()
        last_24h_activity = []
        
        for i in range(24):
            hour = now - timedelta(hours=i)
            last_24h_activity.append({
                "hour": hour.isoformat(),
                "processed": random.randint(10, 50),
                "successful": random.randint(8, 45),
                "failed": random.randint(0, 5)
            })
        
        stats = ProcessingStats(
            total_processed=random.randint(1000, 5000),
            successful=random.randint(900, 4500),
            failed=random.randint(50, 200),
            average_processing_time=round(random.uniform(2.5, 5.5), 2),
            processing_by_type={
                "pdf": random.randint(400, 2000),
                "docx": random.randint(300, 1500),
                "txt": random.randint(200, 1000),
                "image": random.randint(100, 500)
            },
            last_24h_activity=last_24h_activity
        )
        
        return stats
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve processing statistics: {str(e)}"
        )


@router.get("/extraction-patterns", response_model=List[ExtractionPattern])
async def get_extraction_patterns(
    category: Optional[str] = None,
    enabled_only: bool = True,
    current_user: dict = Depends(get_current_user)
):
    """
    Get configured text extraction patterns used for document analysis.
    Optionally filter by category and enabled status.
    """
    try:
        # Mock extraction patterns
        patterns = [
            ExtractionPattern(
                pattern_id="pat_001",
                name="Email Addresses",
                regex=r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}",
                description="Extract email addresses from documents",
                category="contact",
                enabled=True,
                match_count=random.randint(100, 1000)
            ),
            ExtractionPattern(
                pattern_id="pat_002",
                name="Phone Numbers",
                regex=r"\+?[0-9]{1,3}[-.\s]?\(?[0-9]{1,4}\)?[-.\s]?[0-9]{1,4}[-.\s]?[0-9]{1,9}",
                description="Extract phone numbers in various formats",
                category="contact",
                enabled=True,
                match_count=random.randint(50, 500)
            ),
            ExtractionPattern(
                pattern_id="pat_003",
                name="Invoice Numbers",
                regex=r"INV-\d{4,8}",
                description="Extract invoice numbers",
                category="financial",
                enabled=True,
                match_count=random.randint(200, 800)
            ),
            ExtractionPattern(
                pattern_id="pat_004",
                name="Date Patterns",
                regex=r"\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}",
                description="Extract dates in various formats",
                category="temporal",
                enabled=True,
                match_count=random.randint(300, 1500)
            ),
            ExtractionPattern(
                pattern_id="pat_005",
                name="Currency Amounts",
                regex=r"[€$£]\s?\d+(?:,\d{3})*(?:\.\d{2})?",
                description="Extract currency amounts",
                category="financial",
                enabled=False,
                match_count=random.randint(100, 600)
            )
        ]
        
        # Apply filters
        if category:
            patterns = [p for p in patterns if p.category == category]
        if enabled_only:
            patterns = [p for p in patterns if p.enabled]
            
        return patterns
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve extraction patterns: {str(e)}"
        )


@router.get("/ocr-status", response_model=OCRStatus)
async def get_ocr_status(current_user: dict = Depends(get_current_user)):
    """
    Get the current status of OCR processing including queue size,
    processing rate, and recent job information.
    """
    try:
        # Generate mock OCR status
        recent_jobs = []
        now = datetime.now()
        
        for i in range(5):
            job_time = now - timedelta(minutes=i * 10)
            recent_jobs.append({
                "job_id": f"ocr_{1000 + i}",
                "document_name": f"scan_{i + 1}.pdf",
                "status": random.choice(["completed", "processing", "queued"]),
                "pages": random.randint(1, 20),
                "started_at": job_time.isoformat(),
                "completion_time": round(random.uniform(5, 30), 1)
            })
        
        status = OCRStatus(
            total_documents=random.randint(100, 500),
            ocr_enabled=True,
            ocr_queue_size=random.randint(0, 10),
            processing_rate=round(random.uniform(2.0, 5.0), 2),
            supported_languages=["de", "en", "fr", "es", "it"],
            recent_ocr_jobs=recent_jobs
        )
        
        return status
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve OCR status: {str(e)}"
        )


@router.get("/templates", response_model=List[DocumentTemplate])
async def get_document_templates(
    file_type: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """
    Get available document templates that can be used for
    document creation and analysis.
    """
    try:
        # Mock document templates
        base_date = datetime.now() - timedelta(days=30)
        
        templates = [
            DocumentTemplate(
                template_id="tpl_001",
                name="Standard Invoice",
                description="Template for standard business invoices",
                file_type="pdf",
                fields=[
                    {"name": "invoice_number", "type": "string"},
                    {"name": "date", "type": "date"},
                    {"name": "total_amount", "type": "currency"},
                    {"name": "customer_name", "type": "string"}
                ],
                created_at=base_date,
                usage_count=random.randint(50, 200)
            ),
            DocumentTemplate(
                template_id="tpl_002",
                name="Contract Template",
                description="Standard contract template with signature fields",
                file_type="docx",
                fields=[
                    {"name": "party_a", "type": "string"},
                    {"name": "party_b", "type": "string"},
                    {"name": "contract_date", "type": "date"},
                    {"name": "terms", "type": "text"}
                ],
                created_at=base_date + timedelta(days=5),
                usage_count=random.randint(30, 100)
            ),
            DocumentTemplate(
                template_id="tpl_003",
                name="Meeting Minutes",
                description="Template for meeting minutes and notes",
                file_type="docx",
                fields=[
                    {"name": "meeting_date", "type": "date"},
                    {"name": "attendees", "type": "list"},
                    {"name": "agenda", "type": "text"},
                    {"name": "action_items", "type": "list"}
                ],
                created_at=base_date + timedelta(days=10),
                usage_count=random.randint(20, 80)
            ),
            DocumentTemplate(
                template_id="tpl_004",
                name="Expense Report",
                description="Template for expense reporting",
                file_type="xlsx",
                fields=[
                    {"name": "employee_name", "type": "string"},
                    {"name": "department", "type": "string"},
                    {"name": "expense_items", "type": "table"},
                    {"name": "total", "type": "currency"}
                ],
                created_at=base_date + timedelta(days=15),
                usage_count=random.randint(40, 150)
            )
        ]
        
        # Apply filter
        if file_type:
            templates = [t for t in templates if t.file_type == file_type]
            
        return templates
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve document templates: {str(e)}"
        )


@router.post("/analyze")
async def analyze_document(
    request: DocumentAnalysisRequest,
    file: Optional[UploadFile] = File(None),
    current_user: dict = Depends(get_current_user)
):
    """
    Analyze a document to extract metadata, entities, and content structure.
    Can analyze either an uploaded file or an existing document by ID.
    """
    try:
        # Validate input
        if not file and not request.document_id:
            raise HTTPException(
                status_code=400,
                detail="Either file upload or document_id is required"
            )
        
        # Mock analysis results
        analysis_result = {
            "document_id": request.document_id or f"doc_{random.randint(1000, 9999)}",
            "filename": file.filename if file else f"document_{request.document_id}.pdf",
            "analysis_type": request.analysis_type,
            "timestamp": datetime.now().isoformat(),
            "metadata": {
                "page_count": random.randint(1, 50),
                "word_count": random.randint(100, 5000),
                "file_size": random.randint(100000, 5000000),
                "creation_date": (datetime.now() - timedelta(days=random.randint(1, 365))).isoformat(),
                "last_modified": (datetime.now() - timedelta(days=random.randint(0, 30))).isoformat()
            }
        }
        
        if request.extract_entities:
            analysis_result["entities"] = {
                "people": ["Max Mustermann", "Erika Musterfrau"],
                "organizations": ["nscale GmbH", "Example Corp"],
                "locations": ["Berlin", "München"],
                "dates": ["2025-06-01", "2025-06-15"],
                "amounts": ["€1,234.56", "€789.00"]
            }
        
        if request.detect_language:
            analysis_result["language"] = {
                "detected": "de",
                "confidence": 0.95,
                "alternative_languages": [
                    {"language": "en", "confidence": 0.03},
                    {"language": "fr", "confidence": 0.02}
                ]
            }
        
        # Add content structure
        analysis_result["structure"] = {
            "sections": random.randint(3, 10),
            "paragraphs": random.randint(10, 50),
            "lists": random.randint(0, 5),
            "tables": random.randint(0, 3),
            "images": random.randint(0, 10)
        }
        
        # Add quality score
        analysis_result["quality_score"] = {
            "overall": round(random.uniform(0.7, 0.95), 2),
            "text_clarity": round(random.uniform(0.6, 0.9), 2),
            "structure": round(random.uniform(0.7, 0.95), 2),
            "completeness": round(random.uniform(0.8, 1.0), 2)
        }
        
        return {
            "success": True,
            "message": "Document analysis completed successfully",
            "analysis": analysis_result
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to analyze document: {str(e)}"
        )