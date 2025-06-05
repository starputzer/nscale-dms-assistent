#!/usr/bin/env python3
"""
Migrate all old sessions from the old database to the new one
"""

import sqlite3
import os
from datetime import datetime

def migrate_sessions():
    """Migrate sessions from old to new database"""
    
    old_db_path = '/opt/nscale-assist/data/db/users.db'
    new_db_path = '/opt/nscale-assist/app/data/db/app.db'
    
    print("=== Session Migration ===\n")
    
    # Connect to both databases
    old_conn = sqlite3.connect(old_db_path)
    old_conn.row_factory = sqlite3.Row
    new_conn = sqlite3.connect(new_db_path)
    
    # Check users in old database
    old_cursor = old_conn.cursor()
    old_cursor.execute("SELECT DISTINCT user_id FROM chat_sessions")
    old_users = old_cursor.fetchall()
    
    print(f"Found sessions for users: {[u[0] for u in old_users]}")
    
    # Get your current user_id (martin@danglefeet.com should be user_id 3 or 4 based on the data)
    # But in the new system you use user_id 5
    USER_ID_MAPPING = {
        3: '5',  # Map old user 3 to new user 5
        4: '5',  # Map old user 4 to new user 5
    }
    
    # Get all sessions
    old_cursor.execute("""
        SELECT id, user_id, title, created_at, updated_at, uuid 
        FROM chat_sessions 
        ORDER BY created_at DESC
    """)
    old_sessions = old_cursor.fetchall()
    
    print(f"\nFound {len(old_sessions)} sessions to migrate")
    
    new_cursor = new_conn.cursor()
    migrated = 0
    skipped = 0
    
    for session in old_sessions:
        old_user_id = session['user_id']
        new_user_id = USER_ID_MAPPING.get(old_user_id, str(old_user_id))
        
        # Use the UUID if available, otherwise create a new session ID
        session_id = session['uuid'] if session['uuid'] else f"legacy-{session['id']}-imported"
        
        try:
            # Check if session already exists
            new_cursor.execute("SELECT id FROM chat_sessions WHERE id = ?", (session_id,))
            if new_cursor.fetchone():
                skipped += 1
                continue
            
            # Insert session
            new_cursor.execute("""
                INSERT INTO chat_sessions (id, user_id, title, created_at, updated_at, is_active)
                VALUES (?, ?, ?, ?, ?, 1)
            """, (
                session_id,
                new_user_id,
                session['title'] or 'Imported Session',
                session['created_at'],
                session['updated_at']
            ))
            
            # Migrate messages for this session
            old_cursor.execute("""
                SELECT id, is_user, message, created_at 
                FROM chat_messages 
                WHERE session_id = ?
                ORDER BY created_at
            """, (session['id'],))
            
            messages = old_cursor.fetchall()
            
            for msg in messages:
                role = 'user' if msg['is_user'] else 'assistant'
                
                new_cursor.execute("""
                    INSERT INTO chat_messages (session_id, user_id, role, content, created_at)
                    VALUES (?, ?, ?, ?, ?)
                """, (
                    session_id,
                    new_user_id,
                    role,
                    msg['message'],
                    msg['created_at']
                ))
            
            migrated += 1
            
            # Show progress
            created_date = datetime.fromtimestamp(session['created_at']).strftime('%Y-%m-%d')
            print(f"  ✓ Migrated: {session['title']} ({created_date}) - {len(messages)} messages")
            
        except Exception as e:
            print(f"  ✗ Error migrating session {session['id']}: {e}")
    
    # Commit changes
    new_conn.commit()
    
    print(f"\n=== Migration Complete ===")
    print(f"Migrated: {migrated} sessions")
    print(f"Skipped: {skipped} sessions (already exist)")
    
    # Show summary of new database
    new_cursor.execute("SELECT COUNT(*) FROM chat_sessions WHERE user_id = '5'")
    total_sessions = new_cursor.fetchone()[0]
    
    new_cursor.execute("SELECT COUNT(*) FROM chat_messages")
    total_messages = new_cursor.fetchone()[0]
    
    print(f"\nTotal sessions for user 5: {total_sessions}")
    print(f"Total messages: {total_messages}")
    
    # Close connections
    old_conn.close()
    new_conn.close()

if __name__ == "__main__":
    migrate_sessions()