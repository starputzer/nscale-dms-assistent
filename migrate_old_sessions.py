#!/usr/bin/env python3
"""
Migrate old sessions from nscale.db to app.db
"""

import sqlite3
import os
import sys
from datetime import datetime

def migrate_sessions():
    """Migrate sessions and messages from old database to new"""
    
    old_db_path = 'data/db/nscale.db'
    new_db_path = 'data/db/app.db'
    
    if not os.path.exists(old_db_path):
        print(f"Old database not found: {old_db_path}")
        return
    
    if not os.path.exists(new_db_path):
        print(f"New database not found: {new_db_path}")
        return
    
    try:
        # Connect to both databases
        old_conn = sqlite3.connect(old_db_path)
        old_conn.row_factory = sqlite3.Row
        new_conn = sqlite3.connect(new_db_path)
        
        # Get all sessions from old database
        old_cursor = old_conn.cursor()
        old_cursor.execute("SELECT * FROM sessions")
        sessions = old_cursor.fetchall()
        
        print(f"Found {len(sessions)} sessions to migrate")
        
        # Migrate sessions
        new_cursor = new_conn.cursor()
        migrated_sessions = 0
        
        for session in sessions:
            try:
                # Convert timestamp if needed
                created_at = session['created_at']
                updated_at = session.get('updated_at', created_at)
                
                # Insert into new database
                new_cursor.execute("""
                    INSERT OR IGNORE INTO chat_sessions (id, user_id, title, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?)
                """, (
                    session['id'],
                    session['user_id'],
                    session.get('title', 'Imported Session'),
                    created_at,
                    updated_at
                ))
                migrated_sessions += 1
            except Exception as e:
                print(f"Error migrating session {session['id']}: {e}")
        
        # Get all messages from old database
        old_cursor.execute("SELECT * FROM messages")
        messages = old_cursor.fetchall()
        
        print(f"Found {len(messages)} messages to migrate")
        
        # Migrate messages
        migrated_messages = 0
        for message in messages:
            try:
                # Insert into new database
                new_cursor.execute("""
                    INSERT INTO chat_messages (session_id, user_id, role, content, model, created_at)
                    VALUES (?, ?, ?, ?, ?, ?)
                """, (
                    message['session_id'],
                    message.get('user_id', '1'),  # Default user_id if not present
                    message['role'],
                    message['content'],
                    message.get('model'),
                    message['created_at']
                ))
                migrated_messages += 1
            except Exception as e:
                print(f"Error migrating message: {e}")
        
        # Migrate feedback if exists
        try:
            old_cursor.execute("SELECT * FROM feedback")
            feedbacks = old_cursor.fetchall()
            
            print(f"Found {len(feedbacks)} feedback entries to migrate")
            
            migrated_feedback = 0
            for feedback in feedbacks:
                try:
                    new_cursor.execute("""
                        INSERT INTO message_feedback (message_id, user_id, is_positive, comment, created_at)
                        VALUES (?, ?, ?, ?, ?)
                    """, (
                        feedback['message_id'],
                        feedback['user_id'],
                        feedback['is_positive'],
                        feedback.get('comment'),
                        feedback['created_at']
                    ))
                    migrated_feedback += 1
                except Exception as e:
                    print(f"Error migrating feedback: {e}")
            
            print(f"Migrated {migrated_feedback} feedback entries")
        except:
            print("No feedback table found in old database")
        
        # Commit changes
        new_conn.commit()
        
        print(f"\nMigration complete!")
        print(f"Migrated {migrated_sessions} sessions")
        print(f"Migrated {migrated_messages} messages")
        
        # Close connections
        old_conn.close()
        new_conn.close()
        
    except Exception as e:
        print(f"Migration error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    migrate_sessions()