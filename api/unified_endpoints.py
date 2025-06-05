"""
Unified Endpoint Configuration for nscale-assist
Consolidates all endpoints with consistent URL structure
"""

from fastapi import APIRouter, Depends, HTTPException, File, UploadFile, Form, Body
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
import json

# Import all necessary dependencies
from modules.core.auth_dependency import get_current_user as require_auth, require_admin
from modules.core.db_helper import get_user_db, get_doc_converter_db
from modules.rag.optimized_rag_engine import OptimizedRAGEngine
from modules.rag.knowledge_manager import KnowledgeManager
from modules.background.task_manager import BackgroundTaskManager
from modules.doc_converter.enhanced_processor import EnhancedDocumentProcessor
from modules.core.performance import PerformanceMonitor
from modules.llm.llm_model import LLMModel

# Initialize services
rag_engine = OptimizedRAGEngine()
knowledge_manager = KnowledgeManager()
task_manager = BackgroundTaskManager()
doc_processor = EnhancedDocumentProcessor()
performance_monitor = PerformanceMonitor()
llm_model = LLMModel()

# Create main router with /api/v1 prefix
router = APIRouter(prefix="/api/v1")

# ===========================
# Authentication Endpoints
# ===========================

@router.post("/auth/login", tags=["auth"])
async def login(email: str = Body(...), password: str = Body(...)):
    """Login endpoint with JWT token generation"""
    from modules.auth.user_model import UserManager
    user_manager = UserManager()
    
    # Validate credentials and get token
    result = user_manager.login(email, password)
    if not result["success"]:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = result["access_token"]
    user = result["user"]
    
    return {
        "success": True,
        "token": token,
        "user": {
            "id": user["id"],
            "email": user["email"],
            "name": user["name"],
            "role": user["role"]
        }
    }

@router.post("/auth/logout", tags=["auth"])
async def logout(current_user=Depends(require_auth)):
    """Logout endpoint"""
    return {"success": True, "message": "Logged out successfully"}

@router.get("/auth/me", tags=["auth"])
async def get_current_user(current_user=Depends(require_auth)):
    """Get current authenticated user"""
    return {"success": True, "user": current_user}

# ===========================
# Chat & RAG Endpoints
# ===========================

@router.post("/chat/message", tags=["chat"])
async def send_chat_message(
    message: str = Body(...),
    session_id: Optional[str] = Body(None),
    current_user=Depends(require_auth)
):
    """Send a chat message with RAG support"""
    # Process message through RAG engine
    response = await rag_engine.process_query(
        query=message,
        user_id=current_user["id"],
        session_id=session_id
    )
    
    return {
        "success": True,
        "response": response["answer"],
        "sources": response.get("sources", []),
        "session_id": response.get("session_id")
    }

@router.get("/chat/sessions", tags=["chat"])
async def get_chat_sessions(current_user=Depends(require_auth)):
    """Get all chat sessions for current user"""
    db = get_user_db()
    sessions = db.get_user_sessions(current_user["id"])
    return {"success": True, "sessions": sessions}

@router.get("/chat/sessions/{session_id}", tags=["chat"])
async def get_chat_session(session_id: str, current_user=Depends(require_auth)):
    """Get specific chat session"""
    db = get_user_db()
    session = db.get_session(session_id, current_user["id"])
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return {"success": True, "session": session}

@router.delete("/chat/sessions/{session_id}", tags=["chat"])
async def delete_chat_session(session_id: str, current_user=Depends(require_auth)):
    """Delete a chat session"""
    db = get_user_db()
    
    # Check if session belongs to user
    session = db.get_session(session_id, current_user["id"])
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Delete the session
    db.delete_session(session_id, current_user["id"])
    
    return {"success": True, "message": "Session deleted"}

@router.put("/chat/sessions/{session_id}", tags=["chat"])
async def update_chat_session(
    session_id: str, 
    session_data: dict = Body(...),
    current_user=Depends(require_auth)
):
    """Update session (e.g., rename)"""
    db = get_user_db()
    
    # Check if session belongs to user
    session = db.get_session(session_id, current_user["id"])
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Update the session
    updated = db.update_session(session_id, current_user["id"], session_data)
    
    return {"success": True, "session": updated}

# ===========================
# Document Management
# ===========================

@router.post("/documents/upload", tags=["documents"])
async def upload_document(
    file: UploadFile = File(...),
    metadata: Optional[str] = Form(None),
    current_user=Depends(require_auth)
):
    """Upload and process a document"""
    # Process document
    result = await doc_processor.process_document(
        file=file,
        user_id=current_user["id"],
        metadata=json.loads(metadata) if metadata else {}
    )
    
    # Add to knowledge base
    await knowledge_manager.add_document(
        doc_id=result["document_id"],
        content=result["content"],
        metadata=result["metadata"]
    )
    
    return {
        "success": True,
        "document_id": result["document_id"],
        "status": "processed",
        "metadata": result["metadata"]
    }

