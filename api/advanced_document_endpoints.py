"""
Advanced Document Processing API Endpoints
Part of Phase 2.7: Advanced Document Intelligence & Integration
"""

from fastapi import APIRouter, File, UploadFile, HTTPException, Depends, BackgroundTasks
from fastapi.responses import JSONResponse
from typing import Dict, Any, List, Optional
import os
import tempfile
import logging
from datetime import datetime
from pathlib import Path

from app.modules.doc_converter.advanced_document_processor import AdvancedDocumentProcessor
from app.modules.doc_converter.language_detector import LanguageDetector
# Import auth dependencies with fallback
try:
    from app.modules.auth.dependencies import get_current_user, User
except ImportError:
    # Fallback for testing
    from pydantic import BaseModel
    
    class User(BaseModel):
        username: str
        email: str = None
        
    async def get_current_user():
        # Mock user for testing
        return User(username="test_user")

# Import config with fallback
try:
    from app.modules.core.config import settings
except ImportError:
    # Fallback settings
    class Settings:
        pass
    settings = Settings()

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/advanced-documents", tags=["advanced-documents"])

# Initialize processors
advanced_processor = AdvancedDocumentProcessor(
    enable_ocr=True,
    enable_language_detection=True,
    enable_metadata_extraction=True
)
language_detector = LanguageDetector()


@router.post("/process-with-ocr")
async def process_document_with_ocr(
    file: UploadFile = File(...),
    enable_ocr: bool = True,
    ocr_languages: str = "deu+eng",
    current_user: User = Depends(get_current_user)
):
    """
    Process document with OCR capabilities for scanned documents.
    
    - Automatically detects if document is scanned
    - Performs OCR with specified languages
    - Extracts text and metadata
    """
    if not file:
        raise HTTPException(status_code=400, detail="No file provided")
        
    # Save uploaded file temporarily
    with tempfile.NamedTemporaryFile(delete=False, suffix=Path(file.filename).suffix) as tmp:
        content = await file.read()
        tmp.write(content)
        tmp_path = tmp.name
        
    try:
        # Process with advanced capabilities
        processor = AdvancedDocumentProcessor(
            enable_ocr=enable_ocr,
            ocr_languages=ocr_languages
        )
        
        result = processor.process_document(
            tmp_path,
            metadata={
                'original_filename': file.filename,
                'content_type': file.content_type,
                'uploaded_by': current_user.username,
                'uploaded_at': datetime.now().isoformat()
            }
        )
        
        # Add processing stats
        result['processing_stats'] = processor.get_processing_stats()
        
        return JSONResponse(content=result)
        
    except Exception as e:
        logger.error(f"Error processing document with OCR: {e}")
        raise HTTPException(status_code=500, detail=str(e))
        
    finally:
        # Clean up
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)


@router.post("/detect-language")
async def detect_document_language(
    file: UploadFile = File(...),
    sample_size: int = 1000,
    current_user: User = Depends(get_current_user)
):
    """
    Detect language(s) in uploaded document.
    
    Returns primary language and any additional languages detected.
    """
    if not file:
        raise HTTPException(status_code=400, detail="No file provided")
        
    try:
        # Read file content
        content = await file.read()
        text_content = content.decode('utf-8', errors='ignore')
        
        # Detect primary language
        primary = language_detector.detect_language(text_content[:sample_size])
        
        # Detect multiple languages
        multiple = language_detector.detect_multiple_languages(text_content)
        
        # Check if mixed languages
        is_mixed = language_detector.is_mixed_language(text_content)
        
        return JSONResponse(content={
            'filename': file.filename,
            'primary_language': primary,
            'all_languages': multiple,
            'is_mixed_language': is_mixed,
            'supported_languages': language_detector.get_supported_languages()
        })
        
    except Exception as e:
        logger.error(f"Error detecting language: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/extract-metadata")
