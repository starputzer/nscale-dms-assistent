"""
Advanced Documents API Endpoints
Handles document processing with OCR, quality analysis, and intelligent extraction
"""

from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Query
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
import hashlib
import json
import os
from pathlib import Path
import mimetypes
import pytesseract
from PIL import Image
import PyPDF2
import io

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
class OCRStatus(BaseModel):
    ocr_functional: bool
    default_languages: str
    supported_formats: List[str]
    available_languages: List[str]
    max_file_size_mb: int

class ProcessingStats(BaseModel):
    total_processed: int
    ocr_processed: int
    processing_errors: int
    avg_processing_time: float
    languages_detected: Dict[str, int]
    document_types: Dict[str, int]
    quality_scores: Dict[str, float]

class DocumentQualityReport(BaseModel):
    document_id: str
    filename: str
    overall_quality: float
    readability_score: float
    structure_score: float
    completeness_score: float
    issues: List[str]
    recommendations: List[str]
    metadata: Dict[str, Any]

class ProcessingResult(BaseModel):
    success: bool
    document_id: str
    filename: str
    file_size: int
    processing_time: float
    ocr_performed: bool
    extracted_text: Optional[str]
    language_detected: Optional[str]
    quality_score: float
    page_count: int
    warnings: List[str]
    metadata: Dict[str, Any]

class ExtractionPattern(BaseModel):
    pattern_id: str
    name: str
    description: str
    regex_pattern: str
    category: str
    is_active: bool

# Helper functions
def check_ocr_availability() -> bool:
    """Check if OCR is available on the system"""
    try:
        # Test tesseract availability
        tesseract_version = pytesseract.get_tesseract_version()
        logger.info(f"Tesseract version: {tesseract_version}")
        return True
    except Exception as e:
        logger.warning(f"OCR not available: {e}")
        return False

def get_available_languages() -> List[str]:
    """Get available OCR languages"""
    try:
        langs = pytesseract.get_languages()
        return langs
    except:
        return ["eng", "deu"]  # Default languages

def analyze_document_quality(text: str, metadata: Dict[str, Any]) -> Dict[str, float]:
    """Analyze document quality metrics"""
    # Simple quality analysis
    quality_metrics = {
        "readability": 0.0,
        "structure": 0.0,
        "completeness": 0.0,
        "overall": 0.0
    }
    
    if not text:
        return quality_metrics
    
    # Readability based on average word length and sentence length
    words = text.split()
    if words:
        avg_word_length = sum(len(word) for word in words) / len(words)
        quality_metrics["readability"] = min(1.0, max(0.0, 1.0 - (avg_word_length - 5) / 10))
    
    # Structure based on presence of headers, paragraphs
    lines = text.split('\n')
    non_empty_lines = [line for line in lines if line.strip()]
    if non_empty_lines:
        quality_metrics["structure"] = min(1.0, len(non_empty_lines) / 100)
    
    # Completeness based on text length
    quality_metrics["completeness"] = min(1.0, len(text) / 10000)
    
    # Overall quality
    quality_metrics["overall"] = sum(quality_metrics.values()) / 3
    
    return quality_metrics

def extract_text_from_pdf(file_content: bytes) -> tuple[str, int]:
    """Extract text from PDF file"""
    text = ""
    page_count = 0
    
    try:
        pdf_reader = PyPDF2.PdfReader(io.BytesIO(file_content))
        page_count = len(pdf_reader.pages)
        
        for page in pdf_reader.pages:
            text += page.extract_text() + "\n"
    except Exception as e:
        logger.error(f"Error extracting PDF text: {e}")
    
    return text.strip(), page_count

def perform_ocr(file_content: bytes, file_type: str, languages: str = "deu+eng") -> str:
    """Perform OCR on image files"""
    try:
        image = Image.open(io.BytesIO(file_content))
        text = pytesseract.image_to_string(image, lang=languages)
        return text
    except Exception as e:
        logger.error(f"OCR error: {e}")
        return ""

# Endpoints
@router.get("/ocr-status", response_model=OCRStatus)
async def get_ocr_status(user: Dict[str, Any] = Depends(require_admin)):
    """Get OCR system status and capabilities"""
    try:
        ocr_available = check_ocr_availability()
        available_langs = get_available_languages() if ocr_available else []
        
        return OCRStatus(
            ocr_functional=ocr_available,
            default_languages="deu+eng",
            supported_formats=[".pdf", ".png", ".jpg", ".jpeg", ".tiff", ".bmp"],
            available_languages=available_langs,
            max_file_size_mb=50
        )
    except Exception as e:
        logger.error(f"Error getting OCR status: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/processing-stats", response_model=ProcessingStats)
