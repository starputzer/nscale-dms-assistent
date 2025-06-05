"""
Clean FastAPI Server with Modular Endpoint Management
"""

import os
import sys
from pathlib import Path
from contextlib import asynccontextmanager
from datetime import datetime
import logging

from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

# Import core modules
from modules.core.logging import LogManager
from modules.core.config import Config
from modules.core.db import DBManager

# Import endpoint management
from api.core.endpoint_manager import EndpointManager

# Initialize logging
logger = LogManager.setup_logging(__name__)

# Initialize database
db_manager = DBManager()

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager"""
    logger.info("=" * 60)
    logger.info("Starting nscale Assist API Server (Clean Version)")
    logger.info(f"Time: {datetime.now()}")
    logger.info("=" * 60)
    
    # Load all endpoints
    endpoint_manager = EndpointManager(app)
    endpoint_manager.load_all_endpoints()
    endpoint_manager.add_management_endpoints()
    
    logger.info("Server is ready!")
    
    yield
    
    # Cleanup
    logger.info("Shutting down server...")

# Create FastAPI app
app = FastAPI(
    title="nscale Assist API",
    description="AI-powered document management assistant for nscale",
    version="2.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"]
)

# Mount static files
static_path = Path(__file__).parent.parent / "dist"
if static_path.exists():
    app.mount("/", StaticFiles(directory=str(static_path), html=True), name="static")

# Core routes that should always be available
@app.get("/api/health")
async def health_check():
    """Basic health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "version": "2.0.0"
    }

@app.get("/api/status")
async def status():
    """Detailed status endpoint"""
    try:
        # Check database
        db_status = "healthy"
        try:
            with db_manager.get_session() as session:
                session.execute("SELECT 1")
        except:
            db_status = "unhealthy"
        
        return {
            "status": "operational",
            "timestamp": datetime.now().isoformat(),
            "components": {
                "api": "healthy",
                "database": db_status,
                "endpoints": "loaded"  # Will be detailed by endpoint manager
            }
        }
    except Exception as e:
        logger.error(f"Status check error: {e}")
        return JSONResponse(
            status_code=500,
            content={"status": "error", "message": str(e)}
        )

# Import and register core authentication endpoints
try:
    from modules.auth.auth_routes import router as auth_router
    app.include_router(auth_router, prefix="/api/auth", tags=["Authentication"])
    logger.info("✓ Registered core authentication routes")
except ImportError as e:
    logger.error(f"✗ Failed to load authentication routes: {e}")

# Import and register core session endpoints  
try:
    from modules.sessions.session_routes import router as session_router
    app.include_router(session_router, prefix="/api", tags=["Sessions"])
    logger.info("✓ Registered core session routes")
except ImportError as e:
    logger.error(f"✗ Failed to load session routes: {e}")

# Import and register core chat endpoints
try:
    from modules.chat.chat_routes import router as chat_router
    app.include_router(chat_router, prefix="/api", tags=["Chat"])
    logger.info("✓ Registered core chat routes")
except ImportError as e:
    logger.error(f"✗ Failed to load chat routes: {e}")

# V1 compatibility routes
@app.get("/api/v1/chat/sessions")
async def get_v1_sessions(request: Request):
    """V1 compatibility endpoint for sessions"""
    # Forward to the actual sessions endpoint
    from modules.sessions.session_routes import get_sessions
    return await get_sessions(
        since=request.query_params.get("since"),
        user_data=request.state.user_data if hasattr(request.state, "user_data") else {}
    )

# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Global exception handler"""
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "detail": "Internal server error",
            "type": type(exc).__name__,
            "message": str(exc)
        }
    )

if __name__ == "__main__":
    import uvicorn
    
    port = int(os.getenv("PORT", "5175"))
    host = os.getenv("HOST", "0.0.0.0")
    
    logger.info(f"Starting server on {host}:{port}")
    
    uvicorn.run(
        app,
        host=host,
        port=port,
        log_level="info",
        access_log=True
    )