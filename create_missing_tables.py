#!/usr/bin/env python3
"""Create missing database tables"""

import sqlite3
import os

def create_tables():
    """Create missing users and feedback tables"""
    
    # Database paths
    users_db = "data/db/users.db"
    feedback_db = "data/db/feedback.db"
    
    # Ensure directories exist
    os.makedirs("data/db", exist_ok=True)
    
    # Create users table if it doesn't exist
    print("Creating users table...")
    with sqlite3.connect(users_db) as conn:
        cursor = conn.cursor()
        
        # Check if table exists
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='users'")
        if not cursor.fetchone():
            cursor.execute("""
                CREATE TABLE users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    email TEXT UNIQUE NOT NULL,
                    password_hash TEXT NOT NULL,
                    role TEXT DEFAULT 'user',
                    created_at INTEGER DEFAULT (strftime('%s', 'now')),
                    last_login INTEGER,
                    is_active INTEGER DEFAULT 1
                )
            """)
            
            # Create index on email
            cursor.execute("CREATE INDEX idx_users_email ON users(email)")
            
            print("✅ Users table created")
        else:
            print("Users table already exists")
    
    # Create feedback table if it doesn't exist
    print("\nCreating feedback table...")
    with sqlite3.connect(feedback_db) as conn:
        cursor = conn.cursor()
        
        # Check if table exists
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='feedback'")
        if not cursor.fetchone():
            cursor.execute("""
                CREATE TABLE feedback (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    session_id TEXT NOT NULL,
                    message_id TEXT NOT NULL,
                    question TEXT NOT NULL,
                    answer TEXT NOT NULL,
                    is_positive INTEGER NOT NULL,
                    comment TEXT,
                    created_at INTEGER DEFAULT (strftime('%s', 'now')),
                    user_id INTEGER,
                    rating INTEGER,
                    processed INTEGER DEFAULT 0
                )
            """)
            
            # Create indices
            cursor.execute("CREATE INDEX idx_feedback_session ON feedback(session_id)")
            cursor.execute("CREATE INDEX idx_feedback_positive ON feedback(is_positive)")
            cursor.execute("CREATE INDEX idx_feedback_created ON feedback(created_at)")
            
            print("✅ Feedback table created")
        else:
            print("Feedback table already exists")
    
    print("\nDatabase tables created successfully!")

if __name__ == "__main__":
    create_tables()