async def get_processing_stats(user: Dict[str, Any] = Depends(require_admin)):
    """Get document processing statistics"""
    try:
        with db_manager.get_session() as conn:
            cursor = conn.cursor()
        
            # Get total processed documents
            cursor.execute("SELECT COUNT(*) FROM documents")
            total_processed = cursor.fetchone()[0]
        
            # Get OCR processed count
            cursor.execute("SELECT COUNT(*) FROM documents WHERE metadata LIKE '%ocr_performed%true%'")
            ocr_processed = cursor.fetchone()[0]
        
            # Get processing errors (mock for now)
            processing_errors = 0
        
            # Get average processing time (mock)
            avg_processing_time = 3.5
        
            # Language detection stats (mock)
            languages_detected = {
            "de": 156,
            "en": 89,
            "fr": 12,
            "es": 8
            }
        
            # Document types (mock)
            document_types = {
            "pdf": 198,
            "docx": 45,
            "png": 12,
            "jpg": 10
            }
        
            # Quality scores (mock)
            quality_scores = {
            "excellent": 0.85,
            "good": 0.70,
            "fair": 0.55,
            "poor": 0.30
            }
        
        return ProcessingStats(
            total_processed=total_processed,
            ocr_processed=ocr_processed,
            processing_errors=processing_errors,
            avg_processing_time=avg_processing_time,
            languages_detected=languages_detected,
            document_types=document_types,
            quality_scores=quality_scores
        )
    except Exception as e:
        logger.error(f"Error getting processing stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/process-with-ocr", response_model=ProcessingResult)
