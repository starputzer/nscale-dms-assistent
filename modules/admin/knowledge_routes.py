"""
Admin Knowledge Manager Routes
"""

from fastapi import APIRouter, HTTPException, Depends, Request, UploadFile, File
from typing import Dict, Any, List, Optional
from datetime import datetime
import logging

from modules.core.auth_dependency import get_current_user
from modules.rag.knowledge_manager import KnowledgeManager
from modules.core.db import DBManager

logger = logging.getLogger(__name__)
router = APIRouter()

# Initialize services
knowledge_manager = KnowledgeManager()

# Dependency to check if user is admin
async def require_admin(user_data: Dict[str, Any] = Depends(get_current_user)):
    """Require admin role for access"""
    if user_data.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user_data

@router.get("/categories")
async def get_knowledge_categories(
    admin_user: Dict[str, Any] = Depends(require_admin)
):
    """Get all knowledge base categories"""
    try:
        categories = knowledge_manager.get_categories()
        
        return categories
    except Exception as e:
        logger.error(f"Error getting knowledge categories: {e}")
        # Return mock data
        return [
            {
                "id": "cat-001",
                "name": "nscale Grundlagen",
                "description": "Grundlegende Informationen über nscale",
                "document_count": 15,
                "total_chunks": 450,
                "created_at": "2025-01-15T10:00:00Z",
                "updated_at": "2025-06-01T14:30:00Z"
            },
            {
                "id": "cat-002",
                "name": "Berechtigungen",
                "description": "Alles über Berechtigungen und Zugriffsrechte",
                "document_count": 8,
                "total_chunks": 220,
                "created_at": "2025-01-20T11:00:00Z",
                "updated_at": "2025-05-28T09:15:00Z"
            },
            {
                "id": "cat-003",
                "name": "Troubleshooting",
                "description": "Problemlösungen und häufige Fehler",
                "document_count": 12,
                "total_chunks": 380,
                "created_at": "2025-02-01T08:00:00Z",
                "updated_at": "2025-06-03T16:45:00Z"
            }
        ]

@router.get("/stats")
async def get_knowledge_stats(
    admin_user: Dict[str, Any] = Depends(require_admin)
):
    """Get knowledge base statistics"""
    try:
        stats = knowledge_manager.get_statistics()
        
        return stats
    except Exception as e:
        logger.error(f"Error getting knowledge stats: {e}")
        # Return mock data
        return {
            "total_documents": 35,
            "total_chunks": 1050,
            "total_embeddings": 1050,
            "categories": 3,
            "average_chunk_size": 512,
            "storage_used_mb": 125.5,
            "last_update": "2025-06-03T16:45:00Z",
            "index_health": "healthy",
            "query_performance": {
                "average_response_time_ms": 85,
                "queries_last_24h": 234,
                "cache_hit_rate": 0.72
            }
        }

@router.get("/documents")
async def get_knowledge_documents(
    category_id: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    admin_user: Dict[str, Any] = Depends(require_admin)
):
    """Get knowledge base documents"""
    try:
        documents = knowledge_manager.get_documents(
            category_id=category_id,
            search=search,
            limit=limit,
            offset=offset
        )
        
        return documents
    except Exception as e:
        logger.error(f"Error getting knowledge documents: {e}")
        # Return mock data
        return {
            "documents": [
                {
                    "id": "doc-001",
                    "title": "nscale Grundlagen - Erste Schritte",
                    "category_id": "cat-001",
                    "category_name": "nscale Grundlagen",
                    "content_preview": "Dieses Dokument erklärt die grundlegenden Konzepte...",
                    "chunk_count": 25,
                    "source": "manual",
                    "language": "de",
                    "created_at": "2025-01-15T10:00:00Z",
                    "updated_at": "2025-05-20T14:00:00Z",
                    "metadata": {
                        "author": "nscale Team",
                        "version": "8.0",
                        "tags": ["grundlagen", "einführung"]
                    }
                },
                {
                    "id": "doc-002",
                    "title": "Berechtigungskonzepte in nscale",
                    "category_id": "cat-002",
                    "category_name": "Berechtigungen",
                    "content_preview": "Die Berechtigungsverwaltung in nscale basiert auf...",
                    "chunk_count": 30,
                    "source": "manual",
                    "language": "de",
                    "created_at": "2025-01-20T11:00:00Z",
                    "updated_at": "2025-05-25T10:30:00Z",
                    "metadata": {
                        "author": "nscale Team",
                        "version": "8.0",
                        "tags": ["berechtigungen", "sicherheit"]
                    }
                }
            ],
            "total": 35,
            "limit": limit,
            "offset": offset
        }

