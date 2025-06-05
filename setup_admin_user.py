#!/usr/bin/env python3
"""
Setup admin user for testing
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from modules.core.db_unified import get_user_db
import sqlite3

def setup_admin_user():
    """Create admin user if not exists"""
    db_path = "data/db/nscale.db"
    
    # Ensure database exists
    db = get_user_db()
    
    # Create admin user
    with sqlite3.connect(db_path) as conn:
        cursor = conn.cursor()
        
        # Check if user exists
        cursor.execute("SELECT * FROM users WHERE email = ?", ("martin@danglefeet.com",))
        if not cursor.fetchone():
            # Create admin user
            cursor.execute("""
                INSERT INTO users (email, name, role) 
                VALUES (?, ?, ?)
            """, ("martin@danglefeet.com", "Martin", "admin"))
            print("✅ Admin user created: martin@danglefeet.com")
        else:
            # Update to admin if exists
            cursor.execute("""
                UPDATE users SET role = 'admin' 
                WHERE email = ?
            """, ("martin@danglefeet.com",))
            print("✅ Admin user updated: martin@danglefeet.com")
        
        conn.commit()

if __name__ == "__main__":
    setup_admin_user()