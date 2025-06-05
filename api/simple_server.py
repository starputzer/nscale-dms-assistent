#!/usr/bin/env python3
"""
Simple server with minimal imports for testing
"""

from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import uvicorn
import os
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from modules.core.logging import LogManager
from modules.auth.user_model import UserManager
from modules.core.auth_dependency import require_admin, get_current_user
from modules.feedback.feedback_manager import FeedbackManager
from modules.core.motd_manager import MOTDManager

# Initialize FastAPI app
app = FastAPI(title="Digitale Akte Assistent API", version="2.0.0")

# Initialize logger
logger = LogManager.setup_logging(__name__)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize managers
user_manager = UserManager()
feedback_manager = FeedbackManager()
motd_manager = MOTDManager()

# Mount static files
app_dir = Path(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
frontend_dir = app_dir / "frontend"
if frontend_dir.exists():
    app.mount("/static", StaticFiles(directory=str(frontend_dir)), name="static")

# Root endpoint
@app.get("/")
async def root():
    return FileResponse("frontend/index.html")

# Auth endpoints
@app.post("/api/auth/login")
async def login(email: str, password: str):
    """Login endpoint"""
    user = user_manager.authenticate_user(email, password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = user_manager.create_access_token(user["id"])
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user["id"],
            "email": user["email"],
            "role": user["role"]
        }
    }

# MOTD endpoint
@app.get("/api/motd")
async def get_motd():
    """Get message of the day"""
    return motd_manager.get_motd()

# Admin dashboard summary endpoint
@app.get("/api/admin-dashboard/summary")
async def get_dashboard_summary(user: dict = Depends(require_admin)):
    """Get dashboard summary"""
    return {
        "activeUsers": {
            "today": 5,
            "week": 25,
            "month": 100
        },
        "documentStats": {
            "processed": 150,
            "queued": 5,
            "failed": 2
        },
        "ragStats": {
            "totalQueries": 500,
            "avgAccuracy": 92.5,
            "cacheHitRate": 78.3,
            "avgResponseTime": 180.5
        },
        "responseTimeAvg": 180.5,
        "systemHealth": {
            "api": "healthy",
            "database": "healthy",
            "rag": "healthy",
            "cache": "healthy",
            "documents": "healthy"
        }
    }

# Admin users endpoint
@app.get("/api/admin/users/")
async def get_users(user: dict = Depends(require_admin)):
    """Get all users"""
    users = user_manager.get_all_users()
    return {"users": users}

# Admin feedback stats
@app.get("/api/admin/feedback/stats")
async def get_feedback_stats(user: dict = Depends(require_admin)):
    """Get feedback statistics"""
    stats = feedback_manager.get_feedback_stats()
    return {"stats": stats}

# System info
@app.get("/api/system/info")
async def get_system_info():
    """Get system information"""
    return {
        "version": "2.0.0",
        "name": "Digitale Akte Assistent",
        "build": "2025.06.05",
        "environment": "production",
        "features": {
            "rag": True,
            "ocr": True,
            "streaming": True,
            "batch_processing": True
        }
    }

if __name__ == "__main__":
    logger.info("Starting simple server on port 8000...")
    uvicorn.run(app, host="0.0.0.0", port=8000)