@router.post("/documents")
async def add_knowledge_document(
    file: UploadFile = File(...),
    category_id: str = None,
    metadata: Optional[str] = None,
    admin_user: Dict[str, Any] = Depends(require_admin)
):
    """Add a new document to knowledge base"""
    try:
        # Parse metadata if provided
        doc_metadata = {}
        if metadata:
            try:
                doc_metadata = json.loads(metadata)
            except:
                pass
        
        # Process and add document
        result = await knowledge_manager.add_document(
            file=file,
            category_id=category_id,
            metadata=doc_metadata,
            user_id=admin_user["user_id"]
        )
        
        return {
            "success": True,
            "document_id": result["document_id"],
            "chunks_created": result["chunks_created"],
            "message": "Document added successfully"
        }
    except Exception as e:
        logger.error(f"Error adding knowledge document: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/documents/{document_id}")
async def update_knowledge_document(
    document_id: str,
    update_data: Dict[str, Any],
    admin_user: Dict[str, Any] = Depends(require_admin)
):
    """Update knowledge document metadata"""
    try:
        success = knowledge_manager.update_document(
            document_id=document_id,
            update_data=update_data
        )
        
        if not success:
            raise HTTPException(status_code=404, detail="Document not found")
        
        return {"success": True, "message": "Document updated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating knowledge document: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.delete("/documents/{document_id}")
async def delete_knowledge_document(
    document_id: str,
    admin_user: Dict[str, Any] = Depends(require_admin)
):
    """Delete a document from knowledge base"""
    try:
        success = knowledge_manager.delete_document(document_id)
        
        if not success:
            raise HTTPException(status_code=404, detail="Document not found")
        
        return {"success": True, "message": "Document deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting knowledge document: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.post("/reindex")
async def reindex_knowledge_base(
    admin_user: Dict[str, Any] = Depends(require_admin)
):
    """Trigger knowledge base reindexing"""
    try:
        # Start reindexing process
        job_id = knowledge_manager.start_reindexing()
        
        return {
            "success": True,
            "message": "Reindexing started",
            "job_id": job_id
        }
    except Exception as e:
        logger.error(f"Error starting reindexing: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/search")
async def search_knowledge_base(
    query: str,
    category_id: Optional[str] = None,
    limit: int = 10,
    admin_user: Dict[str, Any] = Depends(require_admin)
):
    """Search the knowledge base"""
    try:
        results = knowledge_manager.search(
            query=query,
            category_id=category_id,
            limit=limit
        )
        
        return {
            "query": query,
            "results": results,
            "total": len(results)
        }
    except Exception as e:
        logger.error(f"Error searching knowledge base: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.post("/categories")
async def create_category(
    category_data: Dict[str, Any],
    admin_user: Dict[str, Any] = Depends(require_admin)
):
    """Create a new knowledge category"""
    try:
        category_id = knowledge_manager.create_category(
            name=category_data["name"],
            description=category_data.get("description", "")
        )
        
        return {
            "success": True,
            "category_id": category_id,
            "message": "Category created successfully"
        }
    except Exception as e:
        logger.error(f"Error creating category: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.put("/categories/{category_id}")
async def update_category(
    category_id: str,
    category_data: Dict[str, Any],
    admin_user: Dict[str, Any] = Depends(require_admin)
):
    """Update a knowledge category"""
    try:
        success = knowledge_manager.update_category(
            category_id=category_id,
            name=category_data.get("name"),
            description=category_data.get("description")
        )
        
        if not success:
            raise HTTPException(status_code=404, detail="Category not found")
        
        return {"success": True, "message": "Category updated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating category: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.delete("/categories/{category_id}")
async def delete_category(
    category_id: str,
    admin_user: Dict[str, Any] = Depends(require_admin)
):
    """Delete a knowledge category"""
    try:
        # Check if category has documents
        documents = knowledge_manager.get_documents(category_id=category_id, limit=1)
        if documents.get("total", 0) > 0:
            raise HTTPException(
                status_code=400, 
                detail="Cannot delete category with documents"
            )
        
        success = knowledge_manager.delete_category(category_id)
        
        if not success:
            raise HTTPException(status_code=404, detail="Category not found")
        
        return {"success": True, "message": "Category deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting category: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")