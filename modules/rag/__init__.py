"""
RAG Module - Retrieval Augmented Generation
Includes settings management and API routes
"""

# Import router for server integration
try:
    from .settings_routes import router as settings_router
    SETTINGS_ROUTER_AVAILABLE = True
except ImportError as e:
    print(f"Warning: Could not import settings_router: {e}")
    SETTINGS_ROUTER_AVAILABLE = False
    settings_router = None

__all__ = []

if SETTINGS_ROUTER_AVAILABLE:
    __all__.append('settings_router')