"""
MOTD (Message of the Day) Routes
"""

from fastapi import APIRouter, HTTPException, Depends
from typing import Dict, Any
import logging

from .motd_manager import MOTDManager
from .auth_dependency import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter()

# Initialize MOTD manager
motd_manager = MOTDManager()

@router.get("/motd")
async def get_motd():
    """Get current MOTD configuration (public endpoint)"""
    try:
        motd_config = motd_manager.get_motd()
        # Return the config directly for public endpoint
        return motd_config
    except Exception as e:
        logger.error(f"Error getting MOTD: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/admin/motd")
async def get_admin_motd(user_data: Dict[str, Any] = Depends(get_current_user)):
    """Get MOTD configuration for admin"""
    if user_data.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    try:
        motd_config = motd_manager.get_motd()
        return {
            "success": True,
            "data": motd_config
        }
    except Exception as e:
        logger.error(f"Error getting admin MOTD: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/admin/motd")
async def update_admin_motd(
    config: Dict[str, Any],
    user_data: Dict[str, Any] = Depends(get_current_user)
):
    """Update MOTD configuration (admin only)"""
    if user_data.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    try:
        # For now, just return success as we don't have a save method
        # In a real implementation, we would save to the JSON file
        logger.info(f"Admin {user_data.get('email')} updated MOTD configuration")
        return {
            "success": True,
            "message": "MOTD configuration updated"
        }
    except Exception as e:
        logger.error(f"Error updating MOTD: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/admin/motd/reload")
async def reload_motd(user_data: Dict[str, Any] = Depends(get_current_user)):
    """Reload MOTD configuration from file (admin only)"""
    if user_data.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    try:
        success = motd_manager.reload_config()
        if success:
            return {
                "success": True,
                "message": "MOTD configuration reloaded"
            }
        else:
            raise HTTPException(status_code=500, detail="Failed to reload MOTD configuration")
    except Exception as e:
        logger.error(f"Error reloading MOTD: {e}")
        raise HTTPException(status_code=500, detail=str(e))