"""
Base Route Handler Class
Provides common functionality for all route handlers
"""

from abc import ABC, abstractmethod
from fastapi import APIRouter, Depends, HTTPException
from typing import Dict, Any, Optional, List
import logging

from .auth_dependency import get_current_user
from .db import DBManager
from .config import Config


class BaseRouteHandler(ABC):
    """Base class for all route handlers"""
    
    def __init__(self):
        """Initialize route handler"""
        self.router = APIRouter()
        self.logger = logging.getLogger(self.__class__.__name__)
        self.db_manager = DBManager()
        self._setup_routes()
    
    @abstractmethod
    def _setup_routes(self):
        """Setup routes for this handler - must be implemented by subclasses"""
        pass
    
    async def require_auth(self, user_data: Dict[str, Any] = Depends(get_current_user)):
        """Dependency to require authentication"""
        if not user_data:
            raise HTTPException(status_code=401, detail="Not authenticated")
        return user_data
    
    async def require_admin(self, user_data: Dict[str, Any] = Depends(get_current_user)):
        """Dependency to require admin role"""
        if user_data.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
        return user_data
    
    def handle_error(self, error: Exception, message: str = "An error occurred"):
        """Common error handling"""
        self.logger.error(f"{message}: {error}")
        if isinstance(error, HTTPException):
            raise error
        raise HTTPException(status_code=500, detail=str(error))
    
    def get_db_session(self):
        """Get database session"""
        return self.db_manager.get_session()
    
    def validate_request(self, data: Dict[str, Any], required_fields: List[str]):
        """Validate request data"""
        missing_fields = [field for field in required_fields if field not in data or data[field] is None]
        if missing_fields:
            raise HTTPException(
                status_code=400, 
                detail=f"Missing required fields: {', '.join(missing_fields)}"
            )
    
    def build_response(self, success: bool = True, data: Any = None, 
                      message: str = "Success", **kwargs) -> Dict[str, Any]:
        """Build standardized response"""
        # If data is provided and success is True, return data directly
        # This matches what the frontend expects
        if success and data is not None and not kwargs:
            return data
            
        # Otherwise, use the wrapped format for error cases or when additional fields are needed
        response = {
            "success": success,
            "message": message
        }
        
        if data is not None:
            response["data"] = data
            
        # Add any additional fields
        response.update(kwargs)
        
        return response