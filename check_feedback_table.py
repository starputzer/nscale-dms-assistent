#!/usr/bin/env python3
"""Check message_feedback table structure"""

import sqlite3
import os

db_path = os.path.join(os.path.dirname(__file__), "../data/db/nscale.db")

try:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Check if table exists
    cursor.execute("""
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name='message_feedback'
    """)
    
    if cursor.fetchone():
        print("Table 'message_feedback' exists")
        
        # Get table info
        cursor.execute("PRAGMA table_info(message_feedback)")
        columns = cursor.fetchall()
        
        print("\nColumn structure:")
        for col in columns:
            print(f"  {col[1]} - {col[2]}")
    else:
        print("Table 'message_feedback' does not exist")
        
    conn.close()
    
except Exception as e:
    print(f"Error: {e}")