@router.get("/documents", tags=["documents"])
async def list_documents(
    page: int = 1,
    limit: int = 20,
    current_user=Depends(require_auth)
):
    """List all documents for current user"""
    db = get_doc_converter_db()
    documents = db.get_user_documents(
        user_id=current_user["id"],
        page=page,
        limit=limit
    )
    return {"success": True, "documents": documents}

@router.delete("/documents/{doc_id}", tags=["documents"])
async def delete_document(doc_id: str, current_user=Depends(require_auth)):
    """Delete a document"""
    await knowledge_manager.remove_document(doc_id)
    return {"success": True, "message": "Document deleted"}

# ===========================
# Admin Dashboard Endpoints
# ===========================

@router.get("/admin/dashboard", tags=["admin"], dependencies=[Depends(require_admin)])
async def get_admin_dashboard():
    """Get admin dashboard overview"""
    stats = {
        "users": get_user_db().count_users(),
        "documents": get_doc_converter_db().count_documents(),
        "sessions": get_user_db().count_sessions(),
        "system": performance_monitor.get_system_stats()
    }
    return {"success": True, "stats": stats}

@router.get("/admin/users", tags=["admin"], dependencies=[Depends(require_admin)])
async def get_admin_users(page: int = 1, limit: int = 20):
    """Get all users (admin only)"""
    db = get_user_db()
    users = db.get_all_users(page=page, limit=limit)
    return {"success": True, "users": users}

@router.put("/admin/users/{user_id}", tags=["admin"], dependencies=[Depends(require_admin)])
async def update_user(user_id: int, user_data: dict = Body(...)):
    """Update user information"""
    db = get_user_db()
    updated = db.update_user(user_id, user_data)
    return {"success": True, "user": updated}

@router.delete("/admin/users/{user_id}", tags=["admin"], dependencies=[Depends(require_admin)])
async def delete_user(user_id: int):
    """Delete a user"""
    db = get_user_db()
    db.delete_user(user_id)
    return {"success": True, "message": "User deleted"}

# ===========================
# Admin System Management
# ===========================

@router.get("/admin/system/info", tags=["admin"], dependencies=[Depends(require_admin)])
async def get_system_info():
    """Get system information"""
    return {
        "success": True,
        "system": {
            "version": "2.0.0",
            "uptime": performance_monitor.get_uptime(),
            "memory": performance_monitor.get_memory_usage(),
            "cpu": performance_monitor.get_cpu_usage(),
            "disk": performance_monitor.get_disk_usage()
        }
    }

@router.post("/admin/system/cache/clear", tags=["admin"], dependencies=[Depends(require_admin)])
async def clear_system_cache():
    """Clear system cache"""
    from modules.core.cache import cache_manager
    cache_manager.clear_all()
    return {"success": True, "message": "Cache cleared"}

@router.post("/admin/system/optimize", tags=["admin"], dependencies=[Depends(require_admin)])
async def optimize_system():
    """Optimize system performance"""
    # Optimize databases
    get_user_db().optimize()
    get_doc_converter_db().optimize()
    
    # Optimize RAG engine
    await rag_engine.optimize()
    
    return {"success": True, "message": "System optimized"}

# ===========================
# Admin Statistics
# ===========================

@router.get("/admin/statistics", tags=["admin"], dependencies=[Depends(require_admin)])
async def get_admin_statistics(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None
):
    """Get detailed statistics"""
    stats = {
        "users": {
            "total": get_user_db().count_users(),
            "active": get_user_db().count_active_users(),
            "new": get_user_db().count_new_users(start_date, end_date)
        },
        "documents": {
            "total": get_doc_converter_db().count_documents(),
            "processed": get_doc_converter_db().count_processed_documents(),
            "failed": get_doc_converter_db().count_failed_documents()
        },
        "usage": {
            "queries": rag_engine.get_query_stats(start_date, end_date),
            "uploads": doc_processor.get_upload_stats(start_date, end_date)
        }
    }
    return {"success": True, "statistics": stats}

# ===========================
# Admin Feedback
# ===========================

@router.get("/admin/feedback", tags=["admin"], dependencies=[Depends(require_admin)])
async def get_admin_feedback(page: int = 1, limit: int = 20):
    """Get all user feedback"""
    db = get_user_db()
    feedback = db.get_all_feedback(page=page, limit=limit)
    return {"success": True, "feedback": feedback}

