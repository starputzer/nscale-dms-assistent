#!/usr/bin/env python3
"""
Fix chat_messages table schema
"""

import sqlite3
import os

# Database path
DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data', 'db', 'users.db')

def fix_schema():
    """Fix the chat_messages table schema"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    try:
        # Check current schema
        cursor.execute("PRAGMA table_info(chat_messages)")
        columns = cursor.fetchall()
        column_names = [col[1] for col in columns]
        
        print(f"Current columns: {column_names}")
        
        # If user_id and role columns don't exist, we need to recreate the table
        if 'user_id' not in column_names or 'role' not in column_names:
            print("Missing required columns. Recreating table...")
            
            # Backup existing data
            print("Backing up existing data...")
            cursor.execute("CREATE TABLE IF NOT EXISTS chat_messages_backup AS SELECT * FROM chat_messages")
            
            # Drop the old table
            print("Dropping old table...")
            cursor.execute("DROP TABLE chat_messages")
            
            # Create new table with all required columns
            print("Creating new table with all columns...")
            cursor.execute("""
            CREATE TABLE chat_messages (
                id TEXT PRIMARY KEY,
                session_id TEXT NOT NULL,
                user_id TEXT NOT NULL,
                role TEXT NOT NULL,
                content TEXT NOT NULL,
                created_at INTEGER NOT NULL,
                model TEXT,
                FOREIGN KEY (session_id) REFERENCES chat_sessions(id)
            )
            """)
            
            # Check if backup table has any data
            cursor.execute("SELECT COUNT(*) FROM chat_messages_backup")
            count = cursor.fetchone()[0]
            
            if count > 0:
                # Migrate data from backup
                print(f"Migrating {count} messages...")
                cursor.execute("""
                INSERT INTO chat_messages (id, session_id, user_id, role, content, created_at, model)
                SELECT 
                    printf('msg-%d-%d', id, abs(random() % 10000)),
                    session_id,
                    '1',
                    CASE WHEN is_user = 1 THEN 'user' ELSE 'assistant' END,
                    message,
                    created_at,
                    'llama3:8b-instruct-q4_1'
                FROM chat_messages_backup
                """)
            
            # Drop backup table
            print("Dropping backup table...")
            cursor.execute("DROP TABLE chat_messages_backup")
            
            # Commit changes
            conn.commit()
            print("Schema update completed successfully!")
        else:
            print("Schema is already correct. No changes needed.")
        
        # Verify the schema
        cursor.execute("PRAGMA table_info(chat_messages)")
        columns = cursor.fetchall()
        print("\nFinal schema:")
        for col in columns:
            print(f"  {col[1]} {col[2]}")
            
    except Exception as e:
        print(f"Error: {e}")
        conn.rollback()
        raise
    finally:
        conn.close()

if __name__ == "__main__":
    fix_schema()