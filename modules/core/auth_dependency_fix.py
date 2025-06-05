"""
Fixed Authentication Dependencies for FastAPI
Uses UserManager instead of AuthManager to match the login system
"""

from typing import Dict, Any
from fastapi import HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from modules.auth.user_model import UserManager
from modules.core.config import Config
from jose import jwt, JWTError
import logging

logger = logging.getLogger(__name__)

# Initialize UserManager instance
user_manager = UserManager()

# Security scheme
security = HTTPBearer()

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> Dict[str, Any]:
    """FastAPI dependency to get current authenticated user"""
    token = credentials.credentials
    
    try:
        # Verify and decode the token
        payload = jwt.decode(token, Config.SECRET_KEY, algorithms=['HS256'])
        
        # Extract user info from payload
        user_data = {
            'user_id': payload.get('user_id'),
            'email': payload.get('email'),
            'role': payload.get('role', 'user')
        }
        
        # Check if we have the required fields
        if not user_data['user_id'] or not user_data['email']:
            logger.warning(f"Invalid token payload: missing user_id or email")
            raise HTTPException(status_code=401, detail="Invalid token")
            
        return user_data
        
    except JWTError as e:
        logger.warning(f"JWT decode error: {e}")
        raise HTTPException(status_code=401, detail="Invalid token")
    except Exception as e:
        logger.error(f"Unexpected error in get_current_user: {e}")
        raise HTTPException(status_code=401, detail="Invalid token")

async def require_admin(credentials: HTTPAuthorizationCredentials = Depends(security)) -> Dict[str, Any]:
    """FastAPI dependency to require admin authentication"""
    # Get current user
    user_data = await get_current_user(credentials)
    
    # Check admin role
    if user_data.get('role') != 'admin':
        logger.warning(f"Non-admin user {user_data.get('email')} tried to access admin endpoint")
        raise HTTPException(status_code=403, detail="Admin access required")
    
    return user_data

# Compatibility function for existing code
def require_admin_user():
    """Returns the FastAPI dependency for requiring admin access"""
    return require_admin