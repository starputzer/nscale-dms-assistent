#!/usr/bin/env python3
"""
Fix feedback table to allow temporary message IDs
"""

import sqlite3
import logging
from pathlib import Path

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def fix_feedback_table():
    """Fix the feedback table to remove foreign key constraint on message_id"""
    
    # Path to the database
    db_path = Path(__file__).parent.parent / "data" / "db" / "nscale.db"
    
    if not db_path.exists():
        logger.error(f"Database not found at {db_path}")
        return
    
    conn = sqlite3.connect(str(db_path))
    cursor = conn.cursor()
    
    try:
        # Start transaction
        conn.execute("BEGIN TRANSACTION")
        
        # Check if table exists
        cursor.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='message_feedback'"
        )
        table_exists = cursor.fetchone()
        
        if table_exists:
            logger.info("Backing up existing feedback data...")
            
            # Create backup of existing data
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS message_feedback_backup AS 
                SELECT * FROM message_feedback
            """)
            
            # Get count of backed up records
            cursor.execute("SELECT COUNT(*) FROM message_feedback_backup")
            backup_count = cursor.fetchone()[0]
            logger.info(f"Backed up {backup_count} feedback records")
            
            # Drop the old table
            cursor.execute("DROP TABLE IF EXISTS message_feedback")
        
        # Create new table without foreign key on message_id
        logger.info("Creating new feedback table...")
        cursor.execute("""
            CREATE TABLE message_feedback (
                id TEXT PRIMARY KEY,
                message_id TEXT NOT NULL,
                session_id TEXT NOT NULL,
                user_id TEXT NOT NULL,
                type TEXT NOT NULL CHECK (type IN ('positive', 'negative')),
                comment TEXT,
                timestamp TEXT NOT NULL,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Create indexes for performance
        cursor.execute("""
            CREATE INDEX idx_message_feedback_message_user 
            ON message_feedback(message_id, user_id)
        """)
        
        cursor.execute("""
            CREATE INDEX idx_message_feedback_session 
            ON message_feedback(session_id)
        """)
        
        cursor.execute("""
            CREATE INDEX idx_message_feedback_user 
            ON message_feedback(user_id)
        """)
        
        cursor.execute("""
            CREATE INDEX idx_message_feedback_type 
            ON message_feedback(type)
        """)
        
        # Restore data if we have a backup
        cursor.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='message_feedback_backup'"
        )
        if cursor.fetchone():
            logger.info("Restoring feedback data...")
            cursor.execute("""
                INSERT INTO message_feedback 
                SELECT * FROM message_feedback_backup
            """)
            
            # Verify restoration
            cursor.execute("SELECT COUNT(*) FROM message_feedback")
            restored_count = cursor.fetchone()[0]
            logger.info(f"Restored {restored_count} feedback records")
            
            # Drop backup table
            cursor.execute("DROP TABLE message_feedback_backup")
        
        # Commit transaction
        conn.commit()
        logger.info("Feedback table successfully fixed!")
        
        # Verify the new table structure
        cursor.execute("PRAGMA table_info(message_feedback)")
        columns = cursor.fetchall()
        logger.info("New table structure:")
        for col in columns:
            logger.info(f"  - {col[1]} {col[2]}")
        
    except Exception as e:
        logger.error(f"Error fixing feedback table: {e}")
        conn.rollback()
        raise
    finally:
        conn.close()

if __name__ == "__main__":
    fix_feedback_table()