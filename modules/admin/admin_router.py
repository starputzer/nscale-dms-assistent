"""
Central Admin Router
Combines all admin route handlers into a single router
"""

from fastapi import APIRouter

# Import all handlers
#from .dashboard_handler import dashboard_handler
from .simple_dashboard_handler import router as simple_dashboard_router
from .users_handler import users_handler
from .feedback_handler import feedback_handler
from .statistics_handler import statistics_handler

# Import existing route modules (will be refactored later)
from .system_monitor_routes import router as system_monitor_router
from .knowledge_routes import router as knowledge_router
from .doc_converter_routes import router as doc_converter_router
from .background_routes import router as background_router

# Import the new modules from their actual locations
try:
    from ..rag.settings_routes import router as rag_settings_router
    RAG_SETTINGS_AVAILABLE = True
except ImportError:
    RAG_SETTINGS_AVAILABLE = False
    rag_settings_router = None

try:
    from ..doc_converter.advanced_routes import router as advanced_documents_router
    ADVANCED_DOCS_AVAILABLE = True
except ImportError:
    ADVANCED_DOCS_AVAILABLE = False
    advanced_documents_router = None


class AdminRouter:
    """Central router for all admin endpoints"""
    
    def __init__(self):
        """Initialize admin router"""
        self.router = APIRouter()
        self._setup_routes()
    
    def _setup_routes(self):
        """Setup all admin sub-routes"""
        # Include object-oriented handlers
        self.router.include_router(
            simple_dashboard_router,
            prefix="/dashboard",
            tags=["Admin Dashboard"]
        )
        
        self.router.include_router(
            users_handler.router,
            prefix="/users",
            tags=["Admin Users"]
        )
        
        self.router.include_router(
            feedback_handler.router,
            prefix="/feedback",
            tags=["Admin Feedback"]
        )
        
        self.router.include_router(
            statistics_handler.router,
            prefix="/statistics",
            tags=["Admin Statistics"]
        )
        
        # Include existing routers (to be refactored)
        self.router.include_router(
            system_monitor_router,
            prefix="/system-monitor",
            tags=["Admin System Monitor"]
        )
        
        # RAG Settings router is now registered directly in server.py
        # to avoid double /api/admin prefix
        # if RAG_SETTINGS_AVAILABLE and rag_settings_router:
        #     self.router.include_router(
        #         rag_settings_router,
        #         prefix="/rag-settings",
        #         tags=["Admin RAG Settings"]
        #     )
        
        self.router.include_router(
            knowledge_router,
            prefix="/knowledge",
            tags=["Admin Knowledge"]
        )
        
        self.router.include_router(
            doc_converter_router,
            prefix="/doc-converter",
            tags=["Admin Doc Converter"]
        )
        
        self.router.include_router(
            background_router,
            prefix="/background",
            tags=["Admin Background"]
        )
        
        # Advanced Documents router is now registered directly in server.py
        # to avoid double /api/admin prefix
        # if ADVANCED_DOCS_AVAILABLE and advanced_documents_router:
        #     self.router.include_router(
        #         advanced_documents_router,
        #         prefix="/advanced-documents",
        #         tags=["Admin Advanced Documents"]
        #     )


# Create central admin router instance
admin_router = AdminRouter()

# Export the FastAPI router
router = admin_router.router