@router.put("/admin/feedback/{feedback_id}/status", tags=["admin"], dependencies=[Depends(require_admin)])
async def update_feedback_status(feedback_id: int, status: str = Body(...)):
    """Update feedback status"""
    db = get_user_db()
    db.update_feedback_status(feedback_id, status)
    return {"success": True, "message": "Feedback status updated"}

# ===========================
# Admin RAG Configuration
# ===========================

@router.get("/admin/rag/config", tags=["admin"], dependencies=[Depends(require_admin)])
async def get_rag_config():
    """Get RAG configuration"""
    config = rag_engine.get_config()
    return {"success": True, "config": config}

@router.put("/admin/rag/config", tags=["admin"], dependencies=[Depends(require_admin)])
async def update_rag_config(config: dict = Body(...)):
    """Update RAG configuration"""
    rag_engine.update_config(config)
    return {"success": True, "message": "RAG configuration updated"}

@router.post("/admin/rag/reindex", tags=["admin"], dependencies=[Depends(require_admin)])
async def reindex_rag():
    """Reindex all documents"""
    task_id = await task_manager.create_task(
        "rag_reindex",
        {"action": "reindex_all"}
    )
    return {"success": True, "task_id": task_id}

# ===========================
# Admin Knowledge Manager
# ===========================

@router.get("/admin/knowledge", tags=["admin"], dependencies=[Depends(require_admin)])
async def get_knowledge_base():
    """Get knowledge base overview"""
    stats = await knowledge_manager.get_statistics()
    return {"success": True, "statistics": stats}

@router.post("/admin/knowledge/train", tags=["admin"], dependencies=[Depends(require_admin)])
async def train_knowledge_base(training_data: dict = Body(...)):
    """Train knowledge base with new data"""
    task_id = await task_manager.create_task(
        "knowledge_training",
        training_data
    )
    return {"success": True, "task_id": task_id}

# ===========================
# Admin Background Tasks
# ===========================

@router.get("/admin/tasks", tags=["admin"], dependencies=[Depends(require_admin)])
async def get_background_tasks(
    status: Optional[str] = None,
    page: int = 1,
    limit: int = 20
):
    """Get background tasks"""
    tasks = await task_manager.get_tasks(
        status=status,
        page=page,
        limit=limit
    )
    return {"success": True, "tasks": tasks}

@router.get("/admin/tasks/{task_id}", tags=["admin"], dependencies=[Depends(require_admin)])
async def get_task_status(task_id: str):
    """Get specific task status"""
    task = await task_manager.get_task(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return {"success": True, "task": task}

@router.post("/admin/tasks/{task_id}/cancel", tags=["admin"], dependencies=[Depends(require_admin)])
async def cancel_task(task_id: str):
    """Cancel a background task"""
    await task_manager.cancel_task(task_id)
    return {"success": True, "message": "Task cancelled"}

# ===========================
# Admin System Monitor
# ===========================

@router.get("/admin/monitor/health", tags=["admin", "monitor"], dependencies=[Depends(require_admin)])
async def get_system_health():
    """Get system health status"""
    health = {
        "status": "healthy",
        "services": {
            "database": get_user_db().check_health(),
            "rag_engine": rag_engine.check_health(),
            "llm": llm_model.check_health(),
            "cache": True  # Simplified for now
        },
        "timestamp": datetime.now().isoformat()
    }
    return {"success": True, "health": health}

@router.get("/admin/monitor/performance", tags=["admin", "monitor"], dependencies=[Depends(require_admin)])
async def get_performance_metrics():
    """Get performance metrics"""
    metrics = performance_monitor.get_detailed_metrics()
    return {"success": True, "metrics": metrics}

# ===========================
# Public Endpoints (No Auth)
# ===========================

@router.get("/health", tags=["public"])
async def health_check():
    """Basic health check endpoint"""
    return {"status": "ok", "timestamp": datetime.now().isoformat()}

@router.get("/version", tags=["public"])
async def get_version():
    """Get API version"""
    return {
        "version": "2.0.0",
        "api_version": "v1",
        "build_date": "2025-06-06"
    }

# ===========================
# Feature Toggles
# ===========================

@router.get("/features", tags=["features"])
async def get_feature_toggles(current_user=Depends(require_auth)):
    """Get feature toggles for current user"""
    # Get user-specific feature flags
    features = {
        "enhanced_rag": True,
        "document_ocr": True,
        "background_processing": True,
        "admin_panel": current_user.get("role") == "admin",
        "batch_operations": True,
        "real_time_updates": False  # Coming soon
    }
    return {"success": True, "features": features}

# Export router
__all__ = ["router"]