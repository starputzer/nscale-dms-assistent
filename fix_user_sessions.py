#!/usr/bin/env python3
"""
Fix user ID mismatch for sessions
"""

import sqlite3
import sys

def analyze_problem():
    """Analyze the user ID mismatch"""
    print("=== Analyzing User ID Mismatch ===\n")
    
    # Check nscale.db users
    conn_nscale = sqlite3.connect('data/db/nscale.db')
    cursor = conn_nscale.cursor()
    cursor.execute("SELECT * FROM users")
    users = cursor.fetchall()
    
    print("Users in nscale.db:")
    for user in users:
        print(f"  ID: {user[0]}, Email: {user[1]}, Name: {user[2]}, Role: {user[3]}")
    
    # Check app.db sessions
    conn_app = sqlite3.connect('data/db/app.db')
    cursor_app = conn_app.cursor()
    
    cursor_app.execute("SELECT user_id, COUNT(*) as session_count FROM chat_sessions GROUP BY user_id")
    user_sessions = cursor_app.fetchall()
    
    print("\nSessions by user_id in app.db:")
    for user_id, count in user_sessions:
        print(f"  User ID {user_id}: {count} sessions")
    
    # Check if we need to fix
    print("\nProblem: Sessions are stored with user_id=5, but the actual user has id=1")
    
    return conn_nscale, conn_app

def fix_sessions(conn_nscale, conn_app):
    """Fix the user ID mismatch"""
    print("\n=== Fixing User IDs ===")
    
    response = input("\nDo you want to update all sessions from user_id=5 to user_id=1? (yes/no): ")
    
    if response.lower() != 'yes':
        print("Aborted.")
        return
    
    try:
        cursor = conn_app.cursor()
        
        # Update sessions
        cursor.execute("UPDATE chat_sessions SET user_id = '1' WHERE user_id = '5'")
        sessions_updated = cursor.rowcount
        
        # Update messages
        cursor.execute("UPDATE chat_messages SET user_id = '1' WHERE user_id = '5'")
        messages_updated = cursor.rowcount
        
        # Update feedback
        cursor.execute("UPDATE message_feedback SET user_id = '1' WHERE user_id = '5'")
        feedback_updated = cursor.rowcount
        
        conn_app.commit()
        
        print(f"\nUpdated:")
        print(f"  - {sessions_updated} sessions")
        print(f"  - {messages_updated} messages")
        print(f"  - {feedback_updated} feedback entries")
        
        # Verify
        cursor.execute("SELECT user_id, COUNT(*) as session_count FROM chat_sessions GROUP BY user_id")
        user_sessions = cursor.fetchall()
        
        print("\nSessions after fix:")
        for user_id, count in user_sessions:
            print(f"  User ID {user_id}: {count} sessions")
            
    except Exception as e:
        print(f"Error: {e}")
        conn_app.rollback()

def main():
    conn_nscale, conn_app = analyze_problem()
    
    # Ask if we should fix
    fix_sessions(conn_nscale, conn_app)
    
    conn_nscale.close()
    conn_app.close()

if __name__ == "__main__":
    main()