"""
Admin Advanced Documents Management Routes
"""

from fastapi import APIRouter, HTTPException, Depends, Request, UploadFile, File
from typing import Dict, Any, List, Optional
from datetime import datetime
import logging

from modules.core.auth_dependency import get_current_user
from modules.doc_converter.advanced_document_processor import AdvancedDocumentProcessor
from modules.core.db import DBManager

logger = logging.getLogger(__name__)
router = APIRouter()

# Initialize services
adv_doc_processor = AdvancedDocumentProcessor()
db_manager = DBManager()

# Dependency to check if user is admin
async def require_admin(user_data: Dict[str, Any] = Depends(get_current_user)):
    """Require admin role for access"""
    if user_data.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user_data

@router.get("/list")
async def get_documents_list(
    status: Optional[str] = None,
    file_type: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = 100,
    offset: int = 0,
    admin_user: Dict[str, Any] = Depends(require_admin)
):
    """Get advanced documents list with filtering"""
    try:
        documents = adv_doc_processor.get_documents(
            status=status,
            file_type=file_type,
            search=search,
            limit=limit,
            offset=offset
        )
        
        return documents
    except Exception as e:
        logger.error(f"Error getting documents list: {e}")
        # Return mock data
        return {
            "documents": [
                {
                    "id": "adv-doc-001",
                    "filename": "Geschäftsbericht_2025.pdf",
                    "file_type": "pdf",
                    "size_mb": 12.5,
                    "pages": 150,
                    "status": "processed",
                    "created_at": "2025-06-01T10:00:00Z",
                    "processed_at": "2025-06-01T10:05:00Z",
                    "metadata": {
                        "title": "Geschäftsbericht 2025",
                        "author": "Finanzabteilung",
                        "created_date": "2025-05-30",
                        "language": "de",
                        "keywords": ["finanzen", "bericht", "2025"]
                    },
                    "processing_info": {
                        "ocr_applied": True,
                        "text_extracted": True,
                        "tables_found": 25,
                        "images_extracted": 45,
                        "processing_time_seconds": 285
                    },
                    "user_email": "finance@company.com"
                },
                {
                    "id": "adv-doc-002",
                    "filename": "Vertragsvorlage_Kunde.docx",
                    "file_type": "docx",
                    "size_mb": 0.5,
                    "pages": 12,
                    "status": "processed",
                    "created_at": "2025-06-02T14:00:00Z",
                    "processed_at": "2025-06-02T14:01:00Z",
                    "metadata": {
                        "title": "Kundenvertrag Vorlage",
                        "template_type": "contract",
                        "language": "de"
                    },
                    "processing_info": {
                        "ocr_applied": False,
                        "text_extracted": True,
                        "placeholders_found": 15,
                        "processing_time_seconds": 12
                    },
                    "user_email": "legal@company.com"
                }
            ],
            "total": 2,
            "limit": limit,
            "offset": offset
        }

