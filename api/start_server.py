#!/usr/bin/env python3
"""
Simple wrapper to start the unified server
This allows using 'python start_server.py' instead of 'python server_unified.py'
"""

import sys
import os

# Import and run the unified server
from server_unified import app
import uvicorn

if __name__ == "__main__":
    # Get configuration from environment
    host = os.getenv("API_HOST", "0.0.0.0")
    port = int(os.getenv("API_PORT", "8000"))
    reload = os.getenv("API_RELOAD", "true").lower() == "true"
    
    print(f"🚀 Starting unified API server on {host}:{port}")
    print("📝 API Docs will be available at: http://localhost:8000/api/docs")
    
    # Run server
    uvicorn.run(
        app,
        host=host,
        port=port,
        reload=reload,
        log_level="info"
    )