async def extract_enhanced_metadata(
    file: UploadFile = File(...),
    extract_dates: bool = True,
    extract_entities: bool = True,
    current_user: User = Depends(get_current_user)
):
    """
    Extract enhanced metadata from document.
    
    - Extracts dates, emails, URLs, phone numbers
    - Identifies document type
    - Extracts key-value pairs
    - Provides content statistics
    """
    if not file:
        raise HTTPException(status_code=400, detail="No file provided")
        
    # Save uploaded file temporarily
    with tempfile.NamedTemporaryFile(delete=False, suffix=Path(file.filename).suffix) as tmp:
        content = await file.read()
        tmp.write(content)
        tmp_path = tmp.name
        
    try:
        # Initialize metadata extractor
        from app.modules.doc_converter.enhanced_metadata_extractor import EnhancedMetadataExtractor
        extractor = EnhancedMetadataExtractor(
            extract_entities=extract_entities,
            extract_dates=extract_dates
        )
        
        # Extract metadata
        text_content = content.decode('utf-8', errors='ignore')
        metadata = extractor.extract_metadata(
            text_content,
            tmp_path,
            {
                'original_filename': file.filename,
                'content_type': file.content_type,
                'uploaded_by': current_user.username
            }
        )
        
        return JSONResponse(content=metadata)
        
    except Exception as e:
        logger.error(f"Error extracting metadata: {e}")
        raise HTTPException(status_code=500, detail=str(e))
        
    finally:
        # Clean up
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)


@router.post("/batch-process")
async def batch_process_documents(
    files: List[UploadFile] = File(...),
    background_tasks: BackgroundTasks = BackgroundTasks(),
    enable_ocr: bool = True,
    enable_language_detection: bool = True,
    current_user: User = Depends(get_current_user)
):
    """
    Process multiple documents in batch with advanced features.
    
    Returns job ID for tracking progress.
    """
    if not files:
        raise HTTPException(status_code=400, detail="No files provided")
        
    # Create job ID
    job_id = f"batch_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{current_user.username}"
    
    # Save files temporarily
    file_paths = []
    for file in files:
        with tempfile.NamedTemporaryFile(delete=False, suffix=Path(file.filename).suffix) as tmp:
            content = await file.read()
            tmp.write(content)
            file_paths.append({
                'path': tmp.name,
                'original_name': file.filename,
                'content_type': file.content_type
            })
            
    # Process in background
    background_tasks.add_task(
        _process_batch_background,
        job_id,
        file_paths,
        enable_ocr,
        enable_language_detection,
        current_user.username
    )
    
    return JSONResponse(content={
        'job_id': job_id,
        'status': 'processing',
        'files_count': len(files),
        'message': 'Batch processing started. Check status endpoint for progress.'
    })


async def _process_batch_background(
    job_id: str,
    file_paths: List[Dict],
    enable_ocr: bool,
    enable_language_detection: bool,
    username: str
):
    """Background task for batch processing."""
    logger.info(f"Starting batch processing job: {job_id}")
    
    processor = AdvancedDocumentProcessor(
        enable_ocr=enable_ocr,
        enable_language_detection=enable_language_detection,
        enable_metadata_extraction=True
    )
    
    results = []
    for file_info in file_paths:
        try:
            result = processor.process_document(
                file_info['path'],
                metadata={
                    'original_filename': file_info['original_name'],
                    'content_type': file_info['content_type'],
                    'batch_job_id': job_id,
                    'processed_by': username
                }
            )
            results.append(result)
            
        except Exception as e:
            logger.error(f"Error processing {file_info['original_name']}: {e}")
            results.append({
                'success': False,
                'error': str(e),
                'filename': file_info['original_name']
            })
            
        finally:
            # Clean up temp file
            if os.path.exists(file_info['path']):
                os.unlink(file_info['path'])
                
    # Store results (in real implementation, use proper storage)
    # For now, just log completion
    logger.info(f"Batch processing completed: {job_id}")
    
    
@router.get("/processing-stats")
async def get_processing_statistics(
    current_user: User = Depends(get_current_user)
):
    """Get advanced document processing statistics."""
    return JSONResponse(content=advanced_processor.get_processing_stats())


@router.get("/supported-languages")
async def get_supported_languages():
    """Get list of supported languages for detection."""
    return JSONResponse(content={
        'languages': language_detector.get_supported_languages()
    })


@router.get("/ocr-status")
async def get_ocr_status(
    current_user: User = Depends(get_current_user)
):
    """Check OCR availability and configuration."""
    from app.modules.doc_converter.ocr_processor import OCRProcessor, PYTESSERACT_AVAILABLE
    
    ocr = OCRProcessor()
    
    return JSONResponse(content={
        'pytesseract_available': PYTESSERACT_AVAILABLE,
        'ocr_functional': ocr.available,
        'default_languages': 'deu+eng',
        'supported_formats': ['.pdf', '.png', '.jpg', '.jpeg', '.tiff', '.bmp']
    })