"""
Knowledge Base API Endpoints for Admin Panel
Manages document storage, embeddings, and knowledge graph
"""

from fastapi import FastAPI, HTTPException, File, UploadFile, Form, Depends
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from datetime import datetime
import json
import time
import os
from pathlib import Path

from modules.core.logging import LogManager
from modules.rag.knowledge_manager import KnowledgeManager
from modules.core.auth_dependency import get_current_user, get_admin_user as require_admin

# Initialize components
logger = LogManager.setup_logging(__name__)

# Get absolute path for database
import os
app_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
db_path = os.path.join(app_dir, "data", "knowledge_base.db")
knowledge_manager = KnowledgeManager(db_path=db_path)



# Pydantic models
class KnowledgeDocument(BaseModel):
    id: str
    name: str
    type: str
    category: str
    chunkCount: int
    embeddingCount: int
    qualityScore: float
    lastUpdated: int  # timestamp
    metadata: Dict[str, Any]

class KnowledgeStatistics(BaseModel):
    totalDocuments: int
    totalChunks: int
    totalEmbeddings: int
    databaseSize: int

class UploadOptions(BaseModel):
    autoProcess: bool = True
    extractMetadata: bool = True
    createEmbeddings: bool = True
    category: str = "general"

# API Router
from fastapi import APIRouter
router = APIRouter()

@router.get("/documents", response_model=List[KnowledgeDocument])
async def get_documents(
    category: Optional[str] = None,
    search: Optional[str] = None,
    user: Dict[str, Any] = Depends(require_admin)
):
    """Get all documents in the knowledge base"""
    try:
        documents = knowledge_manager.get_documents(category=category, search=search)
        
        # Convert to response format
        result = []
        for doc in documents:
            result.append(KnowledgeDocument(
                id=doc['id'],
                name=doc['name'],
                type=doc['type'],
                category=doc['category'],
                chunkCount=doc['chunk_count'],
                embeddingCount=doc['embedding_count'],
                qualityScore=doc['quality_score'],
                lastUpdated=int(doc['last_updated'].timestamp() * 1000),
                metadata=doc.get('metadata', {})
            ))
        
        return result
        
    except Exception as e:
        logger.error(f"Error getting documents: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/statistics", response_model=KnowledgeStatistics)
async def get_statistics(user: Dict[str, Any] = Depends(require_admin)):
    """Get knowledge base statistics"""
    try:
        stats = knowledge_manager.get_statistics()
        
        return KnowledgeStatistics(
            totalDocuments=stats['total_documents'],
            totalChunks=stats['total_chunks'],
            totalEmbeddings=stats['total_embeddings'],
            databaseSize=stats['database_size']
        )
        
    except Exception as e:
        logger.error(f"Error getting statistics: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    autoProcess: bool = Form(True),
    extractMetadata: bool = Form(True),
    createEmbeddings: bool = Form(True),
    category: str = Form("general"),
    user: Dict[str, Any] = Depends(require_admin)
):
    """Upload a document to the knowledge base"""
    try:
        # Validate file
        if not file.filename:
            raise HTTPException(status_code=400, detail="No filename provided")
        
        # Save file temporarily
        upload_dir = Path("uploads")
        upload_dir.mkdir(exist_ok=True)
        
        file_path = upload_dir / f"{int(time.time())}_{file.filename}"
        
        with open(file_path, "wb") as f:
            content = await file.read()
            f.write(content)
        
        # Process document
        options = {
            'auto_process': autoProcess,
            'extract_metadata': extractMetadata,
            'create_embeddings': createEmbeddings,
            'category': category
        }
        
        document_id = knowledge_manager.add_document(str(file_path), options)
        
        return {
            "success": True,
            "documentId": document_id,
            "message": "Document uploaded successfully"
        }
        
    except Exception as e:
        logger.error(f"Error uploading document: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/documents/{document_id}")
async def delete_document(document_id: str, user: Dict[str, Any] = Depends(require_admin)):
    """Delete a document from the knowledge base"""
    try:
        success = knowledge_manager.delete_document(document_id)
        
        if not success:
            raise HTTPException(status_code=404, detail="Document not found")
        
        return {"success": True, "message": "Document deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting document: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/documents/{document_id}/reprocess")
async def reprocess_document(document_id: str, user: Dict[str, Any] = Depends(require_admin)):
    """Reprocess a document in the knowledge base"""
    try:
        job_id = knowledge_manager.reprocess_document(document_id)
        
        return {
            "success": True,
            "jobId": job_id,
            "message": "Document reprocessing started"
        }
        
    except Exception as e:
        logger.error(f"Error reprocessing document: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/graph")
async def get_knowledge_graph(user: Dict[str, Any] = Depends(require_admin)):
    """Get knowledge graph data for visualization"""
    try:
        graph_data = knowledge_manager.get_knowledge_graph()
        
        return {
            "nodes": graph_data['nodes'],
            "edges": graph_data['edges'],
            "stats": graph_data['stats']
        }
        
    except Exception as e:
        logger.error(f"Error getting knowledge graph: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/categories")
async def create_category(
    name: str,
    description: Optional[str] = None,
    user: Dict[str, Any] = Depends(require_admin)
):
    """Create a new document category"""
    try:
        category_id = knowledge_manager.create_category(name, description)
        
        return {
            "success": True,
            "categoryId": category_id,
            "message": "Category created successfully"
        }
        
    except Exception as e:
        logger.error(f"Error creating category: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/categories")
async def get_categories(user: Dict[str, Any] = Depends(require_admin)):
    """Get all document categories"""
    try:
        categories = knowledge_manager.get_categories()
        return categories
        
    except Exception as e:
        logger.error(f"Error getting categories: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/statistics")
async def get_knowledge_statistics(user: Dict[str, Any] = Depends(require_admin)):
    """Get knowledge base statistics"""
    try:
        # Get statistics from knowledge manager
        stats = knowledge_manager.get_statistics()
        
        return {
            "totalDocuments": stats.get("total_documents", 0),
            "totalChunks": stats.get("total_chunks", 0),
            "totalEmbeddings": stats.get("total_embeddings", 0),
            "databaseSize": stats.get("database_size", 0),
            "averageQualityScore": stats.get("average_quality_score", 0.0),
            "lastUpdated": int(time.time() * 1000),
            "categoriesCount": stats.get("categories_count", 0),
            "processingJobs": stats.get("processing_jobs", 0)
        }
        
    except Exception as e:
        logger.error(f"Error getting knowledge statistics: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Health check endpoint
@router.get("/health")
async def health_check():
    """Check knowledge base health"""
    try:
        health = knowledge_manager.check_health()
        
        return {
            "status": "healthy" if health['is_healthy'] else "unhealthy",
            "service": "knowledge-base",
            "details": health['details']
        }
        
    except Exception as e:
        return {
            "status": "unhealthy",
            "service": "knowledge-base",
            "error": str(e)
        }

# Export the router
__all__ = ['router']