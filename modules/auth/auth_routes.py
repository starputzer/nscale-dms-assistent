"""
Authentication Routes
Extracted from the main server.py for better organization
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, EmailStr
from typing import Dict, Any
import logging

from modules.auth.user_model import UserManager
from modules.core.config import Config
from jose import jwt
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)
router = APIRouter()

# Initialize UserManager
user_manager = UserManager()

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: Dict[str, Any]

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    username: str = None

@router.post("/login", response_model=LoginResponse)
async def login(request: LoginRequest):
    """User login endpoint"""
    try:
        logger.info(f"Login attempt for: {request.email}")
        
        # Authenticate user and get token
        token = user_manager.authenticate(request.email, request.password)
        if not token:
            logger.warning(f"Failed login attempt for: {request.email}")
            raise HTTPException(status_code=401, detail="Invalid credentials")
        
        # Get user details
        user = user_manager.get_user_by_email(request.email)
        if not user:
            raise HTTPException(status_code=500, detail="User not found after authentication")
        
        logger.info(f"Successful login for: {request.email}")
        
        return LoginResponse(
            access_token=token,
            user={
                "id": user["id"],
                "email": user["email"],
                "username": user.get("username", user["email"].split("@")[0]),
                "role": user.get("role", "user")
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login error: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.post("/register")
async def register(request: RegisterRequest):
    """User registration endpoint"""
    try:
        logger.info(f"Registration attempt for: {request.email}")
        
        # Check if user exists
        if user_manager.get_user_by_email(request.email):
            raise HTTPException(status_code=400, detail="User already exists")
        
        # Create user
        success = user_manager.register_user(
            email=request.email,
            password=request.password
        )
        
        if not success:
            raise HTTPException(status_code=500, detail="Failed to create user")
        
        logger.info(f"Successfully registered user: {request.email}")
        
        return {
            "success": True,
            "message": "User registered successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Registration error: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.post("/logout")
async def logout():
    """User logout endpoint"""
    # In a JWT-based system, logout is typically handled client-side
    # But we can use this endpoint for logging or token blacklisting if needed
    return {"success": True, "message": "Logged out successfully"}

from modules.core.auth_dependency import get_current_user as auth_get_current_user

@router.get("/me")
async def get_current_user(user_data: Dict[str, Any] = Depends(auth_get_current_user)):
    """Get current user information"""
    return user_data