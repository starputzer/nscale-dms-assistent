"""
Knowledge Manager API Endpoints
Manages knowledge base documents, chunks, and embeddings
"""

from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from datetime import datetime
import os
import json
import uuid
# from sqlalchemy import text  # Not needed for raw SQLite

from modules.core.logging import LogManager
from modules.core.auth_dependency import get_current_user, get_admin_user as require_admin
from modules.core.config import Config
from modules.core.db import DBManager

# Initialize components
logger = LogManager.setup_logging(__name__)

db_manager = DBManager()

router = APIRouter()

# Pydantic models
class KnowledgeStats(BaseModel):
    totalDocuments: int
    totalChunks: int
    totalEmbeddings: int
    databaseSize: int  # in bytes
    lastUpdate: datetime
    averageQualityScore: float

class DocumentCategory(BaseModel):
    id: str
    name: str
    icon: str
    documentCount: int
    size: int  # in bytes
    qualityScore: float

class DocumentMetadata(BaseModel):
    author: Optional[str] = None
    version: Optional[str] = None
    pages: Optional[int] = None
    lastModified: Optional[str] = None

class KnowledgeDocument(BaseModel):
    id: str
    name: str
    type: str  # pdf, docx, txt, html, md
    category: str
    chunkCount: int
    embeddingCount: int
    qualityScore: float
    lastUpdated: datetime
    size: int  # in bytes
    preview: str
    metadata: DocumentMetadata

class ProcessingOptions(BaseModel):
    autoProcess: bool = True
    extractMetadata: bool = True
    createEmbeddings: bool = True

class ProcessingResult(BaseModel):
    success: bool
    documentId: str
    message: str
    details: Optional[Dict[str, Any]] = None

# Helper functions
def get_document_type(filename: str) -> str:
    """Get document type from filename"""
    ext = filename.lower().split('.')[-1]
    return ext if ext in ['pdf', 'docx', 'txt', 'html', 'md'] else 'unknown'

def calculate_quality_score(doc_data: Dict[str, Any]) -> float:
    """Calculate document quality score based on various factors"""
    score = 50.0  # Base score
    
    # Add points for metadata
    if doc_data.get('metadata'):
        if doc_data['metadata'].get('author'):
            score += 10
        if doc_data['metadata'].get('version'):
            score += 10
    
    # Add points for chunks and embeddings
    if doc_data.get('chunkCount', 0) > 0:
        score += 15
    if doc_data.get('embeddingCount', 0) > 0:
        score += 15
    
    return min(100.0, score)

def get_database_size() -> int:
    """Get total size of knowledge database"""
    try:
        # Check knowledge base database
        kb_path = "data/knowledge_base.db"
        if os.path.exists(kb_path):
            return os.path.getsize(kb_path)
        
        # Check main database for knowledge tables
        total_size = 0
        with db_manager.get_session() as session:
            # Estimate size based on row counts
            doc_count = session.execute(
                "SELECT COUNT(*) FROM documents WHERE 1=1"
            ).fetchone()[0] or 0
            
            # Rough estimate: 10KB per document average
            total_size = doc_count * 10 * 1024
        
        return total_size
    except Exception as e:
        logger.error(f"Error getting database size: {e}")
        return 0

