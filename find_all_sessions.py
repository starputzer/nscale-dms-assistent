#!/usr/bin/env python3
"""
Find all sessions across all databases
"""

import sqlite3
import os
import glob
from datetime import datetime

def search_database(db_path):
    """Search a database for session-like tables"""
    print(f"\n=== Checking {db_path} ===")
    
    if not os.path.exists(db_path):
        print(f"  Database does not exist")
        return
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Get all tables
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = cursor.fetchall()
        
        print(f"  Tables: {[t[0] for t in tables]}")
        
        # Look for session-related tables
        session_tables = []
        for table in tables:
            table_name = table[0]
            if 'session' in table_name.lower() or 'chat' in table_name.lower() or 'conversation' in table_name.lower():
                session_tables.append(table_name)
        
        # Check each session table
        for table_name in session_tables:
            print(f"\n  Table: {table_name}")
            
            # Get table schema
            cursor.execute(f"PRAGMA table_info({table_name})")
            columns = cursor.fetchall()
            col_names = [col[1] for col in columns]
            print(f"    Columns: {col_names}")
            
            # Count rows
            cursor.execute(f"SELECT COUNT(*) FROM {table_name}")
            count = cursor.fetchone()[0]
            print(f"    Row count: {count}")
            
            # Show sample data if not empty
            if count > 0:
                cursor.execute(f"SELECT * FROM {table_name} LIMIT 5")
                rows = cursor.fetchall()
                print(f"    Sample data:")
                for row in rows:
                    print(f"      {row}")
                    
                # If it looks like sessions, show more details
                if 'id' in col_names and ('title' in col_names or 'content' in col_names):
                    # Try to get creation dates
                    date_cols = [col for col in col_names if 'created' in col.lower() or 'date' in col.lower() or 'time' in col.lower()]
                    if date_cols:
                        cursor.execute(f"SELECT MIN({date_cols[0]}), MAX({date_cols[0]}) FROM {table_name}")
                        min_date, max_date = cursor.fetchone()
                        print(f"    Date range: {min_date} to {max_date}")
                        
                        # Convert if unix timestamp
                        if isinstance(min_date, int) and min_date > 1000000000:
                            print(f"    Date range (human): {datetime.fromtimestamp(min_date)} to {datetime.fromtimestamp(max_date)}")
        
        # Also check for messages/content tables
        for table in tables:
            table_name = table[0]
            if 'message' in table_name.lower() or 'content' in table_name.lower():
                cursor.execute(f"SELECT COUNT(*) FROM {table_name}")
                count = cursor.fetchone()[0]
                if count > 0:
                    print(f"\n  Found {count} rows in {table_name}")
                    cursor.execute(f"SELECT * FROM {table_name} LIMIT 3")
                    rows = cursor.fetchall()
                    for row in rows:
                        print(f"    {str(row)[:200]}...")
        
        conn.close()
        
    except Exception as e:
        print(f"  Error: {e}")

def find_all_databases():
    """Find all database files"""
    print("=== Finding all database files ===")
    
    # Search patterns
    patterns = [
        "*.db",
        "*.sqlite",
        "*.sqlite3",
        "data/*.db",
        "data/*/*.db",
        "../data/*.db",
        "../data/*/*.db",
        "backup*.db",
        "*backup*/*.db"
    ]
    
    found_dbs = set()
    
    for pattern in patterns:
        for path in glob.glob(pattern, recursive=True):
            if 'node_modules' not in path and 'venv' not in path:
                found_dbs.add(os.path.abspath(path))
    
    print(f"Found {len(found_dbs)} database files")
    return sorted(found_dbs)

def check_backups():
    """Check for backup files"""
    print("\n=== Checking for backups ===")
    
    backup_patterns = [
        "*backup*",
        "*.bak",
        "*.old",
        "*_old*",
        "*_backup*"
    ]
    
    for pattern in backup_patterns:
        for path in glob.glob(pattern, recursive=True):
            if os.path.isfile(path) and 'node_modules' not in path:
                print(f"  Found: {path} ({os.path.getsize(path)} bytes)")

def main():
    # Find all databases
    databases = find_all_databases()
    
    # Check each database
    for db in databases:
        search_database(db)
    
    # Check for backups
    check_backups()
    
    # Check current working sessions
    print("\n=== Current Session Status ===")
    conn = sqlite3.connect('data/db/app.db')
    cursor = conn.cursor()
    
    cursor.execute("SELECT user_id, COUNT(*) FROM chat_sessions GROUP BY user_id")
    user_sessions = cursor.fetchall()
    
    print("Sessions by user:")
    for user_id, count in user_sessions:
        print(f"  User {user_id}: {count} sessions")
        
        # Show session titles
        cursor.execute("SELECT id, title, created_at FROM chat_sessions WHERE user_id = ? ORDER BY created_at DESC", (user_id,))
        sessions = cursor.fetchall()
        for session in sessions[:5]:  # First 5
            print(f"    - {session[1]} (ID: {session[0][:8]}..., Created: {datetime.fromtimestamp(session[2]) if session[2] else 'Unknown'})")
    
    conn.close()

if __name__ == "__main__":
    main()