#!/usr/bin/env python3
"""
Fix user database - copy user from nscale.db to users.db
"""

import sqlite3
import hashlib
import time

def hash_password(password):
    """Create password hash"""
    salt = 'generate-a-secure-salt-in-production'
    return hashlib.pbkdf2_hmac(
        'sha256', 
        password.encode(), 
        salt.encode(), 
        100000
    ).hex()

def main():
    print("=== Fixing User Database ===\n")
    
    # Get user from nscale.db
    conn_nscale = sqlite3.connect('data/db/nscale.db')
    cursor_nscale = conn_nscale.cursor()
    cursor_nscale.execute("SELECT * FROM users WHERE email = 'martin@danglefeet.com'")
    user = cursor_nscale.fetchone()
    
    if user:
        print(f"Found user in nscale.db: ID={user[0]}, Email={user[1]}, Role={user[3]}")
    else:
        print("User not found in nscale.db")
        return
    
    # Create/update user in users.db
    conn_users = sqlite3.connect('data/db/users.db')
    cursor_users = conn_users.cursor()
    
    # Create table if not exists
    cursor_users.execute('''
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT DEFAULT 'user',
        reset_token TEXT,
        reset_token_expiry INTEGER,
        created_at INTEGER NOT NULL,
        last_login INTEGER
    )
    ''')
    
    # Check if user exists
    cursor_users.execute("SELECT id FROM users WHERE email = ?", (user[1],))
    existing = cursor_users.fetchone()
    
    if existing:
        print(f"User already exists in users.db with ID={existing[0]}")
        # Update to ensure ID is 1
        if existing[0] != 1:
            print("Updating user ID to 1...")
            cursor_users.execute("UPDATE users SET id = 1 WHERE email = ?", (user[1],))
    else:
        # Insert user with ID 1
        password_hash = hash_password('123')  # Using the known password
        now = int(time.time())
        
        print("Inserting user into users.db with ID=1...")
        cursor_users.execute('''
            INSERT INTO users (id, email, password_hash, role, created_at) 
            VALUES (1, ?, ?, ?, ?)
        ''', (user[1], password_hash, user[3], now))
    
    conn_users.commit()
    
    # Verify
    cursor_users.execute("SELECT * FROM users")
    users = cursor_users.fetchall()
    print("\nUsers in users.db:")
    for u in users:
        print(f"  ID={u[0]}, Email={u[1]}, Role={u[3]}")
    
    # Now update all sessions back to user_id=1
    conn_app = sqlite3.connect('data/db/app.db')
    cursor_app = conn_app.cursor()
    
    # Check current sessions
    cursor_app.execute("SELECT user_id, COUNT(*) FROM chat_sessions GROUP BY user_id")
    before = cursor_app.fetchall()
    print("\nSessions before fix:")
    for user_id, count in before:
        print(f"  User ID {user_id}: {count} sessions")
    
    # Update all sessions to user_id=1
    cursor_app.execute("UPDATE chat_sessions SET user_id = '1'")
    cursor_app.execute("UPDATE chat_messages SET user_id = '1'")
    cursor_app.execute("UPDATE message_feedback SET user_id = '1'")
    conn_app.commit()
    
    # Verify
    cursor_app.execute("SELECT user_id, COUNT(*) FROM chat_sessions GROUP BY user_id")
    after = cursor_app.fetchall()
    print("\nSessions after fix:")
    for user_id, count in after:
        print(f"  User ID {user_id}: {count} sessions")
    
    # Close all connections
    conn_nscale.close()
    conn_users.close()
    conn_app.close()
    
    print("\n✓ User database fixed!")

if __name__ == "__main__":
    main()