# Initialize tables if not exists
def init_knowledge_tables():
    """Initialize knowledge management tables"""
    try:
        with db_manager.get_session() as session:
            # Documents table
            session.execute("""
                CREATE TABLE IF NOT EXISTS documents (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    type TEXT NOT NULL,
                    category TEXT,
                    chunk_count INTEGER DEFAULT 0,
                    embedding_count INTEGER DEFAULT 0,
                    quality_score REAL DEFAULT 0,
                    size INTEGER DEFAULT 0,
                    preview TEXT,
                    metadata TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # Document chunks table
            session.execute("""
                CREATE TABLE IF NOT EXISTS document_chunks (
                    id TEXT PRIMARY KEY,
                    document_id TEXT NOT NULL,
                    chunk_index INTEGER NOT NULL,
                    content TEXT NOT NULL,
                    embedding_id TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (document_id) REFERENCES documents(id)
                )
            """)
            
            # Embeddings table
            session.execute("""
                CREATE TABLE IF NOT EXISTS document_embeddings (
                    id TEXT PRIMARY KEY,
                    chunk_id TEXT NOT NULL,
                    embedding TEXT NOT NULL,
                    model TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (chunk_id) REFERENCES document_chunks(id)
                )
            """)
            
            session.commit()
    except Exception as e:
        logger.error(f"Error initializing knowledge tables: {e}")

# Initialize tables on module load
init_knowledge_tables()

# Endpoints
@router.get("/stats", response_model=KnowledgeStats)
async def get_knowledge_stats(user: Dict[str, Any] = Depends(require_admin)):
    """Get knowledge base statistics"""
    try:
        with db_manager.get_session() as session:
            # Get counts
            result = session.execute(
                "SELECT COUNT(*) FROM documents"
            ).fetchone()
            total_docs = result[0] if result else 0
            
            result = session.execute(
                "SELECT COUNT(*) FROM document_chunks"
            ).fetchone()
            total_chunks = result[0] if result else 0
            
            result = session.execute(
                "SELECT COUNT(*) FROM document_embeddings"
            ).fetchone()
            total_embeddings = result[0] if result else 0
            
            # Get average quality score
            result = session.execute(
                "SELECT AVG(quality_score) FROM documents"
            ).fetchone()
            avg_quality = result[0] if result and result[0] else 0.0
            
            # Get last update
            result = session.execute(
                "SELECT MAX(updated_at) FROM documents"
            ).fetchone()
            last_update = result[0] if result and result[0] else datetime.now()
        
        return KnowledgeStats(
            totalDocuments=total_docs,
            totalChunks=total_chunks,
            totalEmbeddings=total_embeddings,
            databaseSize=get_database_size(),
            lastUpdate=last_update,
            averageQualityScore=round(avg_quality, 1)
        )
    except Exception as e:
        logger.error(f"Error getting knowledge stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/categories", response_model=List[DocumentCategory])
async def get_document_categories(user: Dict[str, Any] = Depends(require_admin)):
    """Get document categories with statistics"""
    try:
        # Predefined categories
        categories = [
            {"id": "manual", "name": "Handbücher", "icon": "fas fa-book"},
            {"id": "faq", "name": "FAQ", "icon": "fas fa-question-circle"},
            {"id": "tutorial", "name": "Tutorials", "icon": "fas fa-graduation-cap"},
            {"id": "configuration", "name": "Konfiguration", "icon": "fas fa-cog"},
            {"id": "other", "name": "Sonstige", "icon": "fas fa-folder"}
        ]
        
        result = []
        with db_manager.get_session() as session:
            for cat in categories:
                # Get stats for each category
                doc_count = session.execute(
                    "SELECT COUNT(*) FROM documents WHERE category = ?",
                    (cat["id"],)
                ).fetchone()[0] or 0
                
                total_size = session.execute(
                    "SELECT SUM(size) FROM documents WHERE category = ?",
                    (cat["id"],)
                ).fetchone()[0] or 0
                
                avg_quality = session.execute(
                    "SELECT AVG(quality_score) FROM documents WHERE category = ?",
                    (cat["id"],)
                ).fetchone()[0] or 0
                
                result.append(DocumentCategory(
                    id=cat["id"],
                    name=cat["name"],
                    icon=cat["icon"],
                    documentCount=doc_count,
                    size=int(total_size),
                    qualityScore=round(avg_quality, 1)
                ))
        
        return result
    except Exception as e:
        logger.error(f"Error getting document categories: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/documents", response_model=List[KnowledgeDocument])
async def get_documents(
    category: Optional[str] = None,
    search: Optional[str] = None,
    sort_by: str = "name",
    user: Dict[str, Any] = Depends(require_admin)
):
    """Get documents with optional filtering and sorting"""
    try:
        with db_manager.get_session() as session:
            # Build query
            query = "SELECT * FROM documents WHERE 1=1"
            params = {}
            
            if category:
                query += " AND category = :category"
                params["category"] = category
            
            if search:
                query += " AND (name LIKE :search OR preview LIKE :search)"
                params["search"] = f"%{search}%"
            
            # Add sorting
            sort_columns = {
                "name": "name",
                "date": "updated_at DESC",
                "size": "size DESC",
                "quality": "quality_score DESC"
            }
            query += f" ORDER BY {sort_columns.get(sort_by, 'name')}"
            
            # Convert named parameters to positional for SQLite
            if params:
                # Replace :param with ? and create ordered values
                for key, value in params.items():
                    query = query.replace(f":{key}", "?")
                param_values = list(params.values())
                results = session.execute(query, param_values).fetchall()
            else:
                results = session.execute(query).fetchall()
            
            documents = []
            for row in results:
                # Parse metadata
                metadata = {}
                if row.metadata:
                    try:
                        metadata = json.loads(row.metadata)
                    except:
                        pass
                
                documents.append(KnowledgeDocument(
                    id=row.id,
                    name=row.name,
                    type=row.type,
                    category=row.category or "other",
                    chunkCount=row.chunk_count,
                    embeddingCount=row.embedding_count,
                    qualityScore=row.quality_score,
                    lastUpdated=row.updated_at,
                    size=row.size,
                    preview=row.preview or "",
                    metadata=DocumentMetadata(**metadata)
                ))
            
            return documents
    except Exception as e:
        logger.error(f"Error getting documents: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/documents/upload")
async def upload_documents(
    files: List[UploadFile] = File(...),
    options: str = Form(...),  # JSON string
    user: Dict[str, Any] = Depends(require_admin)
):
    """Upload and process documents"""
    try:
        # Parse options
        processing_options = ProcessingOptions(**json.loads(options))
        
        results = []
        upload_dir = "data/uploads"
        if not os.path.exists(upload_dir):
            os.makedirs(upload_dir)
        
        for file in files:
            try:
                # Generate unique ID
                doc_id = str(uuid.uuid4())
                
                # Save file
                file_path = os.path.join(upload_dir, f"{doc_id}_{file.filename}")
                with open(file_path, "wb") as f:
                    content = await file.read()
                    f.write(content)
                
                # Create document record
                doc_type = get_document_type(file.filename)
                
                with db_manager.get_session() as session:
                    session.execute("""
                        INSERT INTO documents (id, name, type, category, size, preview, quality_score)
                        VALUES (?, ?, ?, ?, ?, ?, ?)
                    """, (
                        doc_id,
                        file.filename,
                        doc_type,
                        "other",  # Default category
                        len(content),
                        f"Uploaded document: {file.filename}",
                        50.0  # Initial quality score
                    ))
                    session.commit()
                
                # Process if requested
                if processing_options.autoProcess:
                    # In a real system, this would trigger document processing
                    # For now, we'll simulate it
                    with db_manager.get_session() as session:
                        session.execute("""
                            UPDATE documents 
                            SET chunk_count = ?, embedding_count = ?, quality_score = ?
                            WHERE id = ?
                        """, (
                            10,  # Mock chunk count
                            10,  # Mock embedding count
                            75.0,  # Updated quality score
                            doc_id
                        ))
                        session.commit()
                
                results.append(ProcessingResult(
                    success=True,
                    documentId=doc_id,
                    message=f"Document '{file.filename}' uploaded successfully",
                    details={
                        "filename": file.filename,
                        "size": len(content),
                        "type": doc_type,
                        "processed": processing_options.autoProcess
                    }
                ))
                
            except Exception as e:
                logger.error(f"Error uploading file {file.filename}: {e}")
                results.append(ProcessingResult(
                    success=False,
                    documentId="",
                    message=f"Failed to upload '{file.filename}': {str(e)}"
                ))
        
        return {"results": results}
        
    except Exception as e:
        logger.error(f"Error in document upload: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/documents/{document_id}/reprocess", response_model=ProcessingResult)
async def reprocess_document(document_id: str, user: Dict[str, Any] = Depends(require_admin)):
    """Reprocess a document"""
    try:
        with db_manager.get_session() as session:
            # Check if document exists
            doc = session.execute(
                "SELECT * FROM documents WHERE id = ?",
                (document_id,)
            ).fetchone()
            
            if not doc:
                raise HTTPException(status_code=404, detail="Document not found")
            
            # Simulate reprocessing
            # In a real system, this would trigger actual processing
            new_chunks = doc.chunk_count + 5  # Simulate finding more chunks
            new_quality = min(100, doc.quality_score + 5)  # Improve quality
            
            session.execute("""
                UPDATE documents 
                SET chunk_count = ?, quality_score = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            """, (
                new_chunks,
                new_quality,
                document_id
            ))
            session.commit()
            
            return ProcessingResult(
                success=True,
                documentId=document_id,
                message=f"Document '{doc.name}' reprocessed successfully",
                details={
                    "chunks": new_chunks,
                    "quality": new_quality
                }
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error reprocessing document: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/documents/{document_id}")
async def delete_document(document_id: str, user: Dict[str, Any] = Depends(require_admin)):
    """Delete a document and its associated data"""
    try:
        with db_manager.get_session() as session:
            # Check if document exists
            doc = session.execute(
                "SELECT name FROM documents WHERE id = ?",
                (document_id,)
            ).fetchone()
            
            if not doc:
                raise HTTPException(status_code=404, detail="Document not found")
            
            # Delete embeddings
            session.execute("""
                DELETE FROM document_embeddings 
                WHERE chunk_id IN (
                    SELECT id FROM document_chunks WHERE document_id = ?
                )
            """, (document_id,))
            
            # Delete chunks
            session.execute(
                "DELETE FROM document_chunks WHERE document_id = ?",
                (document_id,)
            )
            
            # Delete document
            session.execute(
                "DELETE FROM documents WHERE id = ?",
                (document_id,)
            )
            
            session.commit()
            
            # Delete physical file if exists
            upload_dir = "data/uploads"
            for filename in os.listdir(upload_dir):
                if filename.startswith(document_id):
                    os.remove(os.path.join(upload_dir, filename))
            
            return {
                "success": True,
                "message": f"Document '{doc[0]}' deleted successfully"  # doc[0] = name (from SELECT name)
            }
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting document: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/graph/data")
async def get_knowledge_graph_data(user: Dict[str, Any] = Depends(require_admin)):
    """Get data for knowledge graph visualization"""
    try:
        # This would return graph data for visualization
        # For now, return mock data
        nodes = []
        links = []
        
        with db_manager.get_session() as session:
            # Get documents as nodes
            docs = session.execute(
                "SELECT id, name, category FROM documents"
            ).fetchall()
            
            for doc in docs:
                # Columns from SELECT: id(0), name(1), category(2)
                nodes.append({
                    "id": doc[0],  # id
                    "name": doc[1],  # name
                    "type": "document",
                    "category": doc[2]  # category
                })
            
            # In a real system, we'd calculate relationships between documents
            # For now, create some mock connections
            if len(docs) > 1:
                for i in range(min(5, len(docs) - 1)):
                    links.append({
                        "source": docs[i][0],  # id
                        "target": docs[i + 1][0],  # id
                        "type": "related"
                    })
        
        return {
            "nodes": nodes,
            "links": links
        }
        
    except Exception as e:
        logger.error(f"Error getting graph data: {e}")
        raise HTTPException(status_code=500, detail=str(e))