"""
Database Manager Module
Provides database connection and session management
"""

import os
import sqlite3
from contextlib import contextmanager
from typing import Optional, Any, Dict
import logging

logger = logging.getLogger(__name__)

class DBManager:
    """Simple database manager for SQLite"""
    
    def __init__(self, db_path: Optional[str] = None):
        """Initialize database manager"""
        if db_path is None:
            # Default to data directory
            db_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'data', 'db', 'app.db')
        
        self.db_path = db_path
        # Ensure directory exists
        os.makedirs(os.path.dirname(db_path), exist_ok=True)
        
    @contextmanager
    def get_session(self):
        """Get database session context manager"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        try:
            yield conn
            conn.commit()
        except Exception as e:
            conn.rollback()
            logger.error(f"Database error: {e}")
            raise
        finally:
            conn.close()
    
    def execute_query(self, query: str, params: Optional[tuple] = None) -> list:
        """Execute a query and return results"""
        with self.get_session() as conn:
            cursor = conn.cursor()
            if params:
                cursor.execute(query, params)
            else:
                cursor.execute(query)
            return cursor.fetchall()
    
    def execute_update(self, query: str, params: Optional[tuple] = None) -> int:
        """Execute an update query and return affected rows"""
        with self.get_session() as conn:
            cursor = conn.cursor()
            if params:
                cursor.execute(query, params)
            else:
                cursor.execute(query)
            return cursor.rowcount

# For compatibility with existing code that expects a singleton
db_manager = DBManager()