async def process_document_with_ocr(
    file: UploadFile = File(...),
    enable_ocr: bool = Query(True),
    ocr_languages: str = Query("deu+eng"),
    user: Dict[str, Any] = Depends(require_admin)
):
    """Process document with optional OCR"""
    start_time = datetime.now()
    
    try:
        # Read file content
        file_content = await file.read()
        file_size = len(file_content)
        
        # Check file size
        max_size = 50 * 1024 * 1024  # 50MB
        if file_size > max_size:
            raise HTTPException(status_code=400, detail="File too large")
        
        # Detect file type
        file_type = file.filename.split('.')[-1].lower()
        
        # Initialize result
        extracted_text = ""
        page_count = 1
        ocr_performed = False
        warnings = []
        
        # Process based on file type
        if file_type == "pdf":
            # Extract text from PDF
            extracted_text, page_count = extract_text_from_pdf(file_content)
            
            # If no text extracted and OCR enabled, try OCR
            if not extracted_text.strip() and enable_ocr:
                warnings.append("PDF appears to be scanned, OCR would be needed for images")
                ocr_performed = False  # PDF OCR requires more complex handling
        
        elif file_type in ["png", "jpg", "jpeg", "tiff", "bmp"]:
            # Image file - perform OCR if enabled
            if enable_ocr and check_ocr_availability():
                extracted_text = perform_ocr(file_content, file_type, ocr_languages)
                ocr_performed = True
            else:
                warnings.append("OCR disabled or not available for image file")
        
        else:
            # Text-based files
            try:
                extracted_text = file_content.decode('utf-8')
            except:
                extracted_text = file_content.decode('latin-1')
        
        # Detect language (simple detection)
        language_detected = "de" if any(word in extracted_text.lower() for word in ["der", "die", "das", "und"]) else "en"
        
        # Analyze quality
        quality_metrics = analyze_document_quality(extracted_text, {
            "file_type": file_type,
            "page_count": page_count
        })
        
        # Calculate processing time
        processing_time = (datetime.now() - start_time).total_seconds()
        
        # Generate document ID
        doc_id = hashlib.sha256(f"{file.filename}{datetime.now().isoformat()}".encode()).hexdigest()[:16]
        
        # Save to database
        with db_manager.get_session() as conn:
            cursor = conn.cursor()
        
            metadata = {
            "file_type": file_type,
            "ocr_performed": ocr_performed,
            "ocr_languages": ocr_languages if ocr_performed else None,
            "language_detected": language_detected,
            "quality_score": quality_metrics["overall"],
            "page_count": page_count,
            "processing_time": processing_time
            }
        
            cursor.execute("""
            INSERT INTO documents (id, filename, content, file_size, created_at, metadata)
            VALUES (?, ?, ?, ?, ?, ?)
            """, (
            doc_id,
            file.filename,
            extracted_text[:1000],  # Store first 1000 chars
            file_size,
            int(datetime.now().timestamp()),
            json.dumps(metadata)
            ))
            conn.commit()
        
        return ProcessingResult(
            success=True,
            document_id=doc_id,
            filename=file.filename,
            file_size=file_size,
            processing_time=processing_time,
            ocr_performed=ocr_performed,
            extracted_text=extracted_text[:500],  # Return first 500 chars
            language_detected=language_detected,
            quality_score=quality_metrics["overall"],
            page_count=page_count,
            warnings=warnings,
            metadata=metadata
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error processing document: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/quality-report/{document_id}", response_model=DocumentQualityReport)
async def get_quality_report(document_id: str, user: Dict[str, Any] = Depends(require_admin)):
    """Get detailed quality report for a document"""
    try:
        with db_manager.get_session() as conn:
            cursor = conn.cursor()
        
            cursor.execute("""
            SELECT filename, content, metadata 
            FROM documents 
            WHERE id = ?
            """, (document_id,))
        
            row = cursor.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Document not found")
        
            filename, content, metadata_str = row
            metadata = json.loads(metadata_str) if metadata_str else {}
        
            # Analyze quality
            quality_metrics = analyze_document_quality(content, metadata)
        
            # Generate issues and recommendations
            issues = []
            recommendations = []
        
            if quality_metrics["readability"] < 0.5:
                issues.append("Low readability score")
                recommendations.append("Consider simplifying language or improving text extraction")
        
            if quality_metrics["structure"] < 0.5:
                issues.append("Poor document structure")
                recommendations.append("Document may benefit from better formatting")
        
            if quality_metrics["completeness"] < 0.5:
                issues.append("Document appears incomplete")
                recommendations.append("Verify all pages were processed correctly")
        
            if metadata.get("ocr_performed") and quality_metrics["overall"] < 0.6:
                recommendations.append("Consider re-scanning with higher quality")
        
        return DocumentQualityReport(
            document_id=document_id,
            filename=filename,
            overall_quality=quality_metrics["overall"],
            readability_score=quality_metrics["readability"],
            structure_score=quality_metrics["structure"],
            completeness_score=quality_metrics["completeness"],
            issues=issues,
            recommendations=recommendations,
            metadata=metadata
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating quality report: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/extraction-patterns", response_model=List[ExtractionPattern])
async def get_extraction_patterns(user: Dict[str, Any] = Depends(require_admin)):
    """Get available extraction patterns"""
    try:
        # Define standard extraction patterns
        patterns = [
            ExtractionPattern(
                pattern_id="email",
                name="Email Addresses",
                description="Extract email addresses",
                regex_pattern=r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}",
                category="contact",
                is_active=True
            ),
            ExtractionPattern(
                pattern_id="phone",
                name="Phone Numbers",
                description="Extract German phone numbers",
                regex_pattern=r"(\+49|0)[1-9]\d{1,14}",
                category="contact",
                is_active=True
            ),
            ExtractionPattern(
                pattern_id="iban",
                name="IBAN Numbers",
                description="Extract IBAN account numbers",
                regex_pattern=r"[A-Z]{2}\d{2}[A-Z0-9]{1,30}",
                category="financial",
                is_active=True
            ),
            ExtractionPattern(
                pattern_id="date",
                name="Dates",
                description="Extract dates in various formats",
                regex_pattern=r"\d{1,2}[.-/]\d{1,2}[.-/]\d{2,4}",
                category="temporal",
                is_active=True
            ),
            ExtractionPattern(
                pattern_id="postcode",
                name="German Postcodes",
                description="Extract German postal codes",
                regex_pattern=r"\b\d{5}\b",
                category="address",
                is_active=True
            )
        ]
        
        return patterns
    except Exception as e:
        logger.error(f"Error getting extraction patterns: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/batch-analyze")
async def analyze_documents_batch(
    document_ids: List[str],
    user: Dict[str, Any] = Depends(require_admin)
):
    """Analyze multiple documents in batch"""
    try:
        results = []
        
        for doc_id in document_ids:
            try:
                # Get quality report for each document
                report = await get_quality_report(doc_id, _)
                results.append({
                    "document_id": doc_id,
                    "success": True,
                    "quality_score": report.overall_quality,
                    "issues": report.issues
                })
            except Exception as e:
                results.append({
                    "document_id": doc_id,
                    "success": False,
                    "error": str(e)
                })
        
        return {
            "success": True,
            "analyzed": len(results),
            "results": results
        }
        
    except Exception as e:
        logger.error(f"Error in batch analysis: {e}")
        raise HTTPException(status_code=500, detail=str(e))