import sqlite3
"""
Admin Users API Endpoints
Provides comprehensive user management functionality for admin panel
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel, Field, EmailStr
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
import hashlib
import json
from passlib.hash import bcrypt

from modules.core.logging import LogManager
from modules.core.auth_dependency import get_admin_user as require_admin, get_current_user
from modules.core.db import DBManager
from modules.auth.user_model import UserManager

# Initialize components
logger = LogManager.setup_logging(__name__)
user_manager = UserManager()
db_manager = DBManager()

router = APIRouter()

# Pydantic models
class UserBase(BaseModel):
    email: EmailStr
    role: str = Field(default="user", pattern="^(admin|user)$")
    is_active: bool = True

class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    role: str = Field(default="user", pattern="^(admin|user)$")

class User(UserBase):
    id: str
    created_at: int
    last_login: Optional[int] = None
    username: Optional[str] = None
    is_locked: bool = False
    session_count: int = 0

class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    role: Optional[str] = Field(None, pattern="^(admin|user)$")
    is_active: Optional[bool] = None
    is_locked: Optional[bool] = None

class RoleUpdate(BaseModel):
    role: str = Field(pattern="^(admin|user)$")

class UserStats(BaseModel):
    total_users: int
    active_users: int
    admin_users: int
    standard_users: int
    active_today: int
    active_this_week: int
    active_this_month: int
    new_this_month: int
    average_sessions_per_user: float
    locked_users: int

class UserCount(BaseModel):
    count: int

class UserListResponse(BaseModel):
    users: List[User]
    total: int
    page: int
    per_page: int

# Helper functions
def hash_password(password: str) -> str:
    """Hash a password using bcrypt"""
    return bcrypt.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash"""
    return bcrypt.verify(plain_password, hashed_password)

# Endpoints
@router.get("/", response_model=UserListResponse)
async def get_users(
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=100),
    role: Optional[str] = None,
    is_active: Optional[bool] = None,
    search: Optional[str] = None,
    user: Dict[str, Any] = Depends(require_admin)
):
    """Get all users with optional filtering and pagination"""
    try:
        conn = db_manager.get_connection()
        cursor = conn.cursor()
            
        # Build query with filters
        query = "SELECT * FROM users WHERE 1=1"
        params = []
            
        if role:
                query += " AND role = ?"
                params.append(role)
            
        if is_active is not None:
                query += " AND is_active = ?"
                params.append(1 if is_active else 0)
            
        if search:
                query += " AND (email LIKE ? OR username LIKE ?)"
                params.extend([f"%{search}%", f"%{search}%"])
            
        # Get total count
        count_query = query.replace("SELECT *", "SELECT COUNT(*)")
        cursor.execute(count_query, params)
        total = cursor.fetchone()[0]
            
        # Add pagination
        offset = (page - 1) * per_page
        query += " ORDER BY created_at DESC LIMIT ? OFFSET ?"
        params.extend([per_page, offset])
            
        cursor.execute(query, params)
        rows = cursor.fetchall()
            
        users = []
        for row in rows:
            # Get session count for user
            cursor.execute(
                "SELECT COUNT(*) FROM sessions WHERE user_id = ?",
                (row['id'],)
            )
            session_count = cursor.fetchone()[0]
            
            users.append(User(
                id=row['id'],
                email=row['email'],
                username=row.get('username') or row['email'].split('@')[0],
                role=row['role'],
                is_active=bool(row.get('is_active', 1)),
                is_locked=bool(row.get('is_locked', 0)),
                created_at=row['created_at'],
                last_login=row.get('last_login'),
                session_count=session_count
            ))
            
        return UserListResponse(
                users=users,
                total=total,
                page=page,
                per_page=per_page
            )
    except Exception as e:
        logger.error(f"Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        logger.error(f"Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    

@router.delete("/{user_id}")
async def delete_user(user_id: str, admin_user: Any = Depends(require_admin)):
    """Delete a user (admin cannot delete themselves)"""
    try:
        # Prevent admin from deleting themselves
        if admin_user.get('id') == user_id:
            raise HTTPException(status_code=403, detail="Cannot delete your own account")
        
        conn = db_manager.get_connection()
        cursor = conn.cursor()
        
        # Check if user exists
        cursor.execute("SELECT role FROM users WHERE id = ?", (user_id,))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Prevent deleting other admins
        if row['role'] == 'admin':
            raise HTTPException(status_code=403, detail="Cannot delete admin users")
            
        # Delete user sessions
        cursor.execute("DELETE FROM sessions WHERE user_id = ?", (user_id,))
            
        # Delete user
        cursor.execute("DELETE FROM users WHERE id = ?", (user_id,))
        conn.commit()
        
        return {"success": True, "message": "User deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    # Force reload
