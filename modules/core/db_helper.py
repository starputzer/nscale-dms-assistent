"""
Database Helper for unified endpoints
Bridges between existing database modules and unified API needs
"""

from modules.core.db import db_manager
from modules.auth.user_model import UserManager
from typing import List, Dict, Any, Optional
import json

class DatabaseHelper:
    """Helper class to provide unified database methods"""
    
    def __init__(self):
        self.db = db_manager
        self.user_manager = UserManager()
    
    # User methods
    def count_users(self) -> int:
        """Count total users"""
        result = self.db.execute_query("SELECT COUNT(*) as count FROM users")
        return result[0]['count'] if result else 0
    
    def get_all_users(self, page: int = 1, limit: int = 20) -> List[Dict[str, Any]]:
        """Get all users with pagination"""
        offset = (page - 1) * limit
        users = self.db.execute_query(
            "SELECT id, email, username, role, created_at FROM users ORDER BY created_at DESC LIMIT ? OFFSET ?",
            (limit, offset)
        )
        return [dict(user) for user in users]
    
    def update_user(self, user_id: int, data: Dict[str, Any]) -> Dict[str, Any]:
        """Update user data"""
        # Update username if provided
        if "username" in data:
            self.db.execute_update(
                "UPDATE users SET username = ? WHERE id = ?",
                (data["username"], user_id)
            )
        
        # Get updated user
        users = self.db.execute_query("SELECT * FROM users WHERE id = ?", (user_id,))
        return dict(users[0]) if users else None
    
    def delete_user(self, user_id: int):
        """Delete a user"""
        self.db.execute_update("DELETE FROM users WHERE id = ?", (user_id,))
    
    # Session methods
    def get_user_sessions(self, user_id: int) -> List[Dict[str, Any]]:
        """Get all sessions for a user"""
        # This would need to be implemented based on your session storage
        # For now, return empty list
        return []
    
    def get_session(self, session_id: str, user_id: int) -> Optional[Dict[str, Any]]:
        """Get a specific session"""
        # This would need to be implemented based on your session storage
        return None
    
    def delete_session(self, session_id: str, user_id: int):
        """Delete a session"""
        # This would need to be implemented based on your session storage
        pass
    
    def update_session(self, session_id: str, user_id: int, data: Dict[str, Any]) -> Dict[str, Any]:
        """Update session data"""
        # This would need to be implemented based on your session storage
        return {}
    
    def count_sessions(self) -> int:
        """Count total sessions"""
        # This would need to be implemented based on your session storage
        return 0
    
    # Feedback methods
    def get_all_feedback(self, page: int = 1, limit: int = 20) -> List[Dict[str, Any]]:
        """Get all feedback"""
        # This would need to be implemented based on your feedback storage
        return []
    
    def update_feedback_status(self, feedback_id: int, status: str):
        """Update feedback status"""
        # This would need to be implemented based on your feedback storage
        pass
    
    # System methods
    def check_health(self) -> bool:
        """Check database health"""
        try:
            self.db.execute_query("SELECT 1")
            return True
        except:
            return False
    
    def optimize(self):
        """Optimize database"""
        self.db.execute_update("VACUUM")
    
    def count_active_users(self) -> int:
        """Count active users"""
        # Simplified - count users who logged in recently
        return self.count_users()  # For now
    
    def count_new_users(self, start_date=None, end_date=None) -> int:
        """Count new users in date range"""
        # Simplified implementation
        return 0

class DocumentDatabaseHelper:
    """Helper for document database operations"""
    
    def __init__(self):
        self.db = db_manager
    
    def count_documents(self) -> int:
        """Count total documents"""
        # This would need to be implemented based on your document storage
        return 0
    
    def count_processed_documents(self) -> int:
        """Count processed documents"""
        return 0
    
    def count_failed_documents(self) -> int:
        """Count failed documents"""
        return 0
    
    def get_user_documents(self, user_id: int, page: int = 1, limit: int = 20) -> List[Dict[str, Any]]:
        """Get documents for a user"""
        return []
    
    def optimize(self):
        """Optimize database"""
        self.db.execute_update("VACUUM")

# Singleton instances
_user_db = None
_doc_db = None

def get_user_db() -> DatabaseHelper:
    """Get user database helper"""
    global _user_db
    if _user_db is None:
        _user_db = DatabaseHelper()
    return _user_db

def get_doc_converter_db() -> DocumentDatabaseHelper:
    """Get document database helper"""
    global _doc_db
    if _doc_db is None:
        _doc_db = DocumentDatabaseHelper()
    return _doc_db

def init_databases():
    """Initialize databases"""
    get_user_db()
    get_doc_converter_db()