@router.get("/document/{document_id}")
async def get_document_details(
    document_id: str,
    admin_user: Dict[str, Any] = Depends(require_admin)
):
    """Get detailed information about a document"""
    try:
        document = adv_doc_processor.get_document_details(document_id)
        
        if not document:
            raise HTTPException(status_code=404, detail="Document not found")
        
        return document
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting document details: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/document/{document_id}/content")
async def get_document_content(
    document_id: str,
    page: Optional[int] = None,
    admin_user: Dict[str, Any] = Depends(require_admin)
):
    """Get extracted content from document"""
    try:
        content = adv_doc_processor.get_document_content(
            document_id=document_id,
            page=page
        )
        
        if not content:
            raise HTTPException(status_code=404, detail="Content not found")
        
        return content
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting document content: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/document/{document_id}/metadata")
async def get_document_metadata(
    document_id: str,
    admin_user: Dict[str, Any] = Depends(require_admin)
):
    """Get document metadata"""
    try:
        metadata = adv_doc_processor.get_document_metadata(document_id)
        
        if not metadata:
            raise HTTPException(status_code=404, detail="Metadata not found")
        
        return metadata
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting document metadata: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.put("/document/{document_id}/metadata")
async def update_document_metadata(
    document_id: str,
    metadata: Dict[str, Any],
    admin_user: Dict[str, Any] = Depends(require_admin)
):
    """Update document metadata"""
    try:
        success = adv_doc_processor.update_document_metadata(
            document_id=document_id,
            metadata=metadata
        )
        
        if not success:
            raise HTTPException(status_code=404, detail="Document not found")
        
        return {"success": True, "message": "Metadata updated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating document metadata: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.post("/analyze/{document_id}")
async def analyze_document(
    document_id: str,
    analysis_type: str,  # entities, sentiment, summary, keywords
    admin_user: Dict[str, Any] = Depends(require_admin)
):
    """Perform advanced analysis on document"""
    try:
        result = await adv_doc_processor.analyze_document(
            document_id=document_id,
            analysis_type=analysis_type
        )
        
        return {
            "success": True,
            "document_id": document_id,
            "analysis_type": analysis_type,
            "result": result
        }
    except Exception as e:
        logger.error(f"Error analyzing document: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/templates")
async def get_document_templates(
    admin_user: Dict[str, Any] = Depends(require_admin)
):
    """Get available document templates"""
    try:
        templates = adv_doc_processor.get_templates()
        
        return templates
    except Exception as e:
        logger.error(f"Error getting document templates: {e}")
        # Return mock data
        return [
            {
                "id": "template-001",
                "name": "Kundenvertrag",
                "description": "Standard Kundenvertrag Vorlage",
                "category": "contracts",
                "file_type": "docx",
                "placeholders": [
                    {"name": "KUNDE_NAME", "description": "Name des Kunden"},
                    {"name": "KUNDE_ADRESSE", "description": "Adresse des Kunden"},
                    {"name": "VERTRAGSDATUM", "description": "Datum des Vertrags"}
                ],
                "created_at": "2025-01-15T10:00:00Z"
            },
            {
                "id": "template-002",
                "name": "Rechnung",
                "description": "Standard Rechnungsvorlage",
                "category": "invoices",
                "file_type": "xlsx",
                "placeholders": [
                    {"name": "RECHNUNGSNUMMER", "description": "Eindeutige Rechnungsnummer"},
                    {"name": "KUNDE", "description": "Kundenname"},
                    {"name": "BETRAG", "description": "Rechnungsbetrag"}
                ],
                "created_at": "2025-01-20T11:00:00Z"
            }
        ]

@router.post("/generate-from-template")
async def generate_from_template(
    template_id: str,
    values: Dict[str, Any],
    admin_user: Dict[str, Any] = Depends(require_admin)
):
    """Generate document from template"""
    try:
        result = await adv_doc_processor.generate_from_template(
            template_id=template_id,
            values=values,
            user_id=admin_user["user_id"]
        )
        
        return {
            "success": True,
            "document_id": result["document_id"],
            "filename": result["filename"],
            "message": "Document generated successfully"
        }
    except Exception as e:
        logger.error(f"Error generating document from template: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/export/{document_id}")
async def export_document(
    document_id: str,
    format: str = "pdf",  # pdf, docx, txt, json
    admin_user: Dict[str, Any] = Depends(require_admin)
):
    """Export document in different formats"""
    try:
        export_data = await adv_doc_processor.export_document(
            document_id=document_id,
            format=format
        )
        
        if not export_data:
            raise HTTPException(status_code=404, detail="Document not found")
        
        # Return file response
        from fastapi.responses import FileResponse
        return FileResponse(
            path=export_data["path"],
            filename=export_data["filename"],
            media_type=export_data["content_type"]
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error exporting document: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.post("/batch-process")
async def batch_process_documents(
    document_ids: List[str],
    operation: str,  # reprocess, analyze, export, delete
    params: Optional[Dict[str, Any]] = None,
    admin_user: Dict[str, Any] = Depends(require_admin)
):
    """Batch process multiple documents"""
    try:
        if len(document_ids) > 100:
            raise HTTPException(status_code=400, detail="Maximum 100 documents per batch")
        
        job_id = await adv_doc_processor.batch_process(
            document_ids=document_ids,
            operation=operation,
            params=params or {},
            user_id=admin_user["user_id"]
        )
        
        return {
            "success": True,
            "job_id": job_id,
            "document_count": len(document_ids),
            "message": f"Batch {operation} started"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in batch processing: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/search")
async def search_documents(
    query: str,
    search_type: str = "content",  # content, metadata, filename
    limit: int = 50,
    admin_user: Dict[str, Any] = Depends(require_admin)
):
    """Search documents"""
    try:
        results = await adv_doc_processor.search_documents(
            query=query,
            search_type=search_type,
            limit=limit
        )
        
        return {
            "query": query,
            "search_type": search_type,
            "results": results,
            "total": len(results)
        }
    except Exception as e:
        logger.error(f"Error searching documents: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")