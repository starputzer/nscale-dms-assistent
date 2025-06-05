#!/usr/bin/env python3
"""
Unified nscale-assist API Server
Consolidates all endpoints under consistent /api/v1 structure
"""

import os
import sys
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import uvicorn
import logging

# Import unified router
from api.unified_endpoints import router as unified_router

# Import middleware
from starlette.middleware.base import BaseHTTPMiddleware

class JWTMiddleware(BaseHTTPMiddleware):
    """Simple JWT logging middleware"""
    async def dispatch(self, request, call_next):
        # Log requests with auth headers
        if "authorization" in request.headers:
            logger.debug(f"Request to {request.url.path} with auth header")
        response = await call_next(request)
        return response

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Lifespan manager for startup/shutdown
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Handle application startup and shutdown"""
    # Startup
    logger.info("Starting nscale-assist API server...")
    
    # Initialize services
    from modules.llm.preloader import preload_model
    from modules.rag.optimized_rag_engine import OptimizedRAGEngine
    from modules.core.db_helper import init_databases
    
    # Preload LLM model
    logger.info("Preloading LLM model...")
    await preload_model()
    
    # Initialize databases
    logger.info("Initializing databases...")
    init_databases()
    
    # Initialize RAG engine
    logger.info("Initializing RAG engine...")
    rag_engine = OptimizedRAGEngine()
    await rag_engine.initialize()
    
    logger.info("API server started successfully")
    
    yield
    
    # Shutdown
    logger.info("Shutting down API server...")
    # Cleanup resources if needed

# Create FastAPI app
app = FastAPI(
    title="nscale-assist API",
    description="Unified API for nscale Digital Assistant",
    version="2.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
    lifespan=lifespan
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add JWT middleware
app.add_middleware(JWTMiddleware)

# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Handle all unhandled exceptions"""
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "error": "Internal server error",
            "detail": str(exc) if os.getenv("DEBUG") == "true" else None
        }
    )

# Request logging middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Log all incoming requests"""
    logger.info(f"{request.method} {request.url.path}")
    
    # Log auth header if present (for debugging)
    auth_header = request.headers.get("Authorization")
    if auth_header:
        logger.debug(f"Auth header present: {auth_header[:20]}...")
    
    response = await call_next(request)
    
    logger.info(f"{request.method} {request.url.path} - {response.status_code}")
    return response

# Include unified router
app.include_router(unified_router)

# Root endpoint
@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "nscale-assist API",
        "version": "2.0.0",
        "docs": "/api/docs",
        "health": "/api/v1/health"
    }

# Legacy endpoint redirects (for backward compatibility)
@app.get("/api/admin/get-stats")
async def legacy_admin_stats():
    """Redirect to new endpoint"""
    return JSONResponse(
        status_code=301,
        headers={"Location": "/api/v1/admin/dashboard"},
        content={"message": "Endpoint moved to /api/v1/admin/dashboard"}
    )

@app.get("/api/admin/system/info")
async def legacy_system_info():
    """Redirect to new endpoint"""
    return JSONResponse(
        status_code=301,
        headers={"Location": "/api/v1/admin/system/info"},
        content={"message": "Endpoint moved to /api/v1/admin/system/info"}
    )

if __name__ == "__main__":
    # Get configuration from environment
    host = os.getenv("API_HOST", "0.0.0.0")
    port = int(os.getenv("API_PORT", "8000"))
    reload = os.getenv("API_RELOAD", "true").lower() == "true"
    
    logger.info(f"Starting server on {host}:{port}")
    
    # Run server
    uvicorn.run(
        "server_unified:app",
        host=host,
        port=port,
        reload=reload,
        log_level="info"
    )