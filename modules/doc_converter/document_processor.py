"""
Document processor for managing document processing tasks
"""
from typing import Dict, List, Optional, Any
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


class DocumentProcessor:
    """Manages document processing tasks"""
    
    def __init__(self):
        self.active_documents: Dict[str, Dict[str, Any]] = {}
        
    async def get_all_active_documents(self) -> List[Dict[str, Any]]:
        """Get all documents currently being processed"""
        return list(self.active_documents.values())
        
    async def get_user_active_documents(self, user_id: str) -> List[Dict[str, Any]]:
        """Get active documents for a specific user"""
        user_docs = []
        for doc in self.active_documents.values():
            if doc.get("user_id") == user_id:
                user_docs.append(doc)
        return user_docs
        
    async def add_active_document(self, document_id: str, user_id: str, filename: str) -> Dict[str, Any]:
        """Add a document to active processing"""
        doc = {
            "document_id": document_id,
            "user_id": user_id,
            "filename": filename,
            "status": "processing",
            "started_at": datetime.utcnow().isoformat(),
            "progress": 0
        }
        self.active_documents[document_id] = doc
        return doc
        
    async def update_document_progress(self, document_id: str, progress: float) -> bool:
        """Update document processing progress"""
        if document_id in self.active_documents:
            self.active_documents[document_id]["progress"] = progress
            return True
        return False
        
    async def complete_document_processing(self, document_id: str, success: bool, error: Optional[str] = None) -> bool:
        """Mark document processing as complete"""
        if document_id in self.active_documents:
            doc = self.active_documents[document_id]
            doc["status"] = "completed" if success else "failed"
            doc["completed_at"] = datetime.utcnow().isoformat()
            doc["success"] = success
            if error:
                doc["error"] = error
            # Remove from active after a delay
            # In production, you might want to use a background task for this
            return True
        return False
        
    async def remove_active_document(self, document_id: str) -> bool:
        """Remove a document from active processing"""
        if document_id in self.active_documents:
            del self.active_documents[document_id]
            return True
        return False


# Global document processor instance
document_processor = DocumentProcessor()