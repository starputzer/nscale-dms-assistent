"""
Admin Users Handler
Manages user administration functionality
"""

from datetime import datetime
from typing import Dict, Any, List, Optional
import bcrypt

from ..core.base_routes import BaseRouteHandler
from fastapi import HTTPException, Depends
from ..core.auth_dependency import get_current_user


class AdminUsersHandler(BaseRouteHandler):
    """Handler for admin user management endpoints"""
    
    def _setup_routes(self):
        """Setup user management routes"""
        self.router.get("")(self.get_users)
        self.router.get("/{user_id}")(self.get_user)
        self.router.post("")(self.create_user)
        self.router.put("/{user_id}")(self.update_user)
        self.router.delete("/{user_id}")(self.delete_user)
        self.router.post("/{user_id}/reset-password")(self.reset_password)
        self.router.put("/{user_id}/role")(self.update_user_role)
    
    async def get_users(self, 
                       limit: int = 100,
                       offset: int = 0,
                       search: Optional[str] = None,
                       admin_user: Dict[str, Any] = Depends(get_current_user)):
        """Get all users with optional filtering"""
        if admin_user.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
            
        try:
            with self.get_db_session() as session:
                # Build query
                query = "SELECT id, email, role, created_at, last_login FROM users"
                params = []
                
                if search:
                    query += " WHERE email LIKE ?"
                    params.append(f"%{search}%")
                
                query += " ORDER BY created_at DESC LIMIT ? OFFSET ?"
                params.extend([limit, offset])
                
                users = session.execute(query, params).fetchall()
                
                # Get total count
                count_query = "SELECT COUNT(*) FROM users"
                if search:
                    count_query += " WHERE email LIKE ?"
                    total = session.execute(count_query, [f"%{search}%"]).fetchone()[0]
                else:
                    total = session.execute(count_query).fetchone()[0]
            
            return self.build_response(
                data={
                    "users": [
                        {
                            "id": user[0],
                            "email": user[1],
                            "role": user[2],
                            "created_at": user[3],
                            "last_login": user[4],
                            "is_active": user[4] and user[4] > datetime.now().timestamp() - 2592000  # 30 days
                        }
                        for user in users
                    ],
                    "total": total,
                    "limit": limit,
                    "offset": offset
                }
            )
            
        except Exception as e:
            self.handle_error(e, "Error fetching users")
    
    async def get_user(self, user_id: int, admin_user: Dict[str, Any] = Depends(get_current_user)):
        """Get specific user details"""
        if admin_user.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
            
        try:
            with self.get_db_session() as session:
                user = session.execute(
                    "SELECT id, email, role, created_at, last_login FROM users WHERE id = ?",
                    (user_id,)
                ).fetchone()
                
                if not user:
                    raise HTTPException(status_code=404, detail="User not found")
                
                # Get user's session count
                session_count = session.execute(
                    "SELECT COUNT(*) FROM chat_sessions WHERE user_id = ?",
                    (user_id,)
                ).fetchone()[0]
                
                # Get user's message count
                message_count = session.execute("""
                    SELECT COUNT(*) 
                    FROM chat_messages m
                    JOIN chat_sessions s ON m.session_id = s.id
                    WHERE s.user_id = ?
                """, (user_id,)).fetchone()[0]
            
            return self.build_response(
                data={
                    "id": user[0],
                    "email": user[1],
                    "role": user[2],
                    "created_at": user[3],
                    "last_login": user[4],
                    "session_count": session_count,
                    "message_count": message_count
                }
            )
            
        except HTTPException:
            raise
        except Exception as e:
            self.handle_error(e, f"Error fetching user {user_id}")
    
    async def create_user(self, 
                         user_data: Dict[str, Any],
                         admin_user: Dict[str, Any] = Depends(get_current_user)):
        """Create a new user"""
        if admin_user.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
            
        # Validate required fields
        self.validate_request(user_data, ["email", "password"])
        
        try:
            # Hash password
            password_hash = bcrypt.hashpw(
                user_data["password"].encode('utf-8'),
                bcrypt.gensalt()
            ).decode('utf-8')
            
            with self.get_db_session() as session:
                # Check if user already exists
                existing = session.execute(
                    "SELECT id FROM users WHERE email = ?",
                    (user_data["email"],)
                ).fetchone()
                
                if existing:
                    raise HTTPException(status_code=409, detail="User already exists")
                
                # Create user
                cursor = session.execute("""
                    INSERT INTO users (email, password_hash, role, created_at)
                    VALUES (?, ?, ?, ?)
                """, (
                    user_data["email"],
                    password_hash,
                    user_data.get("role", "user"),
                    int(datetime.now().timestamp())
                ))
                
                session.commit()
                user_id = cursor.lastrowid
            
            return self.build_response(
                data={"id": user_id, "email": user_data["email"]},
                message="User created successfully"
            )
            
        except HTTPException:
            raise
        except Exception as e:
            self.handle_error(e, "Error creating user")
    
    async def update_user(self,
                         user_id: int,
                         update_data: Dict[str, Any],
                         admin_user: Dict[str, Any] = Depends(get_current_user)):
        """Update user information"""
        if admin_user.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
            
        try:
            with self.get_db_session() as session:
                # Check if user exists
                user = session.execute(
                    "SELECT id FROM users WHERE id = ?",
                    (user_id,)
                ).fetchone()
                
                if not user:
                    raise HTTPException(status_code=404, detail="User not found")
                
                # Build update query
                updates = []
                params = []
                
                if "email" in update_data:
                    updates.append("email = ?")
                    params.append(update_data["email"])
                
                if "role" in update_data:
                    updates.append("role = ?")
                    params.append(update_data["role"])
                
                if updates:
                    params.append(user_id)
                    session.execute(
                        f"UPDATE users SET {', '.join(updates)} WHERE id = ?",
                        params
                    )
                    session.commit()
            
            return self.build_response(message="User updated successfully")
            
        except HTTPException:
            raise
        except Exception as e:
            self.handle_error(e, f"Error updating user {user_id}")
    
    async def delete_user(self, user_id: int, admin_user: Dict[str, Any] = Depends(get_current_user)):
        """Delete a user"""
        if admin_user.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
            
        # Prevent self-deletion
        if user_id == admin_user.get("user_id"):
            raise HTTPException(status_code=400, detail="Cannot delete your own account")
            
        try:
            with self.get_db_session() as session:
                # Check if user exists
                user = session.execute(
                    "SELECT id FROM users WHERE id = ?",
                    (user_id,)
                ).fetchone()
                
                if not user:
                    raise HTTPException(status_code=404, detail="User not found")
                
                # Delete user's sessions and messages first
                session.execute("""
                    DELETE FROM chat_messages 
                    WHERE session_id IN (
                        SELECT id FROM chat_sessions WHERE user_id = ?
                    )
                """, (user_id,))
                
                session.execute("DELETE FROM chat_sessions WHERE user_id = ?", (user_id,))
                session.execute("DELETE FROM users WHERE id = ?", (user_id,))
                session.commit()
            
            return self.build_response(message="User deleted successfully")
            
        except HTTPException:
            raise
        except Exception as e:
            self.handle_error(e, f"Error deleting user {user_id}")
    
    async def reset_password(self,
                           user_id: int,
                           password_data: Dict[str, Any],
                           admin_user: Dict[str, Any] = Depends(get_current_user)):
        """Reset user password"""
        if admin_user.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
            
        self.validate_request(password_data, ["new_password"])
        
        try:
            # Hash new password
            password_hash = bcrypt.hashpw(
                password_data["new_password"].encode('utf-8'),
                bcrypt.gensalt()
            ).decode('utf-8')
            
            with self.get_db_session() as session:
                # Update password
                result = session.execute(
                    "UPDATE users SET password_hash = ? WHERE id = ?",
                    (password_hash, user_id)
                )
                session.commit()
                
                if result.rowcount == 0:
                    raise HTTPException(status_code=404, detail="User not found")
            
            return self.build_response(message="Password reset successfully")
            
        except HTTPException:
            raise
        except Exception as e:
            self.handle_error(e, f"Error resetting password for user {user_id}")
    
    async def update_user_role(self,
                              user_id: int,
                              role_data: Dict[str, Any],
                              admin_user: Dict[str, Any] = Depends(get_current_user)):
        """Update user role"""
        if admin_user.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
            
        self.validate_request(role_data, ["role"])
        
        # Validate role
        valid_roles = ["user", "admin", "moderator"]
        if role_data["role"] not in valid_roles:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid role. Must be one of: {', '.join(valid_roles)}"
            )
        
        try:
            with self.get_db_session() as session:
                result = session.execute(
                    "UPDATE users SET role = ? WHERE id = ?",
                    (role_data["role"], user_id)
                )
                session.commit()
                
                if result.rowcount == 0:
                    raise HTTPException(status_code=404, detail="User not found")
            
            return self.build_response(
                message=f"User role updated to {role_data['role']}"
            )
            
        except HTTPException:
            raise
        except Exception as e:
            self.handle_error(e, f"Error updating role for user {user_id}")


# Create handler instance
users_handler = AdminUsersHandler()