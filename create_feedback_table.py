#!/usr/bin/env python3
"""Create message_feedback table"""

from modules.core.db import DBManager

try:
    db_manager = DBManager()
    
    with db_manager.get_session() as session:
        # Create the table
        session.execute("""
            CREATE TABLE IF NOT EXISTS message_feedback (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                message_id INTEGER NOT NULL,
                rating INTEGER NOT NULL,
                comment TEXT,
                created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
                status TEXT DEFAULT 'pending',
                admin_response TEXT,
                response_by INTEGER,
                response_at INTEGER,
                FOREIGN KEY (message_id) REFERENCES chat_messages (id)
            )
        """)
        session.commit()
        print("✅ Table message_feedback created successfully")
        
        # Verify it exists
        result = session.execute("""
            SELECT name FROM sqlite_master 
            WHERE type='table' AND name='message_feedback'
        """).fetchone()
        
        if result:
            print("✅ Table verified to exist")
            
            # Get column info
            columns = session.execute("PRAGMA table_info(message_feedback)").fetchall()
            print("\nColumns:")
            for col in columns:
                print(f"  - {col[1]} ({col[2]})")
        else:
            print("❌ Table creation failed")
            
except Exception as e:
    print(f"❌ Error: {e}")