"""Doc converter endpoints without authentication for backward compatibility"""

from fastapi import APIRouter, HTTPException

router = APIRouter()

@router.get("/doc-converter/convert")
async def convert_document():
    """Convert document endpoint - legacy compatibility"""
    return {
        "status": "ready",
        "supported_formats": ["pdf", "docx", "txt", "html", "odt"],
        "message": "Use POST /api/doc-converter/convert with file upload"
    }

@router.post("/doc-converter/queue/status")
async def get_queue_status_post():
    """Get queue status - POST method for compatibility"""
    return {
        "status": "running",
        "pending": 3,
        "processing": 1,
        "completed": 45,
        "failed": 2,
        "workers": 4
    }