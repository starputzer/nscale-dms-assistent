#!/usr/bin/env python3
"""Test script to verify timestamp fixes for user creation dates"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from modules.auth.user_model import UserManager
import time
from datetime import datetime

def test_timestamp_fix():
    print("Testing timestamp fix for user creation dates...")
    
    # Initialize user manager
    user_manager = UserManager()
    
    # Get admin user ID (assuming user with ID 1 is admin)
    admin_user_id = 1
    
    # Get all users
    users = user_manager.get_all_users(admin_user_id)
    
    if not users:
        print("No users found in database")
        return
    
    print(f"\nFound {len(users)} users:")
    print("-" * 80)
    
    for user in users:
        created_at = user.get('created_at', 0)
        last_login = user.get('last_login', 0)
        
        # Convert to datetime for display
        created_date = datetime.fromtimestamp(created_at) if created_at else None
        last_login_date = datetime.fromtimestamp(last_login) if last_login else None
        
        print(f"Email: {user['email']}")
        print(f"  Role: {user['role']}")
        print(f"  Created at (timestamp): {created_at}")
        print(f"  Created at (date): {created_date}")
        print(f"  Created at (ms): {created_at * 1000}")
        print(f"  Last login (timestamp): {last_login}")
        print(f"  Last login (date): {last_login_date}")
        print(f"  Last login (ms): {last_login * 1000 if last_login else 'N/A'}")
        print()
    
    # Test timestamp conversion
    print("\nTesting timestamp conversion:")
    print("-" * 80)
    
    # Current time in seconds
    current_time_seconds = int(time.time())
    current_time_ms = current_time_seconds * 1000
    
    print(f"Current time (seconds): {current_time_seconds}")
    print(f"Current time (ms): {current_time_ms}")
    print(f"Current time (date): {datetime.fromtimestamp(current_time_seconds)}")
    
    # Check if timestamps need conversion
    sample_timestamp = users[0].get('created_at', 0) if users else 0
    if sample_timestamp > 0:
        if sample_timestamp < 10000000000:
            print(f"\n✓ Timestamps are stored in SECONDS (correct)")
            print("  Frontend should multiply by 1000 or backend should convert")
        else:
            print(f"\n✗ Timestamps appear to be in MILLISECONDS (unexpected)")
    
    print("\nDone!")

if __name__ == "__main__":
    test_timestamp_fix()